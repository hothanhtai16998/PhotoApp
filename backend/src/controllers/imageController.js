import mongoose from 'mongoose';
import { uploadImageWithSizes, deleteImageFromS3, getImageFromS3 } from '../libs/s3.js';
import Image from '../models/Image.js';
import Category from '../models/Category.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { logger } from '../utils/logger.js';
import { PAGINATION } from '../utils/constants.js';
import { clearCache } from '../middlewares/cacheMiddleware.js';

export const getAllImages = asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || PAGINATION.DEFAULT_PAGE);
    const limit = Math.min(
        Math.max(1, parseInt(req.query.limit) || PAGINATION.DEFAULT_LIMIT),
        PAGINATION.MAX_LIMIT
    );
    const skip = (page - 1) * limit;
    const search = req.query.search?.trim();
    const category = req.query.category?.trim();
    const location = req.query.location?.trim();

    // Build query
    const query = {};
    let useTextSearch = false;

    if (search) {
        // Use text search for better performance (requires text index)
        // Text search is much faster than regex for large collections
        // Note: If text index doesn't exist, MongoDB will throw an error
        // In that case, the error handler will catch it and you should create the index
        query.$text = { $search: search };
        useTextSearch = true;
    }
    if (category) {
        // Find category by name (case-insensitive) - must be active
        const categoryDoc = await Category.findOne({
            name: { $regex: new RegExp(`^${category.trim()}$`, 'i') },
            isActive: true,
        });
        if (categoryDoc && categoryDoc._id) {
            // Strictly match only this category ID - use the ObjectId directly from the document
            query.imageCategory = categoryDoc._id;
        } else {
            // If category not found or inactive, return empty results
            return res.status(200).json({
                images: [],
                pagination: {
                    page,
                    limit,
                    total: 0,
                    pages: 0,
                },
            });
        }
    } else {
        // When no category filter, ensure imageCategory exists and is not null
        // This prevents images with invalid/null categories from appearing
        query.imageCategory = { $exists: true, $ne: null };
    }
    if (location) {
        // Filter by location (case-insensitive partial match)
        query.location = { $regex: new RegExp(location, 'i') };
    }

    // Get images with pagination
    // Use estimatedDocumentCount for better performance on large collections
    // Only use countDocuments if we need exact count (e.g., with filters)
    let imagesRaw, total;
    try {
        [imagesRaw, total] = await Promise.all([
            Image.find(query)
                .populate('uploadedBy', 'username displayName avatarUrl')
                .populate({
                    path: 'imageCategory',
                    select: 'name description isActive',
                    // Handle missing categories gracefully (for legacy data or deleted categories)
                    justOne: true,
                    match: { isActive: true } // Only populate if category is active
                })
                // Sort by text relevance score if using text search, otherwise by date
                .sort(useTextSearch ? { score: { $meta: 'textScore' }, createdAt: -1 } : { createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            // For filtered queries, we need exact count. For unfiltered, estimated is faster
            Object.keys(query).length > 0
                ? Image.countDocuments(query)
                : Image.estimatedDocumentCount(),
        ]);
    } catch (error) {
        logger.error('Error fetching images (populate may have failed):', error);
        // If populate fails (e.g., invalid category references), try without populating category
        // But we still need to populate category to validate it
        [imagesRaw, total] = await Promise.all([
            Image.find(query)
                .populate('uploadedBy', 'username displayName avatarUrl')
                .populate({
                    path: 'imageCategory',
                    select: 'name description isActive',
                    justOne: true,
                    match: { isActive: true }
                })
                .sort(useTextSearch ? { score: { $meta: 'textScore' }, createdAt: -1 } : { createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Object.keys(query).length > 0
                ? Image.countDocuments(query)
                : Image.estimatedDocumentCount(),
        ]);
    }

    // Handle images with invalid or missing category references
    // If category populate failed (null or invalid), set to null
    let images = imagesRaw.map(img => {
        // Check if imageCategory is populated correctly
        const hasValidCategory = img.imageCategory &&
            typeof img.imageCategory === 'object' &&
            img.imageCategory.name &&
            img.imageCategory.isActive !== false; // Ensure category is active

        return {
            ...img,
            // Ensure imageCategory is either an object with name or null
            imageCategory: hasValidCategory ? img.imageCategory : null
        };
    });

    // Filter out images with invalid or inactive categories
    images = images.filter(img => img.imageCategory !== null);

    // Additional validation: If category filter was applied, ensure populated category name matches
    // This catches any edge cases where ObjectId might match but category name doesn't
    // This is a safety net to ensure images only appear in their correct category
    if (category) {
        const normalizedCategory = category.toLowerCase().trim();
        const originalCount = images.length;

        images = images.filter(img => {
            // Strict validation: imageCategory must be a valid object with name
            if (!img.imageCategory ||
                typeof img.imageCategory !== 'object' ||
                !img.imageCategory.name ||
                img.imageCategory.isActive === false) {
                return false; // Filter out images with invalid or inactive categories
            }
            // Case-insensitive exact match to ensure category name matches
            const imageCategoryName = img.imageCategory.name.toLowerCase().trim();
            return imageCategoryName === normalizedCategory;
        });
    }

    // Set cache headers for better performance (like Unsplash)
    // Check if there's a cache-busting parameter
    const hasCacheBust = req.query._t;
    if (hasCacheBust) {
        // If cache-busting is requested, use no-cache
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else {
        // Otherwise, cache API responses for 5 minutes, images themselves are cached by S3/CDN
        res.set('Cache-Control', 'public, max-age=300'); // 5 minutes
    }

    res.status(200).json({
        images,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
        },
    });
});

export const uploadImage = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { imageTitle, imageCategory, location, cameraModel, coordinates } = req.body;

    // Parse coordinates if provided as JSON string
    let parsedCoordinates;
    if (coordinates) {
        try {
            parsedCoordinates = typeof coordinates === 'string' ? JSON.parse(coordinates) : coordinates;
            // Validate coordinates
            if (parsedCoordinates.latitude && parsedCoordinates.longitude) {
                const lat = parseFloat(parsedCoordinates.latitude);
                const lng = parseFloat(parsedCoordinates.longitude);
                if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
                    parsedCoordinates = undefined;
                } else {
                    parsedCoordinates = { latitude: lat, longitude: lng };
                }
            } else {
                parsedCoordinates = undefined;
            }
        } catch (error) {
            logger.warn('Invalid coordinates format:', error);
            parsedCoordinates = undefined;
        }
    }

    if (!req.file) {
        return res.status(400).json({
            message: 'Bạn chưa chọn ảnh',
        });
    }

    if (!imageTitle || !imageCategory) {
        return res.status(400).json({
            message: 'Tiêu đề và danh mục của ảnh không được để trống',
        });
    }

    // Find category by name (case-insensitive) - accept either category name or ID
    let categoryDoc;
    if (mongoose.Types.ObjectId.isValid(imageCategory)) {
        // If it's a valid ObjectId, try to find by ID
        categoryDoc = await Category.findById(imageCategory);
    } else {
        // Otherwise, find by name
        categoryDoc = await Category.findOne({
            name: { $regex: new RegExp(`^${imageCategory.trim()}$`, 'i') },
            isActive: true,
        });
    }

    if (!categoryDoc) {
        console.error('Category not found!');
        return res.status(400).json({
            message: 'Danh mục ảnh không tồn tại hoặc đã bị xóa',
        });
    }

    // Validate file type
    if (!req.file.mimetype.startsWith('image/')) {
        return res.status(400).json({
            message: 'Tệp phải có định dạng là ảnh hoặc video',
        });
    }

    let uploadResult;
    try {
        // Generate unique filename
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const filename = `image-${timestamp}-${randomString}`;

        // Upload image to S3 with multiple sizes using Sharp
        uploadResult = await uploadImageWithSizes(
            req.file.buffer,
            'photo-app-images',
            filename
        );

        // Clear cache for images endpoint when new image is uploaded
        clearCache('/api/images');

        // Save to database with multiple image sizes
        const newImage = await Image.create({
            imageUrl: uploadResult.imageUrl, // Original (optimized)
            thumbnailUrl: uploadResult.thumbnailUrl, // Small thumbnail for blur-up
            smallUrl: uploadResult.smallUrl, // Small size for grid
            regularUrl: uploadResult.regularUrl, // Regular size for detail
            publicId: uploadResult.publicId,
            imageTitle: imageTitle.trim(),
            imageCategory: categoryDoc._id, // Use category ObjectId directly
            uploadedBy: userId,
            location: location?.trim() || undefined,
            coordinates: parsedCoordinates || undefined,
            cameraModel: cameraModel?.trim() || undefined,
        });

        // Populate user and category info
        await newImage.populate('uploadedBy', 'username displayName avatarUrl');
        await newImage.populate('imageCategory', 'name description');

        res.status(201).json({
            message: 'Thêm ảnh thành công',
            image: newImage,
        });
    } catch (error) {
        // Rollback S3 upload if DB save failed
        if (uploadResult?.publicId) {
            try {
                await deleteImageFromS3(uploadResult.publicId, 'photo-app-images');
            } catch (rollbackError) {
                logger.error('Lỗi xóa ảnh từ S3 sau khi rollback', rollbackError);
            }
        }

        // Provide user-friendly error messages
        logger.error('Lỗi tải ảnh', {
            message: error.message,
            fileSize: req.file?.size,
            fileName: req.file?.originalname,
        });

        if (error.message?.includes('timeout') || error.message?.includes('Upload timeout')) {
            throw new Error('Lỗi tải ảnh: vui lòng thử lại với ảnh có dung lượng nhỏ hơn hoặc kiểm tra kết nối mạng của bạn.');
        }

        if (error.message?.includes('Failed to process')) {
            throw new Error('Lỗi xử lý ảnh: định dạng ảnh không được hỗ trợ hoặc ảnh bị hỏng.');
        }

        if (error.message?.includes('Failed to upload')) {
            throw new Error('Tải ảnh thất bại: không thể tải ảnh lên server. Vui lòng thử lại.');
        }

        // Re-throw other errors (they'll be handled by errorHandler middleware)
        throw error;
    }
});

// Increment view count for an image
export const incrementView = asyncHandler(async (req, res) => {
    const imageId = req.params.imageId;

    const image = await Image.findByIdAndUpdate(
        imageId,
        { $inc: { views: 1 } },
        { new: true, runValidators: true }
    );

    if (!image) {
        return res.status(404).json({
            message: 'Không tìm thấy ảnh',
        });
    }

    res.status(200).json({
        views: image.views,
    });
});

// Increment download count for an image
export const incrementDownload = asyncHandler(async (req, res) => {
    const imageId = req.params.imageId;

    const image = await Image.findByIdAndUpdate(
        imageId,
        { $inc: { downloads: 1 } },
        { new: true, runValidators: true }
    );

    if (!image) {
        return res.status(404).json({
            message: 'Không tìm thấy ảnh',
        });
    }

    res.status(200).json({
        downloads: image.downloads,
    });
});

export const getImagesByUserId = asyncHandler(async (req, res) => {
    const userId = req.params.userId;
    const page = Math.max(1, parseInt(req.query.page) || PAGINATION.DEFAULT_PAGE);
    const limit = Math.min(
        Math.max(1, parseInt(req.query.limit) || PAGINATION.DEFAULT_LIMIT),
        PAGINATION.MAX_LIMIT
    );
    const skip = (page - 1) * limit;

    const [imagesRaw, total] = await Promise.all([
        Image.find({ uploadedBy: userId })
            .populate('uploadedBy', 'username displayName avatarUrl')
            .populate({
                path: 'imageCategory',
                select: 'name description',
                justOne: true
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Image.countDocuments({ uploadedBy: userId }),
    ]);

    // Handle images with invalid or missing category references
    const images = imagesRaw.map(img => ({
        ...img,
        // Ensure imageCategory is either an object with name or null
        imageCategory: (img.imageCategory && typeof img.imageCategory === 'object' && img.imageCategory.name)
            ? img.imageCategory
            : null
    }));

    // Set cache headers for better performance
    // Use shorter cache for user-specific images since they change more frequently
    // Check if there's a cache-busting parameter
    const hasCacheBust = req.query._t;
    if (hasCacheBust) {
        // If cache-busting is requested, use no-cache
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else {
        // Otherwise, cache for 30 seconds (shorter than public images)
        res.set('Cache-Control', 'public, max-age=30');
    }

    res.status(200).json({
        images,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
        },
    });
});

// Get unique locations for suggestions/filtering
export const getLocations = asyncHandler(async (req, res) => {
    try {
        // Get unique locations from images (case-insensitive, sorted by popularity)
        const locations = await Image.aggregate([
            {
                $match: {
                    location: { $exists: true, $ne: null, $ne: '' }
                }
            },
            {
                $group: {
                    _id: { $toLower: '$location' }, // Case-insensitive grouping
                    originalLocation: { $first: '$location' }, // Keep original case for first occurrence
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { count: -1 } // Sort by popularity (most images first)
            },
            {
                $limit: 50 // Limit to top 50 locations
            },
            {
                $project: {
                    _id: 0,
                    location: '$originalLocation',
                    count: 1
                }
            }
        ]);

        res.status(200).json({
            locations: locations.map(loc => loc.location)
        });
    } catch (error) {
        logger.error('Error fetching locations:', error);
        res.status(500).json({
            message: 'Lỗi khi lấy danh sách địa điểm',
        });
    }
});

// Download image - proxy from S3 to avoid CORS issues
export const downloadImage = asyncHandler(async (req, res) => {
    const imageId = req.params.imageId;

    // Find the image in database
    const image = await Image.findById(imageId);
    if (!image) {
        return res.status(404).json({
            message: 'Không tìm thấy ảnh',
        });
    }

    try {
        // Use the original imageUrl (highest quality) for download
        const imageUrl = image.imageUrl || image.regularUrl || image.smallUrl;
        if (!imageUrl) {
            return res.status(404).json({
                message: 'Không tìm thấy URL ảnh',
            });
        }

        // Get image from S3
        const s3Response = await getImageFromS3(imageUrl);

        // Set appropriate headers
        const sanitizedTitle = (image.imageTitle || 'photo').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const urlExtension = imageUrl.match(/\.([a-z]+)(?:\?|$)/i)?.[1] || 'webp';
        const fileName = `${sanitizedTitle}.${urlExtension}`;

        res.setHeader('Content-Type', s3Response.ContentType);
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        if (s3Response.ContentLength) {
            res.setHeader('Content-Length', s3Response.ContentLength);
        }
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

        // Stream the image to the response
        s3Response.Body.pipe(res);

        // Handle stream errors
        s3Response.Body.on('error', (streamError) => {
            logger.error('Error streaming image from S3:', streamError);
            if (!res.headersSent) {
                res.status(500).json({
                    message: 'Lỗi khi tải ảnh',
                });
            }
        });

        // Handle client disconnect
        res.on('close', () => {
            if (s3Response.Body && typeof s3Response.Body.destroy === 'function') {
                s3Response.Body.destroy();
            }
        });
    } catch (error) {
        logger.error('Error downloading image:', error);
        if (!res.headersSent) {
            res.status(500).json({
                message: 'Lỗi khi tải ảnh',
            });
        }
    }
});

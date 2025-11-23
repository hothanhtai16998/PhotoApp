import mongoose from 'mongoose';
import { uploadImageWithSizes, deleteImageFromS3, getImageFromS3 } from '../libs/s3.js';
import Image from '../models/Image.js';
import Category from '../models/Category.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { logger } from '../utils/logger.js';
import { PAGINATION } from '../utils/constants.js';
import { clearCache } from '../middlewares/cacheMiddleware.js';
import { extractDominantColors } from '../utils/colorExtractor.js';

export const uploadImage = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { imageTitle, imageCategory, location, cameraModel, coordinates, tags } = req.body;

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

        // Extract dominant colors from image
        let dominantColors = [];
        try {
            dominantColors = await extractDominantColors(req.file.buffer, 3);
            logger.info(`Extracted ${dominantColors.length} dominant colors for image`);
        } catch (colorError) {
            logger.warn('Failed to extract colors, continuing without colors:', colorError);
            // Don't fail upload if color extraction fails
        }

        // Parse and validate tags
        let parsedTags = [];
        if (tags) {
            try {
                // Handle both JSON string and array
                const tagsArray = typeof tags === 'string' ? JSON.parse(tags) : tags;
                if (Array.isArray(tagsArray)) {
                    // Clean and validate tags (trim, lowercase, remove duplicates, max 20 tags)
                    parsedTags = tagsArray
                        .map(tag => typeof tag === 'string' ? tag.trim().toLowerCase() : String(tag).trim().toLowerCase())
                        .filter(tag => tag.length > 0 && tag.length <= 50) // Max 50 chars per tag
                        .filter((tag, index, self) => self.indexOf(tag) === index) // Remove duplicates
                        .slice(0, 20); // Max 20 tags per image
                }
            } catch (error) {
                logger.warn('Invalid tags format, ignoring tags:', error);
            }
        }

        // Save to database with multiple image sizes and formats
        const newImage = await Image.create({
            imageUrl: uploadResult.imageUrl, // Original (optimized) - WebP
            thumbnailUrl: uploadResult.thumbnailUrl, // Small thumbnail for blur-up - WebP
            smallUrl: uploadResult.smallUrl, // Small size for grid - WebP
            regularUrl: uploadResult.regularUrl, // Regular size for detail - WebP
            // AVIF versions for better compression (modern browsers)
            imageAvifUrl: uploadResult.imageAvifUrl, // Original - AVIF
            thumbnailAvifUrl: uploadResult.thumbnailAvifUrl, // Thumbnail - AVIF
            smallAvifUrl: uploadResult.smallAvifUrl, // Small - AVIF
            regularAvifUrl: uploadResult.regularAvifUrl, // Regular - AVIF
            publicId: uploadResult.publicId,
            imageTitle: imageTitle.trim(),
            imageCategory: categoryDoc._id, // Use category ObjectId directly
            uploadedBy: userId,
            location: location?.trim() || undefined,
            coordinates: parsedCoordinates || undefined,
            cameraModel: cameraModel?.trim() || undefined,
            dominantColors: dominantColors.length > 0 ? dominantColors : undefined,
            tags: parsedTags.length > 0 ? parsedTags : undefined,
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
    const images = imagesRaw.map(img => {
        // Convert dailyViews and dailyDownloads Maps to plain objects
        // When using .lean(), Maps are already plain objects, so we need to handle both cases
        let dailyViewsObj = {};
        if (img.dailyViews) {
            if (img.dailyViews instanceof Map) {
                dailyViewsObj = Object.fromEntries(img.dailyViews);
            } else {
                // Already a plain object from .lean()
                dailyViewsObj = img.dailyViews;
            }
        }

        let dailyDownloadsObj = {};
        if (img.dailyDownloads) {
            if (img.dailyDownloads instanceof Map) {
                dailyDownloadsObj = Object.fromEntries(img.dailyDownloads);
            } else {
                // Already a plain object from .lean()
                dailyDownloadsObj = img.dailyDownloads;
            }
        }

        return {
            ...img,
            // Ensure imageCategory is either an object with name or null
            imageCategory: (img.imageCategory && typeof img.imageCategory === 'object' && img.imageCategory.name)
                ? img.imageCategory
                : null,
            // Include daily views and downloads
            dailyViews: dailyViewsObj,
            dailyDownloads: dailyDownloadsObj,
        };
    });

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

// Get a single image by ID
export const getImageById = asyncHandler(async (req, res) => {
    const imageId = req.params.imageId;

    let image;

    // Check if it's a valid MongoDB ObjectId (24 hex characters)
    if (mongoose.Types.ObjectId.isValid(imageId) && imageId.length === 24) {
        // Full ObjectId - use findById
        image = await Image.findById(imageId)
            .populate('uploadedBy', 'username displayName avatarUrl')
            .populate({
                path: 'imageCategory',
                select: 'name description',
                justOne: true
            })
            .lean();
    } else if (imageId.length === 12 && /^[0-9a-fA-F]{12}$/.test(imageId)) {
        // Short ID (12 hex characters) - search by last 12 characters of _id
        // Use aggregation to find image where _id ends with the short ID
        const result = await Image.aggregate([
            {
                $addFields: {
                    idString: { $toString: '$_id' },
                    idLength: { $strLenCP: { $toString: '$_id' } }
                }
            },
            {
                $addFields: {
                    last12Chars: {
                        $substr: [
                            '$idString',
                            { $subtract: ['$idLength', 12] },
                            12
                        ]
                    }
                }
            },
            {
                $match: {
                    $expr: {
                        $eq: [
                            { $toLower: '$last12Chars' },
                            imageId.toLowerCase()
                        ]
                    }
                }
            },
            {
                $limit: 1
            }
        ]);

        if (result.length > 0) {
            // Populate the found image
            image = await Image.findById(result[0]._id)
                .populate('uploadedBy', 'username displayName avatarUrl')
                .populate({
                    path: 'imageCategory',
                    select: 'name description',
                    justOne: true
                })
                .lean();
        }
    } else {
        return res.status(400).json({
            message: 'ID ảnh không hợp lệ',
        });
    }

    if (!image) {
        return res.status(404).json({
            message: 'Không tìm thấy ảnh',
        });
    }

    res.status(200).json({
        image,
    });
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

// Update image information
export const updateImage = asyncHandler(async (req, res) => {
    const imageId = req.params.imageId;
    const { imageTitle, location, coordinates, cameraModel, tags } = req.body;
    const userId = req.user?._id;

    // Find the image
    const image = await Image.findById(imageId);
    if (!image) {
        return res.status(404).json({
            message: 'Không tìm thấy ảnh',
        });
    }

    // Check if user is the owner or admin
    const isOwner = image.uploadedBy.toString() === userId?.toString();
    const isAdmin = req.user?.isAdmin || req.user?.isSuperAdmin;

    if (!isOwner && !isAdmin) {
        return res.status(403).json({
            message: 'Bạn không có quyền chỉnh sửa ảnh này',
        });
    }

    // Build update object
    const updateData = {};

    if (imageTitle !== undefined) {
        updateData.imageTitle = imageTitle.trim();
    }

    if (location !== undefined) {
        updateData.location = location ? location.trim() : null;
    }

    if (coordinates !== undefined) {
        if (coordinates && coordinates.latitude && coordinates.longitude) {
            updateData.coordinates = {
                latitude: parseFloat(coordinates.latitude),
                longitude: parseFloat(coordinates.longitude),
            };
        } else {
            updateData.coordinates = null;
        }
    }

    if (cameraModel !== undefined) {
        updateData.cameraModel = cameraModel ? cameraModel.trim() : null;
    }

    // Update the image
    const updatedImage = await Image.findByIdAndUpdate(
        imageId,
        { $set: updateData },
        { new: true, runValidators: true }
    )
        .populate('uploadedBy', 'username displayName avatarUrl')
        .populate({
            path: 'imageCategory',
            select: 'name description',
            justOne: true
        })
        .lean();

    // Clear cache for this image
    clearCache(`/api/images/${imageId}`);

    res.status(200).json({
        message: 'Cập nhật ảnh thành công',
        image: updatedImage,
    });
});

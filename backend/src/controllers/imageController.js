import mongoose from 'mongoose';
import cloudinary from '../libs/cloudinary.js';
import Image from '../models/Image.js';
import Category from '../models/Category.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { logger } from '../utils/logger.js';
import { PAGINATION } from '../utils/constants.js';
import { Readable } from 'stream';

export const getAllImages = asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || PAGINATION.DEFAULT_PAGE);
    const limit = Math.min(
        Math.max(1, parseInt(req.query.limit) || PAGINATION.DEFAULT_LIMIT),
        PAGINATION.MAX_LIMIT
    );
    const skip = (page - 1) * limit;
    const search = req.query.search?.trim();
    const category = req.query.category?.trim();

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
        // Find category by name (case-insensitive)
        const categoryDoc = await Category.findOne({
            name: { $regex: new RegExp(`^${category}$`, 'i') },
            isActive: true,
        });
        if (categoryDoc) {
            query.imageCategory = categoryDoc._id;
        } else {
            // If category not found, return empty results
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
                    select: 'name description',
                    // Handle missing categories gracefully (for legacy data or deleted categories)
                    justOne: true
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
        [imagesRaw, total] = await Promise.all([
            Image.find(query)
                .populate('uploadedBy', 'username displayName avatarUrl')
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
    const images = imagesRaw.map(img => ({
        ...img,
        // Ensure imageCategory is either an object with name or null
        imageCategory: (img.imageCategory && typeof img.imageCategory === 'object' && img.imageCategory.name)
            ? img.imageCategory
            : null
    }));

    // Set cache headers for better performance (like Unsplash)
    // Check if there's a cache-busting parameter
    const hasCacheBust = req.query._t;
    if (hasCacheBust) {
        // If cache-busting is requested, use no-cache
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else {
        // Otherwise, cache API responses for 5 minutes, images themselves are cached by Cloudinary
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
    const { imageTitle, imageCategory, location, cameraModel } = req.body;

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

    let uploadResponse;
    try {
        // Upload directly from buffer stream (more efficient than base64)
        // Convert buffer to readable stream for better performance with large files
        const bufferStream = Readable.from(req.file.buffer);

        // Add timeout for Cloudinary upload (90 seconds - should be enough for 10MB files)
        const CLOUDINARY_UPLOAD_TIMEOUT = 90000; // 90 seconds
        let uploadTimeout;

        uploadResponse = await Promise.race([
            new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        folder: 'photo-app-images',
                        resource_type: 'image',
                        // Generate multiple sizes for progressive loading (like Unsplash)
                        eager: [
                            // Thumbnail: 200px width, low quality for blur-up effect
                            { width: 200, quality: 'auto:low', fetch_format: 'auto', crop: 'limit' },
                            // Small: 800px width for grid view (increased from 400px to prevent pixelation)
                            { width: 800, quality: 'auto:good', fetch_format: 'auto', crop: 'limit' },
                            // Regular: 1080px width for detail view
                            { width: 1080, quality: 'auto:good', fetch_format: 'auto', crop: 'limit' },
                        ],
                        // Main image transformation
                        transformation: [
                            { quality: 'auto:good' },
                            { fetch_format: 'auto' },
                        ],
                        // Add timeout to Cloudinary upload options
                        timeout: CLOUDINARY_UPLOAD_TIMEOUT,
                    },
                    (error, result) => {
                        if (uploadTimeout) clearTimeout(uploadTimeout);
                        if (error) reject(error);
                        else resolve(result);
                    }
                );

                // Pipe buffer stream to upload stream
                bufferStream.pipe(uploadStream);
            }),
            new Promise((_, reject) => {
                uploadTimeout = setTimeout(() => {
                    reject(new Error('Lỗi tải ảnh: vui lòng thử lại với ảnh có dung lượng nhỏ hơn hoặc kiểm tra kết nối mạng của bạn.'));
                }, CLOUDINARY_UPLOAD_TIMEOUT);
            }),
        ]);

        // Extract different size URLs from eager transformations
        const thumbnailUrl = uploadResponse.eager?.[0]?.secure_url || uploadResponse.secure_url;
        const smallUrl = uploadResponse.eager?.[1]?.secure_url || uploadResponse.secure_url;
        const regularUrl = uploadResponse.eager?.[2]?.secure_url || uploadResponse.secure_url;

        // Save to database with multiple image sizes
        const newImage = await Image.create({
            imageUrl: uploadResponse.secure_url, // Full size (original)
            thumbnailUrl, // Small thumbnail for blur-up
            smallUrl, // Small size for grid
            regularUrl, // Regular size for detail
            publicId: uploadResponse.public_id,
            imageTitle: imageTitle.trim(),
            imageCategory: categoryDoc._id, // Use category ObjectId
            uploadedBy: userId,
            location: location?.trim() || undefined,
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
        // Rollback Cloudinary upload if DB save failed
        if (uploadResponse?.public_id) {
            try {
                await cloudinary.uploader.destroy(uploadResponse.public_id);
            } catch (rollbackError) {
                logger.error('Lỗi tải ảnh từ Cloudinary', rollbackError);
            }
        }

        // Provide user-friendly error messages
        if (error.message?.includes('timeout') || error.message?.includes('Upload timeout')) {
            logger.error('Lỗi tải ảnh từ Cloudinary', {
                fileSize: req.file?.size,
                fileName: req.file?.originalname,
            });
            throw new Error(error.message || 'Lỗi tải ảnh: vui lòng thử lại với ảnh có dung lượng nhỏ hơn hoặc kiểm tra kết nối mạng của bạn.');
        }

        // Handle Cloudinary-specific errors
        if (error.http_code) {
            logger.error('Lỗi tải ảnh từ Cloudinary', {
                httpCode: error.http_code,
                message: error.message,
                fileSize: req.file?.size,
            });
            throw new Error(`Tải ảnh thất bại: ${error.message || 'Không thể tải ảnh lên server. Vui lòng thử lại.'}`);
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

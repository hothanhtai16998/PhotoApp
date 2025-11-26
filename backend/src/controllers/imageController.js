import mongoose from 'mongoose';
import { uploadImageWithSizes, deleteImageFromS3, getImageFromS3 } from '../libs/s3.js';
import Image from '../models/Image.js';
import Category from '../models/Category.js';
import Notification from '../models/Notification.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { logger } from '../utils/logger.js';
import { PAGINATION } from '../utils/constants.js';
import { clearCache } from '../middlewares/cacheMiddleware.js';
import { extractDominantColors } from '../utils/colorExtractor.js';
import { extractExifData } from '../utils/exifExtractor.js';

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

    // Validate and trim inputs
    const trimmedTitle = typeof imageTitle === 'string' ? imageTitle.trim() : '';
    const trimmedCategory = typeof imageCategory === 'string' ? imageCategory.trim() : String(imageCategory || '');

    if (!trimmedTitle || !trimmedCategory) {
        return res.status(400).json({
            message: 'Tiêu đề và danh mục của ảnh không được để trống',
        });
    }

    // Find category by name (case-insensitive) - accept either category name or ID
    let categoryDoc;
    if (mongoose.Types.ObjectId.isValid(trimmedCategory)) {
        // If it's a valid ObjectId, try to find by ID
        categoryDoc = await Category.findById(trimmedCategory);
    } else {
        // Otherwise, find by name
        categoryDoc = await Category.findOne({
            name: { $regex: new RegExp(`^${trimmedCategory}$`, 'i') },
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

        // Extract EXIF data from image
        let exifData = {};
        try {
            exifData = await extractExifData(req.file.buffer);
            logger.info('Extracted EXIF data from image');
        } catch (exifError) {
            logger.warn('Failed to extract EXIF data, continuing without EXIF:', exifError);
            // Don't fail upload if EXIF extraction fails
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

        // Determine moderation status based on user role
        // Admins' images are auto-approved, regular users need moderation
        const isAdmin = req.user?.isAdmin || req.user?.isSuperAdmin;
        const moderationStatus = isAdmin ? 'approved' : 'pending';
        const isModerated = isAdmin; // Admin images are considered pre-moderated

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
            imageTitle: trimmedTitle,
            imageCategory: categoryDoc._id, // Use category ObjectId directly
            uploadedBy: userId,
            location: location?.trim() || undefined,
            coordinates: parsedCoordinates || undefined,
            // Use EXIF data if available, otherwise use manual input
            cameraMake: exifData.cameraMake || undefined,
            cameraModel: exifData.cameraModel || cameraModel?.trim() || undefined,
            focalLength: exifData.focalLength || undefined,
            aperture: exifData.aperture || undefined,
            shutterSpeed: exifData.shutterSpeed || undefined,
            iso: exifData.iso || undefined,
            dominantColors: dominantColors.length > 0 ? dominantColors : undefined,
            tags: parsedTags.length > 0 ? parsedTags : undefined,
            // Moderation status
            moderationStatus,
            isModerated,
            ...(isAdmin ? {
                moderatedAt: new Date(),
                moderatedBy: userId,
            } : {}),
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

// Pre-upload endpoint: Upload image to S3 only, return URLs (no database record yet)
// This allows frontend to upload image first, then finalize with metadata later
export const preUploadImage = asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            message: 'Bạn chưa chọn ảnh',
        });
    }

    // Validate file type
    if (!req.file.mimetype.startsWith('image/')) {
        return res.status(400).json({
            message: 'Tệp phải có định dạng là ảnh',
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

        // Create upload_processing notification (image compressed and thumbnails generated)
        // Note: This notification is created when image processing completes (compression + thumbnail generation)
        // The upload_completed notification will be created later during finalization
        try {
            await Notification.create({
                recipient: req.user._id,
                type: 'upload_processing',
                metadata: {
                    uploadId: filename,
                    message: 'Image processing complete: compressed and thumbnails generated',
                },
            });
        } catch (notifError) {
            logger.error('Failed to create upload processing notification:', notifError);
            // Don't fail the upload if notification fails
        }

        // Return upload result with URLs (no database record yet)
        res.status(200).json({
            message: 'Tải ảnh lên thành công',
            uploadId: filename, // Temporary ID to link with finalize endpoint
            ...uploadResult, // All the URLs (imageUrl, thumbnailUrl, etc.)
        });
    } catch (error) {
        logger.error('Lỗi tải ảnh lên S3', {
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

        throw error;
    }
});

// Finalize endpoint: Link metadata to pre-uploaded image and create database record
export const finalizeImageUpload = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { 
        uploadId, // The temporary ID from pre-upload
        imageUrl, thumbnailUrl, smallUrl, regularUrl,
        imageAvifUrl, thumbnailAvifUrl, smallAvifUrl, regularAvifUrl,
        publicId,
        imageTitle, 
        imageCategory, 
        location, 
        cameraModel, 
        coordinates, 
        tags 
    } = req.body;

    // Validate required fields
    if (!uploadId || !publicId || !imageUrl) {
        return res.status(400).json({
            message: 'Thiếu thông tin ảnh đã tải lên. Vui lòng tải ảnh lại.',
        });
    }

    // Parse coordinates if provided
    let parsedCoordinates;
    if (coordinates) {
        try {
            parsedCoordinates = typeof coordinates === 'string' ? JSON.parse(coordinates) : coordinates;
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

    // Validate and trim inputs
    const trimmedTitle = typeof imageTitle === 'string' ? imageTitle.trim() : '';
    const trimmedCategory = typeof imageCategory === 'string' ? imageCategory.trim() : String(imageCategory || '');

    if (!trimmedTitle || !trimmedCategory) {
        return res.status(400).json({
            message: 'Tiêu đề và danh mục của ảnh không được để trống',
        });
    }

    // Find category by name (case-insensitive) - accept either category name or ID
    let categoryDoc;
    if (mongoose.Types.ObjectId.isValid(trimmedCategory)) {
        categoryDoc = await Category.findById(trimmedCategory);
    } else {
        categoryDoc = await Category.findOne({
            name: { $regex: new RegExp(`^${trimmedCategory}$`, 'i') },
            isActive: true,
        });
    }

    if (!categoryDoc) {
        return res.status(400).json({
            message: 'Danh mục ảnh không tồn tại hoặc đã bị xóa',
        });
    }

    // Extract dominant colors and EXIF data from the uploaded image
    // We need to fetch the image from S3 to extract metadata
    let dominantColors = [];
    let exifData = {};
    try {
        const imageData = await getImageFromS3(imageUrl);
        if (imageData.Body) {
            // Convert stream to buffer
            const chunks = [];
            for await (const chunk of imageData.Body) {
                chunks.push(chunk);
            }
            const imageBuffer = Buffer.concat(chunks);
            
            // Extract colors
            dominantColors = await extractDominantColors(imageBuffer, 3);
            logger.info(`Extracted ${dominantColors.length} dominant colors for image`);
            
            // Extract EXIF data
            exifData = await extractExifData(imageBuffer);
            logger.info('Extracted EXIF data from image');
        }
    } catch (error) {
        logger.warn('Failed to extract metadata, continuing without metadata:', error);
        // Don't fail finalize if metadata extraction fails
    }

    // Parse and validate tags
    let parsedTags = [];
    if (tags) {
        try {
            const tagsArray = typeof tags === 'string' ? JSON.parse(tags) : tags;
            if (Array.isArray(tagsArray)) {
                parsedTags = tagsArray
                    .map(tag => typeof tag === 'string' ? tag.trim().toLowerCase() : String(tag).trim().toLowerCase())
                    .filter(tag => tag.length > 0 && tag.length <= 50)
                    .filter((tag, index, self) => self.indexOf(tag) === index)
                    .slice(0, 20);
            }
        } catch (error) {
            logger.warn('Invalid tags format, ignoring tags:', error);
        }
    }

    // Determine moderation status based on user role
    const isAdmin = req.user?.isAdmin || req.user?.isSuperAdmin;
    const moderationStatus = isAdmin ? 'approved' : 'pending';
    const isModerated = isAdmin;

    try {
        // Save to database with pre-uploaded image URLs
        const newImage = await Image.create({
            imageUrl: imageUrl,
            thumbnailUrl: thumbnailUrl,
            smallUrl: smallUrl,
            regularUrl: regularUrl,
            imageAvifUrl: imageAvifUrl,
            thumbnailAvifUrl: thumbnailAvifUrl,
            smallAvifUrl: smallAvifUrl,
            regularAvifUrl: regularAvifUrl,
            publicId: publicId,
            imageTitle: trimmedTitle,
            imageCategory: categoryDoc._id,
            uploadedBy: userId,
            location: location?.trim() || undefined,
            coordinates: parsedCoordinates || undefined,
            // Use EXIF data if available, otherwise use manual input
            cameraMake: exifData.cameraMake || undefined,
            cameraModel: exifData.cameraModel || cameraModel?.trim() || undefined,
            focalLength: exifData.focalLength || undefined,
            aperture: exifData.aperture || undefined,
            shutterSpeed: exifData.shutterSpeed || undefined,
            iso: exifData.iso || undefined,
            dominantColors: dominantColors.length > 0 ? dominantColors : undefined,
            tags: parsedTags.length > 0 ? parsedTags : undefined,
            moderationStatus,
            isModerated,
            ...(isAdmin ? {
                moderatedAt: new Date(),
                moderatedBy: userId,
            } : {}),
        });

        // Populate user and category info
        await newImage.populate('uploadedBy', 'username displayName avatarUrl');
        await newImage.populate('imageCategory', 'name description');

        // Clear cache for images endpoint when new image is uploaded
        clearCache('/api/images');

        // Create upload completed notification
        try {
            await Notification.create({
                recipient: userId,
                type: 'upload_completed',
                image: newImage._id,
                metadata: {
                    imageTitle: trimmedTitle,
                },
            });
        } catch (notifError) {
            logger.error('Failed to create upload notification:', notifError);
            // Don't fail the upload if notification fails
        }

        res.status(201).json({
            message: 'Thêm ảnh thành công',
            image: newImage,
        });
    } catch (error) {
        // If database save fails, we should clean up the uploaded image from S3
        // But since the image is already uploaded, we'll just log the error
        // The user can try again with the same uploadId if needed
        logger.error('Lỗi lưu ảnh vào database', {
            message: error.message,
            uploadId,
            publicId,
        });

        // Create upload failed notification
        try {
            await Notification.create({
                recipient: userId,
                type: 'upload_failed',
                metadata: {
                    imageTitle: trimmedTitle || 'Unknown',
                    error: error.message || 'Unknown error',
                },
            });
        } catch (notifError) {
            logger.error('Failed to create upload failed notification:', notifError);
            // Don't fail if notification creation fails
        }

        // Rollback S3 upload if DB save failed
        if (publicId) {
            try {
                await deleteImageFromS3(publicId, 'photo-app-images');
            } catch (rollbackError) {
                logger.error('Lỗi xóa ảnh từ S3 sau khi rollback', rollbackError);
            }
        }

        throw error;
    }
});

/**
 * Create bulk upload completed notification
 * POST /api/images/bulk-upload-notification
 */
export const createBulkUploadNotification = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { successCount, totalCount, failedCount } = req.body;

    if (typeof successCount !== 'number' || typeof totalCount !== 'number') {
        return res.status(400).json({
            success: false,
            message: 'Invalid parameters',
        });
    }

    try {
        await Notification.create({
            recipient: userId,
            type: 'bulk_upload_completed',
            metadata: {
                successCount,
                totalCount,
                failedCount: failedCount || 0,
            },
        });

        res.json({
            success: true,
            message: 'Bulk upload notification created',
        });
    } catch (error) {
        logger.error('Failed to create bulk upload notification:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create notification',
        });
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
    const userId = req.user?._id; // User downloading the image

    // Find the image in database (populate uploadedBy for notification)
    const image = await Image.findById(imageId).populate('uploadedBy', '_id');
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

        // Create notification for image owner (if user is authenticated and different from owner)
        // Note: downloadImage is a public route, so req.user might not exist
        // Create notification BEFORE streaming to ensure it's sent even if stream fails
        if (req.user?._id && image.uploadedBy) {
            const uploadedById = typeof image.uploadedBy === 'object' 
                ? image.uploadedBy._id?.toString() 
                : image.uploadedBy.toString();
            const userId = req.user._id.toString();
            
            if (uploadedById && uploadedById !== userId) {
                try {
                    await Notification.create({
                        recipient: uploadedById,
                        type: 'image_downloaded',
                        image: imageId,
                        actor: userId,
                    });
                } catch (notifError) {
                    logger.error('Failed to create download notification:', notifError);
                    // Don't fail the download if notification fails
                }
            }
        }

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
    const { imageTitle, location, coordinates, cameraModel, cameraMake, focalLength, aperture, shutterSpeed, iso, tags } = req.body;
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

    if (cameraMake !== undefined) {
        updateData.cameraMake = cameraMake ? cameraMake.trim() : null;
    }

    if (cameraModel !== undefined) {
        updateData.cameraModel = cameraModel ? cameraModel.trim() : null;
    }

    if (focalLength !== undefined) {
        const focalValue = typeof focalLength === 'string' ? parseFloat(focalLength) : focalLength;
        updateData.focalLength = focalValue && !isNaN(focalValue) && focalValue > 0 ? Math.round(focalValue * 10) / 10 : null;
    }

    if (aperture !== undefined) {
        const apertureValue = typeof aperture === 'string' ? parseFloat(aperture) : aperture;
        updateData.aperture = apertureValue && !isNaN(apertureValue) && apertureValue > 0 ? Math.round(apertureValue * 10) / 10 : null;
    }

    if (shutterSpeed !== undefined) {
        updateData.shutterSpeed = shutterSpeed ? shutterSpeed.trim() : null;
    }

    if (iso !== undefined) {
        const isoValue = typeof iso === 'string' ? parseInt(iso, 10) : iso;
        updateData.iso = isoValue && !isNaN(isoValue) && isoValue > 0 ? Math.round(isoValue) : null;
    }

    if (tags !== undefined) {
        // Handle tags: can be array, JSON string, or null/empty to clear
        if (tags === null || (Array.isArray(tags) && tags.length === 0)) {
            updateData.tags = [];
        } else if (Array.isArray(tags)) {
            // Clean and validate tags (trim, lowercase, remove duplicates, max 20 tags)
            const parsedTags = tags
                .map(tag => typeof tag === 'string' ? tag.trim().toLowerCase() : String(tag).trim().toLowerCase())
                .filter(tag => tag.length > 0 && tag.length <= 50)
                .filter((tag, index, self) => self.indexOf(tag) === index) // Remove duplicates
                .slice(0, 20); // Max 20 tags
            updateData.tags = parsedTags;
        } else if (typeof tags === 'string') {
            try {
                const tagsArray = JSON.parse(tags);
                if (Array.isArray(tagsArray)) {
                    const parsedTags = tagsArray
                        .map(tag => typeof tag === 'string' ? tag.trim().toLowerCase() : String(tag).trim().toLowerCase())
                        .filter(tag => tag.length > 0 && tag.length <= 50)
                        .filter((tag, index, self) => self.indexOf(tag) === index)
                        .slice(0, 20);
                    updateData.tags = parsedTags;
                } else {
                    updateData.tags = [];
                }
            } catch (error) {
                logger.warn('Invalid tags format:', error);
                updateData.tags = [];
            }
        } else {
            updateData.tags = [];
        }
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

// Replace image file (for edited images)
export const replaceImage = asyncHandler(async (req, res) => {
    const imageId = req.params.imageId;
    const userId = req.user?._id;

    if (!req.file) {
        return res.status(400).json({
            message: 'Bạn chưa chọn ảnh',
        });
    }

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

    try {
        // Delete old images from S3
        const oldPublicId = image.publicId;
        if (oldPublicId) {
            try {
                // deleteImageFromS3 automatically deletes all sizes and formats (webp, avif)
                await deleteImageFromS3(oldPublicId, 'photo-app-images');
            } catch (deleteError) {
                logger.warn('Failed to delete old images from S3:', deleteError);
                // Continue even if deletion fails
            }
        }

        // Generate new unique filename
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const filename = `image-${timestamp}-${randomString}`;

        // Upload new image to S3 with multiple sizes
        const uploadResult = await uploadImageWithSizes(
            req.file.buffer,
            'photo-app-images',
            filename
        );

        // Extract dominant colors from new image
        let dominantColors = [];
        try {
            dominantColors = await extractDominantColors(req.file.buffer, 3);
        } catch (colorError) {
            logger.warn('Failed to extract colors:', colorError);
        }

        // Update image in database
        const updatedImage = await Image.findByIdAndUpdate(
            imageId,
            {
                $set: {
                    imageUrl: uploadResult.imageUrl,
                    thumbnailUrl: uploadResult.thumbnailUrl,
                    smallUrl: uploadResult.smallUrl,
                    regularUrl: uploadResult.regularUrl,
                    publicId: uploadResult.publicId,
                    dominantColors,
                },
            },
            { new: true, runValidators: true }
        )
            .populate('uploadedBy', 'username displayName avatarUrl')
            .populate({
                path: 'imageCategory',
                select: 'name description',
                justOne: true,
            })
            .lean();

        // Clear cache
        clearCache(`/api/images/${imageId}`);
        clearCache('/api/images');

        res.status(200).json({
            message: 'Cập nhật ảnh thành công',
            image: updatedImage,
        });
    } catch (error) {
        logger.error('Error replacing image:', error);
        res.status(500).json({
            message: 'Lỗi khi cập nhật ảnh',
        });
    }
});

// Batch replace images (for batch editing)
export const batchReplaceImages = asyncHandler(async (req, res) => {
    const userId = req.user?._id;
    const files = req.files || [];
    const imageIds = req.body.imageIds || [];

    if (files.length === 0 || imageIds.length === 0) {
        return res.status(400).json({
            message: 'Không có ảnh nào để cập nhật',
        });
    }

    if (files.length !== imageIds.length) {
        return res.status(400).json({
            message: 'Số lượng ảnh và ID không khớp',
        });
    }

    try {
        const updatedImages = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const imageId = Array.isArray(imageIds) ? imageIds[i] : imageIds;

            // Find the image
            const image = await Image.findById(imageId);
            if (!image) {
                logger.warn(`Image ${imageId} not found, skipping`);
                continue;
            }

            // Check if user is the owner or admin
            const isOwner = image.uploadedBy.toString() === userId?.toString();
            const isAdmin = req.user?.isAdmin || req.user?.isSuperAdmin;

            if (!isOwner && !isAdmin) {
                logger.warn(`User ${userId} does not have permission to edit image ${imageId}`);
                continue;
            }

            // Delete old images from S3
            const oldPublicId = image.publicId;
            if (oldPublicId) {
                try {
                    // deleteImageFromS3 automatically deletes all sizes and formats (webp, avif)
                    await deleteImageFromS3(oldPublicId, 'photo-app-images');
                } catch (deleteError) {
                    logger.warn('Failed to delete old images from S3:', deleteError);
                }
            }

            // Generate new unique filename
            const timestamp = Date.now();
            const randomString = Math.random().toString(36).substring(2, 15);
            const filename = `image-${timestamp}-${randomString}-${i}`;

            // Upload new image to S3 with multiple sizes
            const uploadResult = await uploadImageWithSizes(
                file.buffer,
                'photo-app-images',
                filename
            );

            // Extract dominant colors
            let dominantColors = [];
            try {
                dominantColors = await extractDominantColors(file.buffer, 3);
            } catch (colorError) {
                logger.warn('Failed to extract colors:', colorError);
            }

            // Update image in database
            const updatedImage = await Image.findByIdAndUpdate(
                imageId,
                {
                    $set: {
                        imageUrl: uploadResult.imageUrl,
                        thumbnailUrl: uploadResult.thumbnailUrl,
                        smallUrl: uploadResult.smallUrl,
                        regularUrl: uploadResult.regularUrl,
                        publicId: uploadResult.publicId,
                        dominantColors,
                    },
                },
                { new: true, runValidators: true }
            )
                .populate('uploadedBy', 'username displayName avatarUrl')
                .populate({
                    path: 'imageCategory',
                    select: 'name description',
                    justOne: true,
                })
                .lean();

            updatedImages.push(updatedImage);

            // Clear cache
            clearCache(`/api/images/${imageId}`);
        }

        clearCache('/api/images');

        // Create bulk operation notification if multiple images were replaced
        if (updatedImages.length > 1 && userId) {
            try {
                await Notification.create({
                    recipient: userId,
                    type: 'bulk_upload_completed', // Reuse this type for bulk operations
                    metadata: {
                        operation: 'batch_replace',
                        successCount: updatedImages.length,
                        totalCount: files.length,
                        failedCount: files.length - updatedImages.length,
                    },
                });
            } catch (notifError) {
                logger.error('Failed to create bulk operation notification:', notifError);
                // Don't fail the operation if notification fails
            }
        }

        res.status(200).json({
            message: `Đã cập nhật ${updatedImages.length} ảnh thành công`,
            images: updatedImages,
        });
    } catch (error) {
        logger.error('Error in batch replace images:', error);
        res.status(500).json({
            message: 'Lỗi khi cập nhật ảnh',
        });
    }
});

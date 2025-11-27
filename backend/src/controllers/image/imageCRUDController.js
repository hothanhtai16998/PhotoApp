import mongoose from 'mongoose';
import { getImageFromS3 } from '../../libs/s3.js';
import Image from '../../models/Image.js';
import Notification from '../../models/Notification.js';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { logger } from '../../utils/logger.js';
import { PAGINATION } from '../../utils/constants.js';
import { clearCache } from '../../middlewares/cacheMiddleware.js';

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
    const size = req.query.size || 'medium'; // Default to medium

    // Find the image in database (populate uploadedBy for notification)
    const image = await Image.findById(imageId).populate('uploadedBy', '_id');
    if (!image) {
        return res.status(404).json({
            message: 'Không tìm thấy ảnh',
        });
    }

    try {
        // Map size parameter to image URL
        // small: 640px (use smallUrl ~800px)
        // medium: 1920px (use regularUrl ~1080px)
        // large: 2400px (use original imageUrl)
        // original: original imageUrl
        let imageUrl;
        switch (size.toLowerCase()) {
            case 'small':
                imageUrl = image.smallUrl || image.regularUrl || image.imageUrl;
                break;
            case 'medium':
                imageUrl = image.regularUrl || image.imageUrl || image.smallUrl;
                break;
            case 'large':
                imageUrl = image.imageUrl || image.regularUrl || image.smallUrl;
                break;
            case 'original':
                imageUrl = image.imageUrl || image.regularUrl || image.smallUrl;
                break;
            default:
                // Default to medium if invalid size
                imageUrl = image.regularUrl || image.imageUrl || image.smallUrl;
        }

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
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable'); // Cache for 1 year, immutable for better performance

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


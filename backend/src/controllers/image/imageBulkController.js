import { uploadImageWithSizes, deleteImageFromS3 } from '../../libs/s3.js';
import Image from '../../models/Image.js';
import Notification from '../../models/Notification.js';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { logger } from '../../utils/logger.js';
import { clearCache } from '../../middlewares/cacheMiddleware.js';
import { extractDominantColors } from '../../utils/colorExtractor.js';

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


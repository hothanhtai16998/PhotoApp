import mongoose from 'mongoose';
import crypto from 'crypto';
import { uploadImageWithSizes, deleteImageFromS3, getImageFromS3, generatePresignedUploadUrl, deleteObjectByKey } from '../../libs/s3.js';
import Image from '../../models/Image.js';
import Category from '../../models/Category.js';
import Notification from '../../models/Notification.js';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { logger } from '../../utils/logger.js';
import { clearCache } from '../../middlewares/cacheMiddleware.js';
import { extractDominantColors } from '../../utils/colorExtractor.js';
import { extractExifData } from '../../utils/exifExtractor.js';

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB
const MAX_IMAGE_TITLE_LENGTH = 255;
const MAX_TAG_LENGTH = 50;
const MAX_TAGS_PER_IMAGE = 20;
const RAW_UPLOAD_FOLDER = 'photo-app-raw';
const UPLOAD_ID_PATTERN = /^image-\d+-[a-z0-9]{8}$/;

const extensionMap = {
    jpeg: 'jpg',
    'svg+xml': 'svg',
};

// Safe wrapper for optional async helpers (prevents "reading 'catch' of undefined")
const safeAsync = (fn, ...args) => {
    try {
        if (typeof fn === 'function') {
            return Promise.resolve(fn(...args));
        }
    } catch (err) {
        return Promise.reject(err);
    }
    return Promise.resolve();
};

/**
 * Generate secure random upload ID
 */
const generateUploadId = () => {
    const timestamp = Date.now();
    const randomBytes = crypto.randomBytes(4).toString('hex'); // 8 hex chars
    return `image-${timestamp}-${randomBytes}`;
};

const getFileExtension = (fileName = '', fileType = '') => {
    const nameExt = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() : null;
    if (nameExt && nameExt.length <= 5 && /^[a-z0-9]+$/.test(nameExt)) {
        return nameExt;
    }

    if (fileType.includes('/')) {
        const typePart = fileType.split('/')[1]?.toLowerCase();
        if (typePart && /^[a-z0-9+\-]+$/.test(typePart)) {
            return extensionMap[typePart] || typePart;
        }
    }

    return 'bin';
};

const streamToBuffer = async (stream) => {
    const chunks = [];
    for await (const chunk of stream) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
};

/**
 * Validate and parse coordinates
 */
const validateCoordinates = (coordinates) => {
    if (!coordinates) return undefined;

    try {
        const parsed = typeof coordinates === 'string' ? JSON.parse(coordinates) : coordinates;

        if (!parsed.latitude || !parsed.longitude) return undefined;

        const lat = parseFloat(parsed.latitude);
        const lng = parseFloat(parsed.longitude);

        if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            return undefined;
        }

        return { latitude: lat, longitude: lng };
    } catch (error) {
        logger.warn('Invalid coordinates format:', error.message);
        return undefined;
    }
};

/**
 * Find category by ID or name
 */
const findCategory = async (categoryInput) => {
    const trimmed = String(categoryInput || '').trim();

    if (!trimmed) {
        throw new Error('Danh mục không được để trống');
    }

    let categoryDoc;
    if (mongoose.Types.ObjectId.isValid(trimmed)) {
        categoryDoc = await Category.findById(trimmed);
    } else {
        categoryDoc = await Category.findOne({
            name: { $regex: new RegExp(`^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
            isActive: true,
        });
    }

    if (!categoryDoc) {
        throw new Error('Danh mục ảnh không tồn tại hoặc đã bị xóa');
    }

    return categoryDoc;
};

/**
 * Parse and validate tags
 */
const parseTags = (tagsInput) => {
    let tagsArray = [];

    if (!tagsInput) return [];

    try {
        tagsArray = typeof tagsInput === 'string' ? JSON.parse(tagsInput) : tagsInput;
        if (!Array.isArray(tagsArray)) return [];
    } catch (error) {
        logger.warn('Invalid tags format:', error.message);
        return [];
    }

    // Use Set for O(n) deduplication instead of O(n²) filter
    const uniqueTags = new Set();
    return tagsArray
        .map(tag => (typeof tag === 'string' ? tag : String(tag)).trim().toLowerCase())
        .filter(tag => tag.length > 0 && tag.length <= MAX_TAG_LENGTH)
        .filter(tag => {
            if (uniqueTags.has(tag)) return false;
            uniqueTags.add(tag);
            return true;
        })
        .slice(0, MAX_TAGS_PER_IMAGE);
};

/**
 * Extract metadata from image buffer in parallel
 */
const extractMetadata = async (imageBuffer) => {
    try {
        const [dominantColors, exifData] = await Promise.all([
            extractDominantColors(imageBuffer, 3).catch(err => {
                logger.warn('Failed to extract colors:', err.message);
                return [];
            }),
            extractExifData(imageBuffer).catch(err => {
                logger.warn('Failed to extract EXIF:', err.message);
                return {};
            }),
        ]);

        return { dominantColors, exifData };
    } catch (error) {
        logger.warn('Failed to extract metadata:', error.message);
        return { dominantColors: [], exifData: {} };
    }
};

/**
 * Create image document in database
 */
const createImageDocument = async (uploadResult, userId, categoryDoc, metadata, input) => {
    const { dominantColors, exifData } = metadata;
    const { imageTitle, location, coordinates, cameraModel, tags } = input;

    const parsedTags = parseTags(tags);
    const parsedCoordinates = validateCoordinates(coordinates);

    const isAdmin = input.isAdmin || false;
    const moderationStatus = isAdmin ? 'approved' : 'pending';

    const imageData = {
        imageUrl: uploadResult.imageUrl,
        thumbnailUrl: uploadResult.thumbnailUrl,
        smallUrl: uploadResult.smallUrl,
        regularUrl: uploadResult.regularUrl,
        imageAvifUrl: uploadResult.imageAvifUrl,
        thumbnailAvifUrl: uploadResult.thumbnailAvifUrl,
        smallAvifUrl: uploadResult.smallAvifUrl,
        regularAvifUrl: uploadResult.regularAvifUrl,
        publicId: uploadResult.publicId,
        imageTitle: imageTitle.substring(0, MAX_IMAGE_TITLE_LENGTH),
        imageCategory: categoryDoc._id,
        uploadedBy: userId,
        location: location?.trim() || undefined,
        coordinates: parsedCoordinates,
        cameraMake: exifData.cameraMake || undefined,
        cameraModel: exifData.cameraModel || cameraModel?.trim() || undefined,
        focalLength: exifData.focalLength || undefined,
        aperture: exifData.aperture || undefined,
        shutterSpeed: exifData.shutterSpeed || undefined,
        iso: exifData.iso || undefined,
        dominantColors: dominantColors.length > 0 ? dominantColors : undefined,
        tags: parsedTags.length > 0 ? parsedTags : undefined,
        moderationStatus,
        isModerated: isAdmin,
        ...(isAdmin ? {
            moderatedAt: new Date(),
            moderatedBy: userId,
        } : {}),
    };

    return Image.create(imageData);
};

export const uploadImage = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const isAdmin = req.user?.isAdmin || req.user?.isSuperAdmin;
    const { imageTitle, imageCategory, location, cameraModel, coordinates, tags } = req.body;

    if (!req.file) {
        return res.status(400).json({
            message: 'Bạn chưa chọn ảnh',
        });
    }

    const trimmedTitle = String(imageTitle || '').trim();
    if (!trimmedTitle) {
        return res.status(400).json({
            message: 'Tiêu đề ảnh không được để trống',
        });
    }

    if (!req.file.mimetype.startsWith('image/')) {
        return res.status(400).json({
            message: 'Tệp phải có định dạng là ảnh',
        });
    }

    let categoryDoc;
    try {
        categoryDoc = await findCategory(imageCategory);
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }

    let uploadResult;
    try {
        // Generate secure filename
        const filename = `image-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;

        // Upload image to S3 with multiple sizes
        uploadResult = await uploadImageWithSizes(
            req.file.buffer,
            'photo-app-images',
            filename
        );

        // Extract metadata in parallel
        const metadata = await extractMetadata(req.file.buffer);

        // Create image document
        const newImage = await createImageDocument(
            uploadResult,
            userId,
            categoryDoc,
            metadata,
            {
                imageTitle: trimmedTitle,
                location,
                coordinates,
                cameraModel,
                tags,
                isAdmin,
            }
        );

        await newImage.populate('uploadedBy', 'username displayName avatarUrl');
        await newImage.populate('imageCategory', 'name description');

        // Clear cache asynchronously (safe)
        safeAsync(clearCache, '/api/images')
            .catch(err => logger.warn('Failed to clear cache:', err?.message || err));

        // Create success notification (async)
        safeAsync(Notification?.create, {
            recipient: userId,
            type: 'upload_completed',
            image: newImage._id,
            metadata: { imageTitle: trimmedTitle },
        }).catch(err => logger.error('Failed to create notification:', err?.message || err));

        res.status(201).json({
            message: 'Thêm ảnh thành công',
            image: newImage,
        });
    } catch (error) {
        // Rollback S3 upload if DB save failed
        if (uploadResult?.publicId) {
            deleteImageFromS3(uploadResult.publicId, 'photo-app-images').catch(err => {
                logger.error('Rollback failed:', err.message);
            });
        }

        logger.error('Upload failed:', {
            message: error.message,
            fileSize: req.file?.size,
        });

        if (error.message?.includes('timeout')) {
            throw new Error('Lỗi tải ảnh: vui lòng thử lại với ảnh có dung lượng nhỏ hơn');
        }

        throw error;
    }
});

export const preUploadImage = asyncHandler(async (req, res) => {
    const { fileName, fileType, fileSize } = req.body;

    if (!fileName || !fileType || (fileSize === undefined || fileSize === null)) {
        return res.status(400).json({
            message: 'Thiếu thông tin tệp tin',
        });
    }

    if (!fileType.startsWith('image/')) {
        return res.status(400).json({
            message: 'Tệp phải có định dạng là ảnh',
        });
    }

    const numericFileSize = Number(fileSize);
    if (Number.isNaN(numericFileSize) || numericFileSize <= 0 || numericFileSize > MAX_FILE_SIZE_BYTES) {
        return res.status(413).json({
            message: `Ảnh quá lớn. Vui lòng chọn ảnh nhỏ hơn ${(MAX_FILE_SIZE_BYTES / (1024 * 1024)).toFixed(0)}MB`,
        });
    }

    try {
        const uploadId = generateUploadId();
        const extension = getFileExtension(fileName, fileType);
        const uploadKey = `${RAW_UPLOAD_FOLDER}/${uploadId}.${extension}`;
        const uploadUrl = await generatePresignedUploadUrl(uploadKey, fileType);

        res.status(200).json({
            message: 'Khởi tạo tải lên thành công',
            uploadId,
            uploadKey,
            uploadUrl,
            expiresIn: 300,
            maxFileSize: MAX_FILE_SIZE_BYTES,
        });
    } catch (error) {
        logger.error('Failed to generate upload URL:', error.message);
        throw new Error('Không thể khởi tạo tải ảnh. Vui lòng thử lại.');
    }
});

export const finalizeImageUpload = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const isAdmin = req.user?.isAdmin || req.user?.isSuperAdmin;
    const { uploadId, uploadKey, imageTitle, imageCategory, location, cameraModel, coordinates, tags } = req.body;

    if (!uploadId || !uploadKey || !UPLOAD_ID_PATTERN.test(uploadId)) {
        return res.status(400).json({
            message: 'Invalid upload ID format',
        });
    }

    const trimmedTitle = String(imageTitle || '').trim();
    if (!trimmedTitle) {
        return res.status(400).json({
            message: 'Tiêu đề ảnh không được để trống',
        });
    }

    let categoryDoc;
    try {
        categoryDoc = await findCategory(imageCategory);
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }

    let imageBuffer;
    try {
        const imageData = await getImageFromS3(uploadKey);
        if (!imageData.Body) {
            return res.status(400).json({
                message: 'Không tìm thấy ảnh đã tải lên',
            });
        }
        imageBuffer = await streamToBuffer(imageData.Body);
    } catch (error) {
        logger.error('Failed to download raw upload:', error.message);
        return res.status(400).json({
            message: 'Không thể đọc ảnh đã tải lên',
        });
    }

    let uploadResult;
    let newImage;

    try {
        // Extract metadata in parallel
        const metadata = await extractMetadata(imageBuffer);

        // Process image
        uploadResult = await uploadImageWithSizes(imageBuffer, 'photo-app-images', uploadId);

        // Create image document
        newImage = await createImageDocument(
            uploadResult,
            userId,
            categoryDoc,
            metadata,
            {
                imageTitle: trimmedTitle,
                location,
                coordinates,
                cameraModel,
                tags,
                isAdmin,
            }
        );

        await newImage.populate('uploadedBy', 'username displayName avatarUrl');
        await newImage.populate('imageCategory', 'name description');

        // Clear cache
        safeAsync(clearCache, '/api/images').catch(err => {
            logger.warn('Failed to clear cache:', err?.message || err);
        });

        // Clean up raw upload (async, don't wait)
        safeAsync(deleteObjectByKey, uploadKey)
            .catch(err => logger.warn(`Failed to delete raw upload ${uploadKey}:`, err?.message || err));

        // Create success notification (async)
        safeAsync(Notification?.create, {
            recipient: userId,
            type: 'upload_completed',
            image: newImage._id,
            metadata: { imageTitle: trimmedTitle },
        }).catch(err => logger.error('Failed to create notification:', err?.message || err));

        res.status(201).json({
            message: 'Thêm ảnh thành công',
            image: newImage,
        });
    } catch (error) {
        logger.error('Finalize upload failed:', error.message);

        // Rollback processed images
        if (uploadResult?.publicId) {
            safeAsync(deleteImageFromS3, uploadResult.publicId, 'photo-app-images')
                .catch(err => {
                    logger.error('Rollback failed:', err?.message || err);
                });
        }

        // Create failure notification (async)
        safeAsync(Notification?.create, {
            recipient: userId,
            type: 'upload_failed',
            metadata: {
                imageTitle: trimmedTitle || 'Unknown',
                error: error.message,
            },
        }).catch(err => logger.error('Failed to create failure notification:', err?.message || err));

        throw error;
    }
});

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
        logger.error('Failed to create bulk notification:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to create notification',
        });
    }
});


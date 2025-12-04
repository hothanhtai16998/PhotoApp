import mongoose from 'mongoose';
import crypto from 'crypto';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { addJob } from '../../workers/jobQueue.js';
import { findCategory } from '../../utils/imageHelpers.js';

import Image from '../../models/Image.js';
import Category from '../../models/Category.js';
import Notification from '../../models/Notification.js';
import Settings from '../../models/Settings.js';

import {
    uploadImageWithSizes,
    uploadVideo,
    deleteImageFromS3,
    generatePresignedUploadUrl,
    deleteObjectByKey
} from '../../libs/s3.js';

import { extractDominantColors } from '../../utils/colorExtractor.js';
import { extractExifData } from '../../utils/exifExtractor.js';
import { clearCache } from '../../middlewares/cacheMiddleware.js';
import { logger } from '../../utils/logger.js';

// small constants used in this controller
const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25MB
const MAX_FILE_SIZE_BYTES = MAX_FILE_BYTES; // alias for older/other usages
const MAX_IMAGE_TITLE_LENGTH = 255;
const MAX_TAG_LENGTH = 50;
const MAX_TAGS_PER_IMAGE = 20;
const RAW_UPLOAD_FOLDER = 'photo-app-raw';
const UPLOAD_ID_PATTERN = /^image-\d+-[a-f0-9]{8}$/;

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
    // If fn is not provided, return a resolved promise so callers can safely chain .catch
    return Promise.resolve();
};

/**
 * Generate secure random upload ID
 */
const generateUploadId = () => {
    const timestamp = Date.now();
    // 4 bytes -> 8 hex chars, safe and short
    const rand = crypto.randomBytes(4).toString('hex');
    return `image-${timestamp}-${rand}`;
};

const getFileExtension = (fileName = '', fileType = '') => {
    const nameExt = fileName.includes('.') ? fileName.split('.').pop()?.toLowerCase() : null;
    if (nameExt && nameExt.length <= 5 && /^[a-z0-9]+$/.test(nameExt)) {
        return nameExt;
    }

    if (typeof fileType === 'string' && fileType.includes('/')) {
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

        if (parsed.latitude === undefined || parsed.longitude === undefined) return undefined;

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
// const findCategory = async (categoryInput) => {
//     const trimmed = String(categoryInput || '').trim();

//     if (!trimmed) {
//         throw new Error('Danh mục không được để trống');
//     }

//     let categoryDoc;
//     if (mongoose.Types.ObjectId.isValid(trimmed)) {
//         categoryDoc = await Category.findById(trimmed);
//     } else {
//         categoryDoc = await Category.findOne({
//             name: { $regex: new RegExp(`^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
//             isActive: true,
//         });
//     }

//     if (!categoryDoc) {
//         throw new Error('Danh mục ảnh không tồn tại hoặc đã bị xóa');
//     }

//     return categoryDoc;
// };

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
    const { imageTitle, location, coordinates, cameraModel, tags, isVideo = false } = input;

    const parsedTags = parseTags(tags);
    const parsedCoordinates = validateCoordinates(coordinates);

    const isAdmin = input.isAdmin || false;
    const moderationStatus = isAdmin ? 'approved' : 'pending';

    const safeTitle = String(imageTitle || '').substring(0, MAX_IMAGE_TITLE_LENGTH);

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
        imageTitle: safeTitle,
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
        // Video fields
        isVideo: isVideo || uploadResult.isVideo || false,
        ...((isVideo || uploadResult.isVideo) && uploadResult.videoUrl ? {
            videoUrl: uploadResult.videoUrl,
            videoThumbnail: uploadResult.thumbnailUrl || uploadResult.videoUrl,
            videoDuration: uploadResult.videoDuration || undefined,
        } : {}),
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

    const isImage = req.file.mimetype.startsWith('image/');
    let isVideo = req.file.mimetype.startsWith('video/');
    
    if (!isImage && !isVideo) {
        return res.status(400).json({
            message: 'Tệp được chọn phải là ảnh hoặc video',
        });
    }

    // Get settings for file type validation
    const systemSettings = await Settings.findOne({ key: 'system' });
    const allowedFileTypes = systemSettings?.value?.allowedFileTypes || ['jpg', 'jpeg', 'png', 'webp'];
    
    // Map MIME types to file extensions
    const mimeToExtension = {
        'image/jpeg': ['jpg', 'jpeg'],
        'image/jpg': ['jpg', 'jpeg'],
        'image/png': ['png'],
        'image/webp': ['webp'],
        'image/gif': ['gif'],
        'image/svg+xml': ['svg'],
        'image/bmp': ['bmp'],
        'image/x-icon': ['ico'],
        'image/vnd.microsoft.icon': ['ico'],
        'video/mp4': ['mp4'],
        'video/webm': ['webm'],
    };

    // Check if the MIME type is allowed based on settings
    const allowedExtensions = Array.isArray(allowedFileTypes) 
        ? allowedFileTypes.map(t => t.toLowerCase())
        : allowedFileTypes.split(',').map(t => t.trim().toLowerCase());
    
    const mimeTypeExtensions = mimeToExtension[req.file.mimetype.toLowerCase()] || [];
    const isAllowed = mimeTypeExtensions.some(ext => allowedExtensions.includes(ext));
    
    if (!isAllowed) {
        return res.status(400).json({
            message: `Định dạng file không được phép. Các định dạng được phép: ${allowedExtensions.join(', ')}`,
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

        // Upload video or image to S3
        // Note: Large GIFs (>2MB) will be automatically converted to video by uploadImageWithSizes
        if (isVideo) {
            uploadResult = await uploadVideo(
                req.file.buffer,
                'photo-app-images',
                filename,
                req.file.mimetype
            );
        } else {
            uploadResult = await uploadImageWithSizes(
                req.file.buffer,
                'photo-app-images',
                filename,
                req.file.mimetype
            );
        }

        // Check if GIF was converted to video
        const wasConvertedToVideo = uploadResult.isVideo || false;
        const finalIsVideo = isVideo || wasConvertedToVideo;

        // Extract metadata in parallel (skip for videos and converted GIFs)
        const metadata = finalIsVideo 
            ? { dominantColors: [], exifData: {} } 
            : await extractMetadata(req.file.buffer);

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
                isVideo: finalIsVideo,
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

    // Basic filename sanity check
    if (String(fileName).length > 255) {
        return res.status(400).json({ message: 'Tên tệp quá dài' });
    }

    const isImage = fileType.startsWith('image/');
    const isVideo = fileType.startsWith('video/');
    
    if (!isImage && !isVideo) {
        return res.status(400).json({
            message: 'Tệp phải có định dạng là ảnh hoặc video',
        });
    }

    // Get settings for file size and type validation
    const systemSettings = await Settings.findOne({ key: 'system' });
    const maxUploadSizeMB = systemSettings?.value?.maxUploadSize || 10;
    const allowedFileTypes = systemSettings?.value?.allowedFileTypes || ['jpg', 'jpeg', 'png', 'webp'];
    const maxFileSizeBytes = maxUploadSizeMB * 1024 * 1024;

    // Validate file size against settings
    const numericFileSize = Number(fileSize);
    if (Number.isNaN(numericFileSize) || numericFileSize <= 0 || numericFileSize > maxFileSizeBytes) {
        return res.status(413).json({
            message: `Tệp quá lớn. Vui lòng chọn tệp nhỏ hơn ${maxUploadSizeMB}MB`,
        });
    }

    // Map MIME types to file extensions
    const mimeToExtension = {
        'image/jpeg': ['jpg', 'jpeg'],
        'image/jpg': ['jpg', 'jpeg'],
        'image/png': ['png'],
        'image/webp': ['webp'],
        'image/gif': ['gif'],
        'image/svg+xml': ['svg'],
        'image/bmp': ['bmp'],
        'image/x-icon': ['ico'],
        'image/vnd.microsoft.icon': ['ico'],
        'video/mp4': ['mp4'],
        'video/webm': ['webm'],
    };

    // Validate file type against settings
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    const allowedExtensions = Array.isArray(allowedFileTypes) 
        ? allowedFileTypes.map(t => t.toLowerCase())
        : allowedFileTypes.split(',').map(t => t.trim().toLowerCase());
    
    // Check both file extension and MIME type
    const mimeTypeExtensions = mimeToExtension[fileType.toLowerCase()] || [];
    const isValidExtension = fileExtension && allowedExtensions.includes(fileExtension);
    const isValidMimeType = mimeTypeExtensions.some(ext => allowedExtensions.includes(ext));
    
    if (!isValidExtension && !isValidMimeType) {
        return res.status(400).json({
            message: `Định dạng file không được phép. Các định dạng được phép: ${allowedExtensions.join(', ')}`,
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
            maxFileSize: maxFileSizeBytes,
        });
    } catch (error) {
        logger.error('Failed to generate upload URL:', error.message);
        throw new Error('Không thể khởi tạo tải ảnh. Vui lòng thử lại.');
    }
});

export const finalizeImageUpload = asyncHandler(async (req, res) => {
    const userId = req.user?._id;
    const isAdmin = req.user?.isAdmin || req.user?.isSuperAdmin;
    const { uploadId, uploadKey, imageTitle, imageCategory, location, cameraModel, coordinates, tags } = req.body;

    // Quick validation only — no downloads/processing here
    if (!uploadId || !uploadKey) {
        return res.status(400).json({ success: false, message: 'uploadId and uploadKey required' });
    }

    // Validate uploadId format
    if (!UPLOAD_ID_PATTERN.test(uploadId)) {
        return res.status(400).json({ success: false, message: 'uploadId invalid' });
    }

    if (!userId) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const trimmedTitle = String(imageTitle || '').trim();
    if (!trimmedTitle) {
        return res.status(400).json({ success: false, message: 'imageTitle required' });
    }

    // Validate category exists (accept either a valid ObjectId or a non-empty string name)
    if (typeof imageCategory === 'string') {
        if (imageCategory.trim() === '') {
            return res.status(400).json({ success: false, message: 'imageCategory invalid' });
        }
    } else if (!mongoose.Types.ObjectId.isValid(imageCategory)) {
        return res.status(400).json({ success: false, message: 'imageCategory invalid' });
    }

    // Enqueue background job — server does NOT download/process here
    addJob({
        uploadKey,
        uploadId,
        userId: userId.toString(),
        isAdmin: !!isAdmin,
        imageTitle: trimmedTitle,
        imageCategory,
        location,
        cameraModel,
        coordinates,
        tags,
    });

    // Return 202 Accepted immediately
    return res.status(202).json({
        success: true,
        message: 'Upload accepted — processing in background',
        processingTime: 'typically 30-60 seconds',
    });
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


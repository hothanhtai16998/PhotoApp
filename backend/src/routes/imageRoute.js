import express from 'express';
import {
    uploadImage,
    preUploadImage,
    finalizeImageUpload,
    getImagesByUserId,
    downloadImage,
    getImageById,
    updateImage,
    replaceImage,
    batchReplaceImages,
    createBulkUploadNotification,
} from '../controllers/imageController.js';
import {
    incrementView,
    incrementDownload,
} from '../controllers/imageStatsController.js';
import {
    getAllImages,
    getLocations,
} from '../controllers/imageSearchController.js';
import { singleUpload, multipleUpload } from '../middlewares/multerMiddleware.js';
import { protectedRoute } from '../middlewares/authMiddleware.js';
import { uploadLimiter } from '../middlewares/rateLimiter.js';
import { validateImageUpload, validateGetImages, validateUserId } from '../middlewares/validationMiddleware.js';
import { validateCsrf } from '../middlewares/csrfMiddleware.js';
import { cacheMiddleware } from '../middlewares/cacheMiddleware.js';

const router = express.Router();

// Public route - get all images (with optional search/category filters)
// Cache for 30 seconds - images change frequently but short cache helps with repeated requests
router.get('/', 
    cacheMiddleware(30 * 1000, (req) => {
        // Include query params in cache key for proper cache separation
        return `/api/images?${new URLSearchParams(req.query).toString()}`;
    }),
    validateGetImages, 
    getAllImages
);

// Public routes - get locations for suggestions/filtering
router.get('/locations', getLocations);

// Public routes - increment stats
router.patch('/:imageId/view', incrementView);
router.patch('/:imageId/download', incrementDownload);

// Public route - download image (proxy from S3 to avoid CORS)
// Must be after PATCH route to avoid conflicts
router.get('/:imageId/download', downloadImage);

// Protected routes (with CSRF protection for state-changing operations)
// Pre-upload: Upload image to S3 only (no database record)
router.post('/pre-upload', protectedRoute, validateCsrf, uploadLimiter, singleUpload, preUploadImage);
// Finalize: Link metadata to pre-uploaded image and create database record
router.post('/finalize', protectedRoute, validateCsrf, finalizeImageUpload);
// Bulk upload notification
router.post('/bulk-upload-notification', protectedRoute, validateCsrf, createBulkUploadNotification);
// Legacy upload endpoint (kept for backward compatibility)
router.post('/upload', protectedRoute, validateCsrf, uploadLimiter, singleUpload, validateImageUpload, uploadImage);
router.patch('/:imageId', protectedRoute, validateCsrf, updateImage);
router.patch('/:imageId/replace', protectedRoute, validateCsrf, uploadLimiter, singleUpload, replaceImage);
router.patch('/batch/replace', protectedRoute, validateCsrf, uploadLimiter, multipleUpload, batchReplaceImages);
router.get('/user/:userId', protectedRoute, validateUserId, validateGetImages, getImagesByUserId);

export default router;
import express from 'express';
import {
    getAllImages,
    uploadImage,
    getImagesByUserId,
    incrementView,
    incrementDownload,
} from '../controllers/imageController.js';
import { singleUpload } from '../middlewares/multerMiddleware.js';
import { protectedRoute } from '../middlewares/authMiddleware.js';
import { uploadLimiter } from '../middlewares/rateLimiter.js';
import { validateImageUpload, validateGetImages, validateUserId } from '../middlewares/validationMiddleware.js';
import { validateCsrf } from '../middlewares/csrfMiddleware.js';

const router = express.Router();

// Public route - get all images (with optional search/category filters)
router.get('/', validateGetImages, getAllImages);

// Public routes - increment stats
router.patch('/:imageId/view', incrementView);
router.patch('/:imageId/download', incrementDownload);

// Protected routes (with CSRF protection for state-changing operations)
router.post('/upload', protectedRoute, validateCsrf, uploadLimiter, singleUpload, validateImageUpload, uploadImage);
router.get('/user/:userId', protectedRoute, validateUserId, validateGetImages, getImagesByUserId);

export default router;
import express from 'express';
import { authMe, changePassword, forgotPassword, changeInfo } from '../controllers/userController.js';
import { protectedRoute } from '../middlewares/authMiddleware.js';
import { avatarUpload } from '../middlewares/multerMiddleware.js';
import { validateCsrf } from '../middlewares/csrfMiddleware.js';

const router = express.Router();

router.get('/me', protectedRoute, authMe);

router.put('/change-password', protectedRoute, validateCsrf, changePassword);

router.post('/forgot-password', protectedRoute, validateCsrf, forgotPassword);

router.put('/change-info', protectedRoute, validateCsrf, avatarUpload, changeInfo);

export default router;
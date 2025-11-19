import express from 'express';
import { authMe, changePassword, forgotPassword, changeInfo } from '../controllers/userController.js';
import { protectedRoute } from '../middlewares/authMiddleware.js';
import { avatarUpload } from '../middlewares/multerMiddleware.js';

const router = express.Router();

router.get('/me', protectedRoute, authMe);

router.put('/change-password', protectedRoute, changePassword);

router.post('/forgot-password', protectedRoute, forgotPassword);

router.put('/change-info', protectedRoute, avatarUpload, changeInfo);

export default router;
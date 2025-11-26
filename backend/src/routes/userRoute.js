import express from 'express';
import { authMe, changePassword, forgotPassword, changeInfo, searchUsers } from '../controllers/userController.js';
import { protectedRoute } from '../middlewares/authMiddleware.js';
import { avatarUpload } from '../middlewares/multerMiddleware.js';
import { validateCsrf } from '../middlewares/csrfMiddleware.js';
import { getUserAnalytics } from '../controllers/userAnalyticsController.js';

const router = express.Router();

router.get('/me', protectedRoute, authMe);
router.get('/search', protectedRoute, searchUsers);

router.put('/change-password', protectedRoute, validateCsrf, changePassword);

router.post('/forgot-password', protectedRoute, validateCsrf, forgotPassword);

router.put('/change-info', protectedRoute, validateCsrf, avatarUpload, changeInfo);

router.get('/analytics', protectedRoute, getUserAnalytics);

export default router;
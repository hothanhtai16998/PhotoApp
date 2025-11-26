import express from 'express';
import { authMe, changePassword, forgotPassword, changeInfo, searchUsers, getUserStats, trackProfileView, getUserByUsername, getUserById } from '../controllers/userController.js';
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

// Public user profile endpoints (must be before /:userId routes to avoid conflicts)
router.get('/username/:username', getUserByUsername); // Get user by username (public)
router.get('/:userId', getUserById); // Get user by ID (public)

// Enhanced Profile Statistics endpoints
router.get('/:userId/stats', getUserStats); // Public endpoint - anyone can view stats
router.post('/:userId/view', protectedRoute, trackProfileView); // Track profile view (requires auth but can be optional)

export default router;
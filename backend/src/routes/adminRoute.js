import express from 'express';
import {
    getDashboardStats,
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    banUser,
    unbanUser,
    getAllImagesAdmin,
    deleteImage,
    updateImage,
    moderateImage,
    getAnalytics,
    getRealtimeAnalytics,
    trackPageView,
    getAllAdminRoles,
    getAdminRole,
    createAdminRole,
    updateAdminRole,
    deleteAdminRole,
    getAllCollectionsAdmin,
    updateCollectionAdmin,
    deleteCollectionAdmin,
} from '../controllers/adminController.js';
import { protectedRoute } from '../middlewares/authMiddleware.js';
import { adminRoute } from '../middlewares/adminMiddleware.js';
import { requireSuperAdmin, requirePermission } from '../middlewares/permissionMiddleware.js';
import { validateCsrf } from '../middlewares/csrfMiddleware.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(protectedRoute);
router.use(adminRoute);

// Dashboard & Analytics
router.get('/dashboard/stats', requirePermission('viewDashboard'), getDashboardStats);
router.get('/analytics', requirePermission('viewAnalytics'), getAnalytics);
router.get('/analytics/realtime', requirePermission('viewAnalytics'), getRealtimeAnalytics);
// Note: trackPageView is handled as a public route in server.js (before adminRoute middleware)

// User Management
router.get('/users', getAllUsers);
router.get('/users/:userId', getUserById);
router.put('/users/:userId', validateCsrf, updateUser);
router.delete('/users/:userId', validateCsrf, deleteUser);
router.post('/users/:userId/ban', validateCsrf, banUser);
router.post('/users/:userId/unban', validateCsrf, unbanUser);

// Image Management
router.get('/images', getAllImagesAdmin);
router.put('/images/:imageId', validateCsrf, updateImage);
router.delete('/images/:imageId', validateCsrf, deleteImage);
router.post('/images/:imageId/moderate', validateCsrf, moderateImage);

// Admin Role Management
router.get('/roles', getAllAdminRoles);
router.get('/roles/:userId', getAdminRole);
router.post('/roles', requireSuperAdmin, validateCsrf, createAdminRole);
router.put('/roles/:userId', requireSuperAdmin, validateCsrf, updateAdminRole);
router.delete('/roles/:userId', requireSuperAdmin, validateCsrf, deleteAdminRole);

// Collection Management
router.get('/collections', getAllCollectionsAdmin);
router.put('/collections/:collectionId', validateCsrf, updateCollectionAdmin);
router.delete('/collections/:collectionId', validateCsrf, deleteCollectionAdmin);

export default router;


import express from 'express';
import {
    getDashboardStats,
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    getAllImagesAdmin,
    deleteImage,
    getAllAdminRoles,
    getAdminRole,
    createAdminRole,
    updateAdminRole,
    deleteAdminRole,
} from '../controllers/adminController.js';
import { protectedRoute } from '../middlewares/authMiddleware.js';
import { adminRoute } from '../middlewares/adminMiddleware.js';
import { requireSuperAdmin } from '../middlewares/permissionMiddleware.js';
import { validateCsrf } from '../middlewares/csrfMiddleware.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(protectedRoute);
router.use(adminRoute);

// Dashboard
router.get('/dashboard/stats', getDashboardStats);

// User Management
router.get('/users', getAllUsers);
router.get('/users/:userId', getUserById);
router.put('/users/:userId', validateCsrf, updateUser);
router.delete('/users/:userId', validateCsrf, deleteUser);

// Image Management
router.get('/images', getAllImagesAdmin);
router.delete('/images/:imageId', validateCsrf, deleteImage);

// Admin Role Management (Super Admin Only)
router.get('/roles', requireSuperAdmin, getAllAdminRoles);
router.get('/roles/:userId', getAdminRole);
router.post('/roles', requireSuperAdmin, validateCsrf, createAdminRole);
router.put('/roles/:userId', requireSuperAdmin, validateCsrf, updateAdminRole);
router.delete('/roles/:userId', requireSuperAdmin, validateCsrf, deleteAdminRole);

export default router;


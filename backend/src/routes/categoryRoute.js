import express from 'express';
import {
    getAllCategories,
    getAllCategoriesAdmin,
    createCategory,
    updateCategory,
    deleteCategory,
} from '../controllers/categoryController.js';
import { protectedRoute } from '../middlewares/authMiddleware.js';
import { adminRoute } from '../middlewares/adminMiddleware.js';
import { cacheMiddleware } from '../middlewares/cacheMiddleware.js';

const router = express.Router();

// Public route - get active categories
// Cache for 5 minutes - categories don't change frequently
router.get('/', cacheMiddleware(5 * 60 * 1000), getAllCategories);

// Admin routes - require authentication and admin access
router.use(protectedRoute);
router.use(adminRoute);

// Admin category management
router.get('/admin', getAllCategoriesAdmin);
router.post('/admin', createCategory);
router.put('/admin/:categoryId', updateCategory);
router.patch('/admin/:categoryId', updateCategory);
router.delete('/admin/:categoryId', deleteCategory);

export default router;


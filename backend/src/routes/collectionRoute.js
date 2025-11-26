import express from 'express';
import {
    getUserCollections,
    getCollectionById,
    createCollection,
    updateCollection,
    deleteCollection,
    addImageToCollection,
    removeImageFromCollection,
    getCollectionsContainingImage,
    reorderCollectionImages,
} from '../controllers/collectionController.js';
import { protectedRoute } from '../middlewares/authMiddleware.js';
import { validateCsrf } from '../middlewares/csrfMiddleware.js';

const router = express.Router();

// All routes require authentication
router.use(protectedRoute);

// Get all collections for the authenticated user
router.get('/', getUserCollections);

// Get collections containing a specific image
router.get('/containing/:imageId', getCollectionsContainingImage);

// Get a single collection by ID
router.get('/:collectionId', getCollectionById);

// Create a new collection
router.post('/', validateCsrf, createCollection);

// Update a collection
router.patch('/:collectionId', validateCsrf, updateCollection);

// Delete a collection
router.delete('/:collectionId', validateCsrf, deleteCollection);

// Add image to collection
router.post('/:collectionId/images', validateCsrf, addImageToCollection);

// Remove image from collection
router.delete('/:collectionId/images/:imageId', validateCsrf, removeImageFromCollection);

// Reorder images in collection
router.patch('/:collectionId/images/reorder', validateCsrf, reorderCollectionImages);

export default router;



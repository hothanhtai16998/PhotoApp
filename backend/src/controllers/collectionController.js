import Collection from '../models/Collection.js';
import Image from '../models/Image.js';
import { logger } from '../utils/logger.js';

/**
 * Get all collections for the authenticated user
 */
export const getUserCollections = async (req, res) => {
    try {
        const userId = req.user._id;

        const collections = await Collection.find({ createdBy: userId })
            .populate('coverImage', 'thumbnailUrl smallUrl imageUrl imageTitle')
            .populate('images', 'thumbnailUrl smallUrl imageUrl imageTitle')
            .sort({ createdAt: -1 })
            .lean();

        // Add image count to each collection
        const collectionsWithCount = collections.map(collection => ({
            ...collection,
            imageCount: collection.images ? collection.images.length : 0,
        }));

        res.json({
            success: true,
            collections: collectionsWithCount,
        });
    } catch (error) {
        logger.error('Error fetching user collections:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch collections',
        });
    }
};

/**
 * Get a single collection by ID
 */
export const getCollectionById = async (req, res) => {
    try {
        const { collectionId } = req.params;
        const userId = req.user._id;

        const collection = await Collection.findOne({
            _id: collectionId,
            $or: [
                { createdBy: userId }, // User's own collection
                { isPublic: true }, // Or public collection
            ],
        })
            .populate('createdBy', 'username displayName avatarUrl')
            .populate('coverImage', 'thumbnailUrl smallUrl imageUrl imageTitle')
            .populate({
                path: 'images',
                select: 'thumbnailUrl smallUrl regularUrl imageUrl imageTitle location uploadedBy views downloads createdAt',
                populate: {
                    path: 'uploadedBy',
                    select: 'username displayName avatarUrl',
                },
            })
            .lean();

        if (!collection) {
            return res.status(404).json({
                success: false,
                message: 'Collection not found',
            });
        }

        // Increment views if viewing someone else's public collection
        if (collection.createdBy._id.toString() !== userId.toString() && collection.isPublic) {
            await Collection.findByIdAndUpdate(collectionId, {
                $inc: { views: 1 },
            });
        }

        res.json({
            success: true,
            collection: {
                ...collection,
                imageCount: collection.images ? collection.images.length : 0,
            },
        });
    } catch (error) {
        logger.error('Error fetching collection:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch collection',
        });
    }
};

/**
 * Create a new collection
 */
export const createCollection = async (req, res) => {
    try {
        const userId = req.user._id;
        const { name, description, isPublic } = req.body;

        if (!name || name.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Collection name is required',
            });
        }

        if (name.length > 100) {
            return res.status(400).json({
                success: false,
                message: 'Collection name must be 100 characters or less',
            });
        }

        const collection = new Collection({
            name: name.trim(),
            description: description?.trim() || '',
            createdBy: userId,
            images: [],
            isPublic: isPublic !== undefined ? isPublic : true,
        });

        await collection.save();

        const populatedCollection = await Collection.findById(collection._id)
            .populate('coverImage', 'thumbnailUrl smallUrl imageUrl imageTitle')
            .lean();

        res.status(201).json({
            success: true,
            collection: {
                ...populatedCollection,
                imageCount: 0,
            },
        });
    } catch (error) {
        logger.error('Error creating collection:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create collection',
        });
    }
};

/**
 * Update a collection
 */
export const updateCollection = async (req, res) => {
    try {
        const { collectionId } = req.params;
        const userId = req.user._id;
        const { name, description, isPublic, coverImage } = req.body;

        const collection = await Collection.findOne({
            _id: collectionId,
            createdBy: userId,
        });

        if (!collection) {
            return res.status(404).json({
                success: false,
                message: 'Collection not found',
            });
        }

        if (name !== undefined) {
            if (name.trim().length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Collection name cannot be empty',
                });
            }
            if (name.length > 100) {
                return res.status(400).json({
                    success: false,
                    message: 'Collection name must be 100 characters or less',
                });
            }
            collection.name = name.trim();
        }

        if (description !== undefined) {
            collection.description = description.trim();
        }

        if (isPublic !== undefined) {
            collection.isPublic = isPublic;
        }

        if (coverImage !== undefined) {
            // Verify the cover image is in the collection
            if (coverImage && !collection.images.includes(coverImage)) {
                return res.status(400).json({
                    success: false,
                    message: 'Cover image must be in the collection',
                });
            }
            collection.coverImage = coverImage || null;
        }

        await collection.save();

        const populatedCollection = await Collection.findById(collection._id)
            .populate('coverImage', 'thumbnailUrl smallUrl imageUrl imageTitle')
            .populate('images', 'thumbnailUrl smallUrl imageUrl imageTitle')
            .lean();

        res.json({
            success: true,
            collection: {
                ...populatedCollection,
                imageCount: populatedCollection.images ? populatedCollection.images.length : 0,
            },
        });
    } catch (error) {
        logger.error('Error updating collection:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update collection',
        });
    }
};

/**
 * Delete a collection
 */
export const deleteCollection = async (req, res) => {
    try {
        const { collectionId } = req.params;
        const userId = req.user._id;

        const collection = await Collection.findOne({
            _id: collectionId,
            createdBy: userId,
        });

        if (!collection) {
            return res.status(404).json({
                success: false,
                message: 'Collection not found',
            });
        }

        await Collection.findByIdAndDelete(collectionId);

        res.json({
            success: true,
            message: 'Collection deleted successfully',
        });
    } catch (error) {
        logger.error('Error deleting collection:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete collection',
        });
    }
};

/**
 * Add image to collection
 */
export const addImageToCollection = async (req, res) => {
    try {
        const { collectionId } = req.params;
        const { imageId } = req.body;
        const userId = req.user._id;

        if (!imageId) {
            return res.status(400).json({
                success: false,
                message: 'Image ID is required',
            });
        }

        // Verify collection exists and belongs to user
        const collection = await Collection.findOne({
            _id: collectionId,
            createdBy: userId,
        });

        if (!collection) {
            return res.status(404).json({
                success: false,
                message: 'Collection not found',
            });
        }

        // Verify image exists
        const image = await Image.findById(imageId);
        if (!image) {
            return res.status(404).json({
                success: false,
                message: 'Image not found',
            });
        }

        // Check if image is already in collection
        if (collection.images.includes(imageId)) {
            return res.status(400).json({
                success: false,
                message: 'Image is already in this collection',
            });
        }

        // Add image to collection
        collection.images.push(imageId);

        // Set as cover image if collection is empty
        if (!collection.coverImage && collection.images.length === 1) {
            collection.coverImage = imageId;
        }

        await collection.save();

        const populatedCollection = await Collection.findById(collection._id)
            .populate('coverImage', 'thumbnailUrl smallUrl imageUrl imageTitle')
            .populate('images', 'thumbnailUrl smallUrl imageUrl imageTitle')
            .lean();

        res.json({
            success: true,
            collection: {
                ...populatedCollection,
                imageCount: populatedCollection.images ? populatedCollection.images.length : 0,
            },
        });
    } catch (error) {
        logger.error('Error adding image to collection:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add image to collection',
        });
    }
};

/**
 * Remove image from collection
 */
export const removeImageFromCollection = async (req, res) => {
    try {
        const { collectionId, imageId } = req.params;
        const userId = req.user._id;

        // Verify collection exists and belongs to user
        const collection = await Collection.findOne({
            _id: collectionId,
            createdBy: userId,
        });

        if (!collection) {
            return res.status(404).json({
                success: false,
                message: 'Collection not found',
            });
        }

        // Remove image from collection
        collection.images = collection.images.filter(
            id => id.toString() !== imageId
        );

        // If removed image was cover image, set new cover (first image or null)
        if (collection.coverImage && collection.coverImage.toString() === imageId) {
            collection.coverImage = collection.images.length > 0 ? collection.images[0] : null;
        }

        await collection.save();

        const populatedCollection = await Collection.findById(collection._id)
            .populate('coverImage', 'thumbnailUrl smallUrl imageUrl imageTitle')
            .populate('images', 'thumbnailUrl smallUrl imageUrl imageTitle')
            .lean();

        res.json({
            success: true,
            collection: {
                ...populatedCollection,
                imageCount: populatedCollection.images ? populatedCollection.images.length : 0,
            },
        });
    } catch (error) {
        logger.error('Error removing image from collection:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove image from collection',
        });
    }
};

/**
 * Get collections that contain a specific image
 */
export const getCollectionsContainingImage = async (req, res) => {
    try {
        const { imageId } = req.params;
        const userId = req.user._id;

        const collections = await Collection.find({
            createdBy: userId,
            images: imageId,
        })
            .select('name description coverImage imageCount')
            .populate('coverImage', 'thumbnailUrl smallUrl')
            .lean();

        // Calculate image count for each collection
        const collectionsWithCount = collections.map((collection) => ({
            ...collection,
            imageCount: collection.images ? collection.images.length : 0,
        }));

        res.json({
            success: true,
            collections: collectionsWithCount,
        });
    } catch (error) {
        logger.error('Error fetching collections containing image:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch collections',
        });
    }
};


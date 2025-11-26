import Collection from '../models/Collection.js';
import Image from '../models/Image.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { logger } from '../utils/logger.js';
import JSZip from 'jszip';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import axios from 'axios';
import { createCollectionVersion } from '../utils/collectionVersionHelper.js';

/**
 * Get all collections for the authenticated user
 */
export const getUserCollections = async (req, res) => {
    try {
        const userId = req.user._id;

        // Get collections created by user OR where user is a collaborator
        const collections = await Collection.find({
            $or: [
                { createdBy: userId },
                { 'collaborators.user': userId },
            ],
        })
            .populate('coverImage', 'thumbnailUrl smallUrl imageUrl imageTitle')
            .populate('images', 'thumbnailUrl smallUrl imageUrl imageTitle')
            .populate({
                path: 'collaborators.user',
                select: 'username displayName avatarUrl',
            })
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
                { 'collaborators.user': userId }, // Or user is a collaborator
            ],
        })
            .populate('createdBy', 'username displayName avatarUrl')
            .populate('coverImage', 'thumbnailUrl smallUrl imageUrl imageTitle')
            .populate({
                path: 'collaborators.user',
                select: 'username displayName avatarUrl email',
            })
            .populate({
                path: 'collaborators.invitedBy',
                select: 'username displayName avatarUrl',
            })
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
        const { name, description, isPublic, tags } = req.body;

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

        // Process tags: normalize, remove empty, deduplicate
        let processedTags = [];
        if (Array.isArray(tags)) {
            processedTags = tags
                .map(tag => String(tag).trim().toLowerCase())
                .filter(tag => tag.length > 0)
                .filter((tag, index, self) => self.indexOf(tag) === index) // Remove duplicates
                .slice(0, 10); // Limit to 10 tags
        }

        const collection = new Collection({
            name: name.trim(),
            description: description?.trim() || '',
            createdBy: userId,
            images: [],
            isPublic: isPublic !== undefined ? isPublic : true,
            tags: processedTags,
        });

        await collection.save();

        // Create initial version
        await createCollectionVersion(
            collection._id,
            userId,
            'created',
            { description: 'Collection created' }
        );

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
        const { name, description, isPublic, coverImage, tags } = req.body;

        // Find collection and populate collaborators
        const collection = await Collection.findById(collectionId)
        .populate('collaborators.user');

        if (!collection) {
            return res.status(404).json({
                success: false,
                message: 'Collection not found',
            });
        }

        // Check if user has permission to edit (owner or collaborator with edit/admin permission)
        if (!hasPermission(collection, userId, 'edit')) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền chỉnh sửa bộ sưu tập này',
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

        if (tags !== undefined) {
            // Process tags: normalize, remove empty, deduplicate
            let processedTags = [];
            if (Array.isArray(tags)) {
                processedTags = tags
                    .map(tag => String(tag).trim().toLowerCase())
                    .filter(tag => tag.length > 0)
                    .filter((tag, index, self) => self.indexOf(tag) === index) // Remove duplicates
                    .slice(0, 10); // Limit to 10 tags
            }
            collection.tags = processedTags;
        }

        // Track what changed for versioning
        const changes = [];
        if (name !== undefined && name.trim() !== collection.name) {
            changes.push({ field: 'name', oldValue: collection.name, newValue: name.trim() });
        }
        if (description !== undefined && description.trim() !== collection.description) {
            changes.push({ field: 'description', oldValue: collection.description, newValue: description.trim() });
        }
        if (isPublic !== undefined && isPublic !== collection.isPublic) {
            changes.push({ field: 'isPublic', oldValue: collection.isPublic, newValue: isPublic });
        }
        if (coverImage !== undefined && coverImage !== collection.coverImage?.toString()) {
            changes.push({ field: 'coverImage', oldValue: collection.coverImage, newValue: coverImage });
        }
        if (tags !== undefined) {
            changes.push({ field: 'tags', oldValue: collection.tags, newValue: tags });
        }

        await collection.save();

        // Create version for each change
        if (changes.length > 0) {
            for (const change of changes) {
                await createCollectionVersion(
                    collectionId,
                    userId,
                    'updated',
                    {
                        fieldChanged: change.field,
                        oldValue: change.oldValue,
                        newValue: change.newValue,
                        description: `Updated ${change.field}`,
                    }
                );
            }

            // Notify collaborators and owner about collection updates
            // If owner updates, notify collaborators
            // If collaborator updates, notify owner and other collaborators
            const collaborators = collection.collaborators || [];
            const notificationRecipients = new Set();
            
            const isOwner = collection.createdBy.toString() === userId.toString();
            
            if (isOwner) {
                // Owner updated - notify all collaborators
                collaborators.forEach(collab => {
                    const collabUserId = getUserId(collab.user);
                    if (collabUserId && collabUserId !== userId.toString()) {
                        notificationRecipients.add(collabUserId);
                    }
                });
            } else {
                // Collaborator updated - notify owner and other collaborators
                if (collection.createdBy.toString() !== userId.toString()) {
                    notificationRecipients.add(collection.createdBy.toString());
                }
                
                collaborators.forEach(collab => {
                    const collabUserId = getUserId(collab.user);
                    if (collabUserId && collabUserId !== userId.toString()) {
                        notificationRecipients.add(collabUserId);
                    }
                });
            }

            if (notificationRecipients.size > 0) {
                const recipients = Array.from(notificationRecipients);
                // Check if cover image was changed
                const coverChanged = changes.some(c => c.field === 'coverImage');
                const nameChanged = changes.some(c => c.field === 'name');
                const descriptionChanged = changes.some(c => c.field === 'description');
                const otherChanges = changes.filter(c => 
                    c.field !== 'coverImage' && 
                    c.field !== 'name' && 
                    c.field !== 'description' &&
                    c.field !== 'tags'
                );

                // Create notifications for each collaborator
                const notificationPromises = [];

                // Create specific notifications
                if (coverChanged) {
                    recipients.forEach(recipientId => {
                        notificationPromises.push(
                            Notification.create({
                                recipient: recipientId,
                                type: 'collection_cover_changed',
                                collection: collectionId,
                                actor: userId,
                                metadata: {
                                    collectionName: collection.name,
                                },
                            })
                        );
                    });
                }

                // Create general update notification for other changes
                if (nameChanged || descriptionChanged || otherChanges.length > 0) {
                    recipients.forEach(recipientId => {
                        notificationPromises.push(
                            Notification.create({
                                recipient: recipientId,
                                type: 'collection_updated',
                                collection: collectionId,
                                actor: userId,
                                metadata: {
                                    collectionName: collection.name,
                                    changes: changes.map(c => c.field),
                                },
                            })
                        );
                    });
                }

                // Create all notifications in parallel
                try {
                    await Promise.all(notificationPromises);
                } catch (notifError) {
                    logger.error('Failed to create collection update notifications:', notifError);
                    // Don't fail the update if notifications fail
                }
            }
        }

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

        // Create version
        await createCollectionVersion(
            collectionId,
            userId,
            'image_added',
            {
                imageId,
                description: `Image added to collection`,
            }
        );

        // Notify collaborators and owner (except the user who added the image)
        try {
            const collaborators = collection.collaborators || [];
            const notificationRecipients = new Set();
            
            // Add owner if not the current user
            if (collection.createdBy.toString() !== userId.toString()) {
                notificationRecipients.add(collection.createdBy.toString());
            }
            
            // Add collaborators
            collaborators.forEach(collab => {
                const collabUserId = getUserId(collab.user);
                if (collabUserId && collabUserId !== userId.toString()) {
                    notificationRecipients.add(collabUserId);
                }
            });

            const notificationPromises = Array.from(notificationRecipients).map(recipientId =>
                Notification.create({
                    recipient: recipientId,
                    type: 'collection_image_added',
                    collection: collectionId,
                    actor: userId,
                    image: imageId,
                })
            );
            await Promise.all(notificationPromises);
        } catch (notifError) {
            logger.error('Failed to create notifications for image added:', notifError);
        }

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

        // Verify collection exists and user has permission
        const collection = await Collection.findById(collectionId)
            .populate('collaborators.user');

        if (!collection) {
            return res.status(404).json({
                success: false,
                message: 'Collection not found',
            });
        }

        // Check if user has permission to edit
        if (!hasPermission(collection, userId, 'edit')) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền chỉnh sửa bộ sưu tập này',
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

        // Create version
        await createCollectionVersion(
            collectionId,
            userId,
            'image_removed',
            {
                imageId,
                description: `Image removed from collection`,
            }
        );

        // Notify collaborators and owner (except the user who removed the image)
        try {
            const collaborators = collection.collaborators || [];
            const notificationRecipients = new Set();
            
            // Add owner if not the current user
            if (collection.createdBy.toString() !== userId.toString()) {
                notificationRecipients.add(collection.createdBy.toString());
            }
            
            // Add collaborators
            collaborators.forEach(collab => {
                const collabUserId = getUserId(collab.user);
                if (collabUserId && collabUserId !== userId.toString()) {
                    notificationRecipients.add(collabUserId);
                }
            });

            const notificationPromises = Array.from(notificationRecipients).map(recipientId =>
                Notification.create({
                    recipient: recipientId,
                    type: 'collection_image_removed',
                    collection: collectionId,
                    actor: userId,
                    image: imageId,
                })
            );
            await Promise.all(notificationPromises);
        } catch (notifError) {
            logger.error('Failed to create notifications for image removed:', notifError);
        }

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

/**
 * Reorder images in a collection
 */
export const reorderCollectionImages = async (req, res) => {
    try {
        const { collectionId } = req.params;
        const { imageIds } = req.body; // Array of image IDs in new order
        const userId = req.user._id;

        if (!Array.isArray(imageIds)) {
            return res.status(400).json({
                success: false,
                message: 'imageIds must be an array',
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

        // Verify all image IDs are in the collection
        const collectionImageIds = collection.images.map(id => id.toString());
        const allImagesInCollection = imageIds.every(id => 
            collectionImageIds.includes(id.toString())
        );

        if (!allImagesInCollection) {
            return res.status(400).json({
                success: false,
                message: 'All image IDs must be in the collection',
            });
        }

        // Verify all collection images are in the new order
        if (imageIds.length !== collection.images.length) {
            return res.status(400).json({
                success: false,
                message: 'Image count mismatch',
            });
        }

        // Reorder images
        collection.images = imageIds.map(id => 
            collection.images.find(imgId => imgId.toString() === id.toString())
        ).filter(Boolean);

        await collection.save();

        // Create version
        await createCollectionVersion(
            collectionId,
            userId,
            'reordered',
            {
                description: `Images reordered`,
            }
        );

        // Notify collaborators about reordering (not the owner)
        const collaborators = collection.collaborators || [];
        const recipients = collaborators
            .map(c => getUserId(c.user))
            .filter(id => id && id !== userId.toString());

        if (recipients.length > 0) {
            try {
                const notificationPromises = recipients.map(recipientId =>
                    Notification.create({
                        recipient: recipientId,
                        type: 'collection_reordered',
                        collection: collectionId,
                        actor: userId,
                        metadata: {
                            collectionName: collection.name,
                            imageCount: imageIds.length,
                        },
                    })
                );
                await Promise.all(notificationPromises);
            } catch (notifError) {
                logger.error('Failed to create collection reorder notifications:', notifError);
                // Don't fail the reorder if notifications fail
            }
        }

        const populatedCollection = await Collection.findById(collection._id)
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

        res.json({
            success: true,
            collection: {
                ...populatedCollection,
                imageCount: populatedCollection.images ? populatedCollection.images.length : 0,
            },
        });
    } catch (error) {
        logger.error('Error reordering collection images:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to reorder images',
        });
    }
};

/**
 * Helper function to safely extract user ID from collaborator user field
 * Handles both ObjectId and populated user objects
 */
const getUserId = (userField) => {
    if (!userField) return null;
    // If it's a populated object, extract _id
    if (typeof userField === 'object' && userField._id) {
        return userField._id.toString();
    }
    // If it's an ObjectId, convert to string
    return userField.toString();
};

/**
 * Helper function to check if user has permission on collection
 */
const hasPermission = (collection, userId, requiredPermission) => {
    // Owner has all permissions
    if (collection.createdBy.toString() === userId.toString()) {
        return true;
    }

    // Check collaborator permissions
    const collaborator = collection.collaborators?.find(
        collab => getUserId(collab.user) === userId.toString()
    );

    if (!collaborator) {
        return false;
    }

    // Permission hierarchy: view < edit < admin
    const permissionLevels = { view: 1, edit: 2, admin: 3 };
    const userLevel = permissionLevels[collaborator.permission] || 0;
    const requiredLevel = permissionLevels[requiredPermission] || 0;

    return userLevel >= requiredLevel;
};

/**
 * Add collaborator to collection
 */
export const addCollaborator = asyncHandler(async (req, res) => {
    try {
        const { collectionId } = req.params;
        const userId = req.user._id;
        const { userEmail, permission = 'view' } = req.body;

        if (!userEmail) {
            return res.status(400).json({
                success: false,
                message: 'Email người dùng là bắt buộc',
            });
        }

        if (!['view', 'edit', 'admin'].includes(permission)) {
            return res.status(400).json({
                success: false,
                message: 'Quyền không hợp lệ. Phải là: view, edit, hoặc admin',
            });
        }

        const collection = await Collection.findById(collectionId);

        if (!collection) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy bộ sưu tập',
            });
        }

        // Check if user is owner or admin collaborator
        if (!hasPermission(collection, userId, 'admin')) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền thêm cộng tác viên',
            });
        }

        // Find user by email
        const userToAdd = await User.findOne({ email: userEmail.toLowerCase() });

        if (!userToAdd) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy người dùng với email này',
            });
        }

        // Can't add owner as collaborator
        if (collection.createdBy.toString() === userToAdd._id.toString()) {
            return res.status(400).json({
                success: false,
                message: 'Chủ sở hữu bộ sưu tập không thể được thêm làm cộng tác viên',
            });
        }

        // Check if user is already a collaborator
        const existingCollaborator = collection.collaborators?.find(
            collab => getUserId(collab.user) === userToAdd._id.toString()
        );

        if (existingCollaborator) {
            return res.status(400).json({
                success: false,
                message: 'Người dùng này đã là cộng tác viên',
            });
        }

        // Add collaborator
        collection.collaborators = collection.collaborators || [];
        collection.collaborators.push({
            user: userToAdd._id,
            permission,
            invitedBy: userId,
            invitedAt: new Date(),
        });

        await collection.save();

        // Create notification for the invited user
        try {
            await Notification.create({
                recipient: userToAdd._id,
                type: 'collection_invited',
                collection: collectionId,
                actor: userId,
                metadata: {
                    permission,
                    collectionName: collection.name,
                },
            });
        } catch (notifError) {
            // Log error but don't fail the request
            logger.error('Failed to create notification:', notifError);
        }

        // Populate and return updated collection
        const updatedCollection = await Collection.findById(collectionId)
            .populate('createdBy', 'username displayName avatarUrl')
            .populate({
                path: 'collaborators.user',
                select: 'username displayName avatarUrl email',
            })
            .populate({
                path: 'collaborators.invitedBy',
                select: 'username displayName avatarUrl',
            })
            .lean();

        res.json({
            success: true,
            message: 'Đã thêm cộng tác viên thành công',
            collection: updatedCollection,
        });
    } catch (error) {
        logger.error('Error adding collaborator:', error);
        res.status(500).json({
            success: false,
            message: 'Không thể thêm cộng tác viên. Vui lòng thử lại.',
        });
    }
});

/**
 * Remove collaborator from collection
 */
export const removeCollaborator = asyncHandler(async (req, res) => {
    try {
        const { collectionId, collaboratorId } = req.params;
        const userId = req.user._id;

        const collection = await Collection.findById(collectionId);

        if (!collection) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy bộ sưu tập',
            });
        }

        // Check if user is owner or admin collaborator
        if (!hasPermission(collection, userId, 'admin')) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền xóa cộng tác viên',
            });
        }

        // Find collaborator before removing
        const collaboratorToRemove = collection.collaborators?.find(
            collab => getUserId(collab.user) === collaboratorId
        );

        // Remove collaborator
        collection.collaborators = collection.collaborators?.filter(
            collab => getUserId(collab.user) !== collaboratorId
        ) || [];

        await collection.save();

        // Notify the removed collaborator
        if (collaboratorToRemove) {
            try {
                await Notification.create({
                    recipient: collaboratorId,
                    type: 'collection_removed',
                    collection: collectionId,
                    actor: userId,
                    metadata: {
                        collectionName: collection.name,
                    },
                });
            } catch (notifError) {
                logger.error('Failed to create notification for collaborator removal:', notifError);
            }
        }

        // Populate and return updated collection
        const updatedCollection = await Collection.findById(collectionId)
            .populate('createdBy', 'username displayName avatarUrl')
            .populate({
                path: 'collaborators.user',
                select: 'username displayName avatarUrl email',
            })
            .populate({
                path: 'collaborators.invitedBy',
                select: 'username displayName avatarUrl',
            })
            .lean();

        res.json({
            success: true,
            message: 'Đã xóa cộng tác viên thành công',
            collection: updatedCollection,
        });
    } catch (error) {
        logger.error('Error removing collaborator:', error);
        res.status(500).json({
            success: false,
            message: 'Không thể xóa cộng tác viên. Vui lòng thử lại.',
        });
    }
});

/**
 * Update collaborator permission
 */
export const updateCollaboratorPermission = asyncHandler(async (req, res) => {
    try {
        const { collectionId, collaboratorId } = req.params;
        const userId = req.user._id;
        const { permission } = req.body;

        if (!['view', 'edit', 'admin'].includes(permission)) {
            return res.status(400).json({
                success: false,
                message: 'Quyền không hợp lệ. Phải là: view, edit, hoặc admin',
            });
        }

        const collection = await Collection.findById(collectionId);

        if (!collection) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy bộ sưu tập',
            });
        }

        // Check if user is owner or admin collaborator
        if (!hasPermission(collection, userId, 'admin')) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền cập nhật quyền cộng tác viên',
            });
        }

        // Find and update collaborator
        const collaborator = collection.collaborators?.find(
            collab => getUserId(collab.user) === collaboratorId
        );

        if (!collaborator) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy cộng tác viên',
            });
        }

        collaborator.permission = permission;
        await collection.save();

        // Notify the collaborator whose permission was changed
        try {
            await Notification.create({
                recipient: collaboratorId,
                type: 'collection_permission_changed',
                collection: collectionId,
                actor: userId,
                metadata: {
                    permission,
                    collectionName: collection.name,
                },
            });
        } catch (notifError) {
            logger.error('Failed to create notification for permission change:', notifError);
        }

        // Populate and return updated collection
        const updatedCollection = await Collection.findById(collectionId)
            .populate('createdBy', 'username displayName avatarUrl')
            .populate({
                path: 'collaborators.user',
                select: 'username displayName avatarUrl email',
            })
            .populate({
                path: 'collaborators.invitedBy',
                select: 'username displayName avatarUrl',
            })
            .lean();

        res.json({
            success: true,
            message: 'Đã cập nhật quyền cộng tác viên thành công',
            collection: updatedCollection,
        });
    } catch (error) {
        logger.error('Error updating collaborator permission:', error);
        res.status(500).json({
            success: false,
            message: 'Không thể cập nhật quyền cộng tác viên. Vui lòng thử lại.',
        });
    }
});

/**
 * Export collection as ZIP file
 */
/**
 * Track collection share - Create notification for collection owner
 * POST /api/collections/:collectionId/share
 */
export const trackCollectionShare = asyncHandler(async (req, res) => {
    try {
        const { collectionId } = req.params;
        const userId = req.user._id;

        // Find collection
        const collection = await Collection.findById(collectionId)
            .populate('createdBy', '_id')
            .lean();

        if (!collection) {
            return res.status(404).json({
                success: false,
                message: 'Collection not found',
            });
        }

        // Don't notify if user is sharing their own collection
        const createdBy = typeof collection.createdBy === 'object' 
            ? collection.createdBy._id 
            : collection.createdBy;

        if (createdBy.toString() === userId.toString()) {
            return res.json({
                success: true,
                message: 'Collection share tracked (no notification for own collection)',
            });
        }

        // Create notification for collection owner
        await Notification.create({
            recipient: createdBy,
            type: 'collection_shared',
            collection: collectionId,
            actor: userId,
            metadata: {
                collectionName: collection.name,
            },
        });

        res.json({
            success: true,
            message: 'Collection share tracked',
        });
    } catch (error) {
        logger.error('Error tracking collection share:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to track collection share',
        });
    }
});

export const exportCollection = asyncHandler(async (req, res) => {
    const { collectionId } = req.params;
    const userId = req.user._id;

    // Find collection and verify ownership or public access
    const collection = await Collection.findOne({
        _id: collectionId,
        $or: [
            { createdBy: userId },
            { isPublic: true },
        ],
    }).populate('images', 'imageUrl imageTitle');

    if (!collection) {
        return res.status(404).json({
            success: false,
            message: 'Không tìm thấy bộ sưu tập',
        });
    }

    if (!collection.images || collection.images.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Bộ sưu tập không có ảnh nào để xuất',
        });
    }

    try {
        const zip = new JSZip();
        const imagePromises = [];

        // Fetch all images and add to ZIP
        for (let i = 0; i < collection.images.length; i++) {
            const image = collection.images[i];
            const imageUrl = image.imageUrl || image.regularUrl || image.smallUrl;
            
            if (!imageUrl) {
                logger.warn(`Image ${image._id} has no URL, skipping`);
                continue;
            }

            // Fetch image using axios
            const fetchPromise = axios.get(imageUrl, {
                responseType: 'arraybuffer',
                timeout: 30000, // 30 second timeout per image
            })
                .then(response => {
                    return Buffer.from(response.data);
                })
                .then(buffer => {
                    // Generate safe filename
                    const sanitizedTitle = (image.imageTitle || `image-${i + 1}`)
                        .replace(/[^a-z0-9]/gi, '_')
                        .toLowerCase()
                        .substring(0, 50);
                    
                    // Get file extension from URL or default to jpg
                    const urlExtension = imageUrl.match(/\.([a-z]+)(?:\?|$)/i)?.[1] || 'jpg';
                    const filename = `${sanitizedTitle}.${urlExtension}`;
                    
                    // Add to ZIP
                    zip.file(filename, buffer);
                })
                .catch(error => {
                    logger.error(`Failed to fetch image ${image._id}:`, error);
                    // Continue with other images even if one fails
                });

            imagePromises.push(fetchPromise);
        }

        // Wait for all images to be fetched
        await Promise.all(imagePromises);

        // Generate ZIP file
        const zipBuffer = await zip.generateAsync({
            type: 'nodebuffer',
            compression: 'DEFLATE',
            compressionOptions: { level: 6 },
        });

        // Set response headers
        const safeCollectionName = collection.name
            .replace(/[^a-z0-9]/gi, '_')
            .toLowerCase()
            .substring(0, 50);
        const filename = `${safeCollectionName}_${Date.now()}.zip`;

        // Set headers (CORS middleware should handle CORS headers, but set explicitly for blob responses)
        const origin = req.headers.origin;
        if (origin) {
            res.setHeader('Access-Control-Allow-Origin', origin);
            res.setHeader('Access-Control-Allow-Credentials', 'true');
        }
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
        res.setHeader('Content-Length', zipBuffer.length);
        res.setHeader('Cache-Control', 'no-cache');

        // Send ZIP file with 200 status
        res.status(200).send(Buffer.from(zipBuffer));
    } catch (error) {
        logger.error('Error exporting collection:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi xuất bộ sưu tập. Vui lòng thử lại.',
        });
    }
});


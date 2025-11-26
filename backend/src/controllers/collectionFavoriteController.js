import { asyncHandler } from '../middlewares/asyncHandler.js';
import User from '../models/User.js';
import Collection from '../models/Collection.js';
import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';

/**
 * Toggle favorite status for a collection
 * POST /api/collection-favorites/:collectionId
 */
export const toggleCollectionFavorite = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { collectionId } = req.params;

    // Validate collection exists
    const collection = await Collection.findById(collectionId);
    if (!collection) {
        return res.status(404).json({
            success: false,
            message: 'Collection not found',
            errorCode: 'COLLECTION_NOT_FOUND',
        });
    }

    // Get user with favorite collections
    const user = await User.findById(userId);
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found',
            errorCode: 'USER_NOT_FOUND',
        });
    }

    // Check if already favorited
    const isFavorited = user.favoriteCollections?.some(
        favId => favId.toString() === collectionId
    ) || false;

    let updatedUser;
    if (isFavorited) {
        // Remove from favorites
        updatedUser = await User.findByIdAndUpdate(
            userId,
            { $pull: { favoriteCollections: collectionId } },
            { new: true }
        ).select('favoriteCollections');
        
        logger.info('Collection removed from favorites', {
            userId,
            collectionId,
        });
    } else {
        // Add to favorites
        updatedUser = await User.findByIdAndUpdate(
            userId,
            { $addToSet: { favoriteCollections: collectionId } },
            { new: true }
        ).select('favoriteCollections');
        
        logger.info('Collection added to favorites', {
            userId,
            collectionId,
        });
    }

    res.status(200).json({
        success: true,
        isFavorited: !isFavorited,
        message: !isFavorited 
            ? 'Collection added to favorites' 
            : 'Collection removed from favorites',
    });
});

/**
 * Get user's favorite collections
 * GET /api/collection-favorites
 */
export const getFavoriteCollections = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 20), 100);
    const skip = (page - 1) * limit;

    // Get user with favorite collections
    const user = await User.findById(userId).select('favoriteCollections');
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found',
            errorCode: 'USER_NOT_FOUND',
        });
    }

    const favoriteIds = user.favoriteCollections || [];
    const total = favoriteIds.length;

    // Get favorite collections with pagination
    const collections = await Collection.find({
        _id: { $in: favoriteIds },
    })
        .populate('createdBy', 'username displayName avatarUrl')
        .populate('coverImage', 'imageUrl regularUrl smallUrl')
        .populate('images', 'imageUrl regularUrl smallUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    res.status(200).json({
        success: true,
        collections,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
        },
    });
});

/**
 * Check if collections are favorited by user
 * POST /api/collection-favorites/check
 * Body: { collectionIds: [string] }
 */
export const checkCollectionFavorites = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { collectionIds } = req.body;

    if (!Array.isArray(collectionIds) || collectionIds.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'collectionIds must be a non-empty array',
            errorCode: 'INVALID_INPUT',
        });
    }

    // Validate MongoDB ObjectId format for all collectionIds
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    const validCollectionIds = [];
    const invalidCollectionIds = [];

    collectionIds.forEach((collectionId) => {
        const idString = String(collectionId).trim();
        const matchesRegex = objectIdRegex.test(idString);
        const isValidMongoose = mongoose.Types.ObjectId.isValid(idString);
        
        if (matchesRegex && isValidMongoose) {
            validCollectionIds.push(idString);
        } else {
            invalidCollectionIds.push(idString);
            logger.warn('Invalid collectionId format in checkCollectionFavorites', { collectionId: idString });
        }
    });

    if (validCollectionIds.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'All collectionIds must be valid MongoDB ObjectIds',
            errorCode: 'INVALID_ID',
            invalidIds: invalidCollectionIds,
        });
    }

    // Get user with favorite collections
    const user = await User.findById(userId).select('favoriteCollections');
    if (!user) {
        return res.status(404).json({
            success: false,
            message: 'User not found',
            errorCode: 'USER_NOT_FOUND',
        });
    }

    const favoriteIds = (user.favoriteCollections || []).map(id => id.toString());
    
    // Create map of favorited collection IDs
    const favoritesMap = {};
    validCollectionIds.forEach(collectionId => {
        favoritesMap[collectionId] = favoriteIds.some(favId => favId === collectionId || String(favId) === String(collectionId));
    });

    // Include invalid IDs as false in the response
    invalidCollectionIds.forEach(collectionId => {
        favoritesMap[collectionId] = false;
    });

    res.status(200).json({
        success: true,
        favorites: favoritesMap,
    });
});


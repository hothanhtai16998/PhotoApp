import Image from '../models/Image.js';
import Category from '../models/Category.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { logger } from '../utils/logger.js';

/**
 * Generate search suggestions based on query
 * Returns suggestions from:
 * - Image titles (fuzzy matching)
 * - Tags
 * - Locations
 * - Categories
 */
export const getSearchSuggestions = asyncHandler(async (req, res) => {
    const query = req.query.q?.trim() || '';
    const limit = Math.min(parseInt(req.query.limit) || 10, 20); // Max 20 suggestions

    if (!query || query.length < 1) {
        // If no query, return popular searches or empty
        return res.status(200).json({
            suggestions: [],
            popular: [],
        });
    }

    const suggestions = [];
    const seen = new Set(); // To avoid duplicates

    try {
        // 1. Search in image titles (fuzzy match)
        const titleMatches = await Image.find({
            imageTitle: { $regex: new RegExp(query, 'i') },
            moderationStatus: 'approved', // Only show approved images
        })
            .select('imageTitle')
            .limit(5)
            .lean();

        titleMatches.forEach(img => {
            const title = img.imageTitle.trim();
            if (title && !seen.has(title.toLowerCase())) {
                suggestions.push({
                    type: 'title',
                    text: title,
                    query: title,
                });
                seen.add(title.toLowerCase());
            }
        });

        // 2. Search in tags
        const tagMatches = await Image.aggregate([
            {
                $match: {
                    tags: { $regex: new RegExp(query, 'i') },
                    moderationStatus: 'approved',
                },
            },
            { $unwind: '$tags' },
            {
                $match: {
                    tags: { $regex: new RegExp(query, 'i') },
                },
            },
            {
                $group: {
                    _id: '$tags',
                    count: { $sum: 1 },
                },
            },
            { $sort: { count: -1 } },
            { $limit: 5 },
        ]);

        tagMatches.forEach(tag => {
            const tagText = tag._id.trim();
            if (tagText && !seen.has(tagText.toLowerCase())) {
                suggestions.push({
                    type: 'tag',
                    text: tagText,
                    query: tagText,
                });
                seen.add(tagText.toLowerCase());
            }
        });

        // 3. Search in locations
        const locationMatches = await Image.distinct('location', {
            location: { $regex: new RegExp(query, 'i') },
            moderationStatus: 'approved',
        });

        locationMatches
            .filter(location => location && location.trim())
            .slice(0, 5)
            .forEach(location => {
                const locationText = location.trim();
                if (!seen.has(locationText.toLowerCase())) {
                    suggestions.push({
                        type: 'location',
                        text: locationText,
                        query: locationText,
                    });
                    seen.add(locationText.toLowerCase());
                }
            });

        // 4. Search in categories
        const categoryMatches = await Category.find({
            name: { $regex: new RegExp(query, 'i') },
            isActive: true,
        })
            .select('name')
            .limit(3)
            .lean();

        categoryMatches.forEach(cat => {
            const catName = cat.name.trim();
            if (catName && !seen.has(catName.toLowerCase())) {
                suggestions.push({
                    type: 'category',
                    text: catName,
                    query: catName,
                });
                seen.add(catName.toLowerCase());
            }
        });

        // Sort suggestions: prioritize exact matches, then by type order
        const sortedSuggestions = suggestions
            .sort((a, b) => {
                // Exact match first
                const aExact = a.text.toLowerCase() === query.toLowerCase();
                const bExact = b.text.toLowerCase() === query.toLowerCase();
                if (aExact && !bExact) return -1;
                if (!aExact && bExact) return 1;

                // Then by type priority: category > location > tag > title
                const typeOrder = { category: 0, location: 1, tag: 2, title: 3 };
                return typeOrder[a.type] - typeOrder[b.type];
            })
            .slice(0, limit);

        res.status(200).json({
            suggestions: sortedSuggestions,
            query: query,
        });
    } catch (error) {
        logger.error('Error generating search suggestions:', error);
        res.status(500).json({
            message: 'Failed to generate search suggestions',
            suggestions: [],
        });
    }
});

/**
 * Get popular searches (based on recent search activity)
 * This is a placeholder - can be enhanced with search analytics later
 */
export const getPopularSearches = asyncHandler(async (req, res) => {
    try {
        // For now, return popular tags and categories
        // In the future, this can be based on actual search query analytics
        
        const popularTags = await Image.aggregate([
            {
                $match: {
                    moderationStatus: 'approved',
                    tags: { $exists: true, $ne: [] },
                },
            },
            { $unwind: '$tags' },
            {
                $group: {
                    _id: '$tags',
                    count: { $sum: 1 },
                },
            },
            { $sort: { count: -1 } },
            { $limit: 10 },
        ]);

        const popularCategories = await Category.find({
            isActive: true,
        })
            .select('name')
            .limit(5)
            .lean();

        const popular = [
            ...popularTags.map(tag => ({
                type: 'tag',
                text: tag._id,
                query: tag._id,
            })),
            ...popularCategories.map(cat => ({
                type: 'category',
                text: cat.name,
                query: cat.name,
            })),
        ].slice(0, 10);

        res.status(200).json({
            popular: popular,
        });
    } catch (error) {
        logger.error('Error getting popular searches:', error);
        res.status(500).json({
            message: 'Failed to get popular searches',
            popular: [],
        });
    }
});


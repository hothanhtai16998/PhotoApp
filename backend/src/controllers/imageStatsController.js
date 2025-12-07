import mongoose from 'mongoose';
import Image from '../models/Image.js';
import UserActivity from '../models/UserActivity.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';

// In-memory rate limiting for anonymous users (lightweight, no database)
// Tracks IP + ImageID + Timestamp to prevent spam
const IP_VIEW_TRACKING = new Map(); // Key: `${ip}:${imageId}`, Value: timestamp
const IP_DOWNLOAD_TRACKING = new Map(); // Key: `${ip}:${imageId}`, Value: timestamp

// Expiration time: 1 hour (matches frontend localStorage expiration)
const EXPIRATION_MS = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Get client IP address from request
 */
const getClientIP = (req) => {
    return req.ip ||
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.connection?.remoteAddress ||
        'unknown';
};

/**
 * Check if IP has viewed/downloaded image within expiration time
 */
const hasIPTracked = (trackingMap, ip, imageId) => {
    const key = `${ip}:${imageId}`;
    const timestamp = trackingMap.get(key);

    if (!timestamp) return false;

    // Check if expired
    if (Date.now() - timestamp > EXPIRATION_MS) {
        trackingMap.delete(key);
        return false;
    }

    return true;
};

/**
 * Mark IP as having viewed/downloaded image
 */
const markIPTracked = (trackingMap, ip, imageId) => {
    const key = `${ip}:${imageId}`;
    trackingMap.set(key, Date.now());
};

/**
 * Auto-cleanup expired entries every 5 minutes
 */
setInterval(() => {
    const now = Date.now();
    let cleanedViews = 0;
    let cleanedDownloads = 0;

    // Cleanup view tracking
    for (const [key, timestamp] of IP_VIEW_TRACKING.entries()) {
        if (now - timestamp > EXPIRATION_MS) {
            IP_VIEW_TRACKING.delete(key);
            cleanedViews++;
        }
    }

    // Cleanup download tracking
    for (const [key, timestamp] of IP_DOWNLOAD_TRACKING.entries()) {
        if (now - timestamp > EXPIRATION_MS) {
            IP_DOWNLOAD_TRACKING.delete(key);
            cleanedDownloads++;
        }
    }

    // Log cleanup if significant
    if (cleanedViews > 0 || cleanedDownloads > 0) {
        console.log(`[IP Rate Limit] Cleaned ${cleanedViews} view entries, ${cleanedDownloads} download entries`);
    }
}, 5 * 60 * 1000); // Every 5 minutes

// Increment view count for an image
export const incrementView = asyncHandler(async (req, res) => {
    const imageId = req.params.imageId;
    const userId = req.user?._id; // Get current user (if authenticated)

    if (!mongoose.Types.ObjectId.isValid(imageId)) {
        return res.status(400).json({ message: 'Invalid image ID' });
    }

    // Get current date in UTC as YYYY-MM-DD string
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0]; // Format: YYYY-MM-DD

    // Check if this user has already viewed this image today
    let isFirstTimeToday = true;
    if (userId) {
        const existingActivity = await UserActivity.findOne({
            userId,
            imageId,
            activityType: 'view',
            date: todayStr,
        });

        isFirstTimeToday = !existingActivity;
    }

    // For anonymous users: Check in-memory IP rate limiting (secondary protection)
    // This prevents spam when localStorage is bypassed (incognito, cleared storage, etc.)
    if (!userId) {
        const clientIP = getClientIP(req);
        if (hasIPTracked(IP_VIEW_TRACKING, clientIP, imageId)) {
            // IP already viewed this image within expiration time, return current stats
            const image = await Image.findById(imageId);
            if (!image) {
                return res.status(404).json({
                    message: 'Không tìm thấy ảnh',
                });
            }

            let dailyViewsObj = {};
            if (image.dailyViews) {
                if (image.dailyViews instanceof Map) {
                    dailyViewsObj = Object.fromEntries(image.dailyViews);
                } else if (typeof image.dailyViews === 'object') {
                    dailyViewsObj = image.dailyViews;
                }
            }

            return res.status(200).json({
                views: image.views,
                dailyViews: dailyViewsObj,
            });
        }
    }

    // Only increment image views if this is the first time today (or if no user)
    if (isFirstTimeToday || !userId) {
        // Increment both total views and daily views on the image
        const image = await Image.findByIdAndUpdate(
            imageId,
            {
                $inc: {
                    views: 1,
                    [`dailyViews.${todayStr}`]: 1,
                },
            },
            { new: true, runValidators: true }
        );

        if (!image) {
            return res.status(404).json({
                message: 'Không tìm thấy ảnh',
            });
        }

        // Track user-specific activity (for profile analytics)
        if (userId) {
            try {
                await UserActivity.findOneAndUpdate(
                    {
                        userId,
                        imageId,
                        activityType: 'view',
                        date: todayStr,
                    },
                    {
                        userId,
                        imageId,
                        activityType: 'view',
                        date: todayStr,
                        isFirstTime: isFirstTimeToday,
                    },
                    {
                        upsert: true,
                        new: true,
                    }
                );
            } catch (error) {
                // Ignore duplicate key errors (shouldn't happen but handle gracefully)
                if (error.code !== 11000) {
                    console.error('Error tracking user activity:', error);
                }
            }
        } else {
            // For anonymous users: Mark IP as having viewed this image (in-memory tracking)
            const clientIP = getClientIP(req);
            markIPTracked(IP_VIEW_TRACKING, clientIP, imageId);
        }

        // Convert dailyViews (Map or plain object) to plain object for JSON response
        let dailyViewsObj = {};
        if (image.dailyViews) {
            if (image.dailyViews instanceof Map) {
                dailyViewsObj = Object.fromEntries(image.dailyViews);
            } else if (typeof image.dailyViews === 'object') {
                dailyViewsObj = image.dailyViews;
            }
        }

        res.status(200).json({
            views: image.views,
            dailyViews: dailyViewsObj,
        });
    } else {
        // User already viewed today, return current image stats without incrementing
        const image = await Image.findById(imageId);
        if (!image) {
            return res.status(404).json({
                message: 'Không tìm thấy ảnh',
            });
        }

        let dailyViewsObj = {};
        if (image.dailyViews) {
            if (image.dailyViews instanceof Map) {
                dailyViewsObj = Object.fromEntries(image.dailyViews);
            } else if (typeof image.dailyViews === 'object') {
                dailyViewsObj = image.dailyViews;
            }
        }

        res.status(200).json({
            views: image.views,
            dailyViews: dailyViewsObj,
        });
    }
});

// Increment download count for an image
export const incrementDownload = asyncHandler(async (req, res) => {
    const imageId = req.params.imageId;
    const userId = req.user?._id; // Get current user (if authenticated)

    if (!mongoose.Types.ObjectId.isValid(imageId)) {
        return res.status(400).json({ message: 'Invalid image ID' });
    }

    // Get current date in UTC as YYYY-MM-DD string
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0]; // Format: YYYY-MM-DD

    // Check if this user has already downloaded this image today
    let isFirstTimeToday = true;
    if (userId) {
        const existingActivity = await UserActivity.findOne({
            userId,
            imageId,
            activityType: 'download',
            date: todayStr,
        });

        isFirstTimeToday = !existingActivity;
    }

    // For anonymous users: Check in-memory IP rate limiting (secondary protection)
    // This prevents spam when localStorage is bypassed (incognito, cleared storage, etc.)
    if (!userId) {
        const clientIP = getClientIP(req);
        if (hasIPTracked(IP_DOWNLOAD_TRACKING, clientIP, imageId)) {
            // IP already downloaded this image within expiration time, return current stats
            const image = await Image.findById(imageId);
            if (!image) {
                return res.status(404).json({
                    message: 'Không tìm thấy ảnh',
                });
            }

            let dailyDownloadsObj = {};
            if (image.dailyDownloads) {
                if (image.dailyDownloads instanceof Map) {
                    dailyDownloadsObj = Object.fromEntries(image.dailyDownloads);
                } else if (typeof image.dailyDownloads === 'object') {
                    dailyDownloadsObj = image.dailyDownloads;
                }
            }

            return res.status(200).json({
                downloads: image.downloads,
                dailyDownloads: dailyDownloadsObj,
            });
        }
    }

    // Only increment image downloads if this is the first time today (or if no user)
    if (isFirstTimeToday || !userId) {
        // Increment both total downloads and daily downloads on the image
        const image = await Image.findByIdAndUpdate(
            imageId,
            {
                $inc: {
                    downloads: 1,
                    [`dailyDownloads.${todayStr}`]: 1,
                },
            },
            { new: true, runValidators: true }
        );

        if (!image) {
            return res.status(404).json({
                message: 'Không tìm thấy ảnh',
            });
        }

        // Track user-specific activity (for profile analytics)
        if (userId) {
            try {
                await UserActivity.findOneAndUpdate(
                    {
                        userId,
                        imageId,
                        activityType: 'download',
                        date: todayStr,
                    },
                    {
                        userId,
                        imageId,
                        activityType: 'download',
                        date: todayStr,
                        isFirstTime: isFirstTimeToday,
                    },
                    {
                        upsert: true,
                        new: true,
                    }
                );
            } catch (error) {
                // Ignore duplicate key errors (shouldn't happen but handle gracefully)
                if (error.code !== 11000) {
                    console.error('Error tracking user activity:', error);
                }
            }
        } else {
            // For anonymous users: Mark IP as having downloaded this image (in-memory tracking)
            const clientIP = getClientIP(req);
            markIPTracked(IP_DOWNLOAD_TRACKING, clientIP, imageId);
        }

        // Convert dailyDownloads (Map or plain object) to plain object for JSON response
        let dailyDownloadsObj = {};
        if (image.dailyDownloads) {
            if (image.dailyDownloads instanceof Map) {
                dailyDownloadsObj = Object.fromEntries(image.dailyDownloads);
            } else if (typeof image.dailyDownloads === 'object') {
                dailyDownloadsObj = image.dailyDownloads;
            }
        }

        res.status(200).json({
            downloads: image.downloads,
            dailyDownloads: dailyDownloadsObj,
        });
    } else {
        // User already downloaded today, return current image stats without incrementing
        const image = await Image.findById(imageId);
        if (!image) {
            return res.status(404).json({
                message: 'Không tìm thấy ảnh',
            });
        }

        let dailyDownloadsObj = {};
        if (image.dailyDownloads) {
            if (image.dailyDownloads instanceof Map) {
                dailyDownloadsObj = Object.fromEntries(image.dailyDownloads);
            } else if (typeof image.dailyDownloads === 'object') {
                dailyDownloadsObj = image.dailyDownloads;
            }
        }

        res.status(200).json({
            downloads: image.downloads,
            dailyDownloads: dailyDownloadsObj,
        });
    }
});


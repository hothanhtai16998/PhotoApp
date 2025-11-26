import User from '../models/User.js';
import Image from '../models/Image.js';
import AdminRole from '../models/AdminRole.js';
import Category from '../models/Category.js';
import Collection from '../models/Collection.js';
import PageView from '../models/PageView.js';
import Session from '../models/Session.js';
import SystemLog from '../models/SystemLog.js';
import Settings from '../models/Settings.js';
import Notification from '../models/Notification.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { logger } from '../utils/logger.js';
import { deleteImageFromS3 } from '../libs/s3.js';
import { PERMISSIONS } from '../middlewares/permissionMiddleware.js';
import { clearCache } from '../middlewares/cacheMiddleware.js';
import { logPermissionChange, getClientIp } from '../utils/auditLogger.js';
import { validatePermissionsForRole, applyRoleInheritance } from '../utils/permissionValidator.js';
import { invalidateUserCache, getCacheStats as getPermissionCacheStats, clearAllCache } from '../utils/permissionCache.js';

// Statistics
export const getDashboardStats = asyncHandler(async (req, res) => {
    // Permission check is handled by requirePermission('viewDashboard') middleware
    const [totalUsers, totalImages, recentUsers, recentImages] = await Promise.all([
        User.countDocuments(),
        Image.countDocuments(),
        User.find().sort({ createdAt: -1 }).limit(5).select('username email displayName createdAt isAdmin').lean(),
        Image.find().sort({ createdAt: -1 }).limit(10).populate('uploadedBy', 'username displayName').populate('imageCategory', 'name').select('imageTitle imageCategory createdAt uploadedBy').lean(),
    ]);

    // Count images by category (using lookup to get category names)
    const categoryStats = await Image.aggregate([
        { $group: { _id: '$imageCategory', count: { $sum: 1 } } },
        {
            $lookup: {
                from: 'categories',
                localField: '_id',
                foreignField: '_id',
                as: 'category'
            }
        },
        { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
        {
            $project: {
                _id: 1,
                count: 1,
                name: { $ifNull: ['$category.name', 'Unknown'] }
            }
        },
        { $sort: { count: -1 } },
        { $limit: 10 },
    ]);

    res.status(200).json({
        stats: {
            totalUsers,
            totalImages,
            categoryStats,
        },
        recentUsers,
        recentImages,
    });
});

// User Management
export const getAllUsers = asyncHandler(async (req, res) => {
    // Permission check is handled by requirePermission('viewUsers') middleware
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 20), 100);
    const skip = (page - 1) * limit;
    const search = req.query.search?.trim();

    const query = {};
    if (search) {
        query.$or = [
            { username: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
            { displayName: { $regex: search, $options: 'i' } },
        ];
    }

    const [users, total] = await Promise.all([
        User.find(query)
            .select('-hashedPassword')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        User.countDocuments(query),
    ]);

    res.status(200).json({
        users,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
        },
    });
});

export const getUserById = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const user = await User.findById(userId).select('-hashedPassword').lean();

    if (!user) {
        return res.status(404).json({
            message: 'Không tìm thấy tên tài khoản',
        });
    }

    // Get user's image count
    const imageCount = await Image.countDocuments({ uploadedBy: userId });

    res.status(200).json({
        user: {
            ...user,
            imageCount,
        },
    });
});

export const updateUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { displayName, email, bio } = req.body;

    // Permission check is handled by requirePermission('editUsers') middleware

    const user = await User.findById(userId);

    if (!user) {
        return res.status(404).json({
            message: 'Không tìm thấy tên tài khoản',
        });
    }

    // Prevent non-super admins from updating super admin users (compute from AdminRole)
    const { computeAdminStatus } = await import('../utils/adminUtils.js');
    const targetUserStatus = await computeAdminStatus(userId);

    if (targetUserStatus.isSuperAdmin && !req.user.isSuperAdmin) {
        return res.status(403).json({
            message: 'Quyền truy cập bị từ chối: cần quyền Super admin',
        });
    }

    const updateData = {};

    if (displayName !== undefined) {
        updateData.displayName = displayName.trim();
    }

    if (email !== undefined && email !== user.email) {
        const existingUser = await User.findOne({
            email: email.toLowerCase().trim(),
            _id: { $ne: userId },
        });

        if (existingUser) {
            return res.status(400).json({
                message: 'Email đã tồn tại',
            });
        }

        updateData.email = email.toLowerCase().trim();
    }

    if (bio !== undefined) {
        updateData.bio = bio.trim() || undefined;
    }

    // isAdmin and isSuperAdmin should not be updated through this endpoint
    // Admin roles should be managed through the AdminRole system only

    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
        new: true,
        runValidators: true,
    }).select('-hashedPassword');

    res.status(200).json({
        message: 'Cập nhật thành công',
        user: updatedUser,
    });
});

export const deleteUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    // Permission check is handled by requirePermission('deleteUsers') middleware

    const user = await User.findById(userId);

    if (!user) {
        return res.status(404).json({
            message: 'Không tìm thấy tên tài khoản',
        });
    }

    // Prevent deleting yourself
    if (userId === req.user._id.toString()) {
        return res.status(400).json({
            message: 'Không thể xóa tài khoản của bạn',
        });
    }

    // Prevent non-super admins from deleting super admin users (compute from AdminRole)
    const { computeAdminStatus: computeTargetStatus } = await import('../utils/adminUtils.js');
    const targetUserStatus = await computeTargetStatus(userId);

    if (targetUserStatus.isSuperAdmin && !req.user.isSuperAdmin) {
        return res.status(403).json({
            message: 'Quyền truy cập bị từ chối: cần quyền Super admin',
        });
    }

    // Get all user's images
    const userImages = await Image.find({ uploadedBy: userId }).select('publicId');

    // Delete images from S3
    for (const image of userImages) {
        try {
            await deleteImageFromS3(image.publicId, 'photo-app-images');
        } catch (error) {
            logger.warn(`Lỗi không thể xoá ảnh ${image.publicId} từ S3:`, error);
        }
    }

    // Delete images from database
    await Image.deleteMany({ uploadedBy: userId });

    // Delete user
    await User.findByIdAndDelete(userId);

    res.status(200).json({
        message: 'Xoá tài khoản thành công',
    });
});

// Ban/Unban Users
export const banUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { reason } = req.body;

    // Permission check is handled by requirePermission('banUsers') middleware

    const user = await User.findById(userId);

    if (!user) {
        return res.status(404).json({
            message: 'Không tìm thấy tên tài khoản',
        });
    }

    // Prevent banning yourself
    if (userId === req.user._id.toString()) {
        return res.status(400).json({
            message: 'Không thể cấm tài khoản của bạn',
        });
    }

    // Prevent non-super admins from banning super admin users
    const { computeAdminStatus } = await import('../utils/adminUtils.js');
    const targetUserStatus = await computeAdminStatus(userId);

    if (targetUserStatus.isSuperAdmin && !req.user.isSuperAdmin) {
        return res.status(403).json({
            message: 'Quyền truy cập bị từ chối: cần quyền Super admin',
        });
    }

    // Ban user
    user.isBanned = true;
    user.bannedAt = new Date();
    user.bannedBy = req.user._id;
    user.banReason = reason?.trim() || 'Không có lý do';
    await user.save();

    // Create account_banned notification
    try {
        await Notification.create({
            recipient: userId,
            type: 'account_banned',
            actor: req.user._id,
            metadata: {
                reason: user.banReason,
                bannedBy: req.user.displayName || req.user.username,
            },
        });
    } catch (notifError) {
        logger.error('Failed to create account banned notification:', notifError);
        // Don't fail the ban if notification fails
    }

    res.status(200).json({
        message: 'Cấm người dùng thành công',
        user: {
            _id: user._id,
            username: user.username,
            displayName: user.displayName,
            isBanned: user.isBanned,
            bannedAt: user.bannedAt,
            banReason: user.banReason,
        },
    });
});

export const unbanUser = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    // Permission check is handled by requirePermission('unbanUsers') middleware

    const user = await User.findById(userId);

    if (!user) {
        return res.status(404).json({
            message: 'Không tìm thấy tên tài khoản',
        });
    }

    if (!user.isBanned) {
        return res.status(400).json({
            message: 'Người dùng này không bị cấm',
        });
    }

    // Unban user
    user.isBanned = false;
    user.bannedAt = undefined;
    user.bannedBy = undefined;
    user.banReason = undefined;
    await user.save();

    res.status(200).json({
        message: 'Bỏ cấm người dùng thành công',
        user: {
            _id: user._id,
            username: user.username,
            displayName: user.displayName,
            isBanned: user.isBanned,
        },
    });
});

// Image Management
export const getAllImagesAdmin = asyncHandler(async (req, res) => {
    // Permission check is handled by requirePermission('viewImages') middleware

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 20), 100);
    const skip = (page - 1) * limit;
    const search = req.query.search?.trim();
    const category = req.query.category?.trim();
    const userId = req.query.userId?.trim();

    const query = {};

    if (search) {
        query.$or = [
            { imageTitle: { $regex: search, $options: 'i' } },
            { location: { $regex: search, $options: 'i' } },
        ];
    }

    if (category) {
        // Find category by name (case-insensitive)
        const categoryDoc = await Category.findOne({
            name: { $regex: new RegExp(`^${category}$`, 'i') },
            isActive: true,
        });
        if (categoryDoc) {
            // Strictly match only this category ID
            query.imageCategory = categoryDoc._id;
        } else {
            // If category not found, return empty results
            return res.status(200).json({
                images: [],
                pagination: {
                    page,
                    limit,
                    total: 0,
                    pages: 0,
                },
            });
        }
    }
    // Always ensure imageCategory exists and is not null (even when no category filter)
    // This prevents images with invalid/null categories from appearing
    if (!query.imageCategory) {
        query.imageCategory = { $exists: true, $ne: null };
    }

    if (userId) {
        query.uploadedBy = userId;
    }

    const [imagesRaw, total] = await Promise.all([
        Image.find(query)
            .populate('uploadedBy', 'username displayName email')
            .populate('imageCategory', 'name description')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Image.countDocuments(query),
    ]);

    // Handle images with invalid or missing category references
    let images = imagesRaw.map(img => ({
        ...img,
        // Ensure imageCategory is either an object with name or null
        imageCategory: (img.imageCategory && typeof img.imageCategory === 'object' && img.imageCategory.name)
            ? img.imageCategory
            : null
    }));

    // Additional validation: If category filter was applied, ensure populated category name matches
    // This catches any edge cases where ObjectId might match but category name doesn't
    // This is a safety net to ensure images only appear in their correct category
    if (category) {
        images = images.filter(img => {
            if (!img.imageCategory || typeof img.imageCategory !== 'object' || !img.imageCategory.name) {
                return false; // Filter out images with invalid categories
            }
            // Case-insensitive match to ensure exact category match
            return img.imageCategory.name.toLowerCase() === category.toLowerCase();
        });
    }

    res.status(200).json({
        images,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
        },
    });
});

export const deleteImage = asyncHandler(async (req, res) => {
    const { imageId } = req.params;

    // Permission check is handled by requirePermission('deleteImages') middleware

    const image = await Image.findById(imageId);

    if (!image) {
        return res.status(404).json({
            message: 'Không tìm thấy ảnh',
        });
    }

    // Delete from S3
    try {
        await deleteImageFromS3(image.publicId, 'photo-app-images');
    } catch (error) {
        logger.warn(`Lỗi không thể xoá ảnh ${image.publicId} từ S3:`, error);
    }

    // Remove image from all users' favorites
    await User.updateMany(
        { favorites: imageId },
        { $pull: { favorites: imageId } }
    );

    // Create image_removed notification for image owner
    if (image.uploadedBy) {
        try {
            await Notification.create({
                recipient: image.uploadedBy,
                type: 'image_removed',
                image: imageId,
                actor: req.user._id,
                metadata: {
                    imageTitle: image.imageTitle,
                    reason: 'Removed by admin',
                },
            });
        } catch (notifError) {
            logger.error('Failed to create image removed notification:', notifError);
            // Don't fail the deletion if notification fails
        }
    }

    // Delete from database
    await Image.findByIdAndDelete(imageId);

    // Clear ALL cache entries for images endpoint (including all query variations)
    // This ensures deleted image doesn't appear in any cached responses
    clearCache('/api/images');

    res.status(200).json({
        message: 'Xoá ảnh thành công',
    });
});

// Update image (location, title, etc.)
export const updateImage = asyncHandler(async (req, res) => {
    const { imageId } = req.params;
    const { location, coordinates, imageTitle, cameraModel } = req.body;

    // Permission check is handled by requirePermission('editImages') middleware

    const image = await Image.findById(imageId);

    if (!image) {
        return res.status(404).json({
            message: 'Không tìm thấy ảnh',
        });
    }

    // Build update object
    const updateData = {};

    if (location !== undefined) {
        updateData.location = location?.trim() || null;
    }

    if (coordinates !== undefined) {
        // Parse and validate coordinates if provided
        let parsedCoordinates;
        if (coordinates) {
            try {
                parsedCoordinates = typeof coordinates === 'string' ? JSON.parse(coordinates) : coordinates;
                if (parsedCoordinates.latitude && parsedCoordinates.longitude) {
                    const lat = parseFloat(parsedCoordinates.latitude);
                    const lng = parseFloat(parsedCoordinates.longitude);
                    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                        updateData.coordinates = { latitude: lat, longitude: lng };
                    }
                }
            } catch (error) {
                logger.warn('Invalid coordinates format:', error);
            }
        } else {
            updateData.coordinates = null;
        }
    }

    if (imageTitle !== undefined) {
        updateData.imageTitle = imageTitle?.trim() || image.imageTitle;
    }

    if (cameraModel !== undefined) {
        updateData.cameraModel = cameraModel?.trim() || null;
    }

    // Update image
    const updatedImage = await Image.findByIdAndUpdate(
        imageId,
        { $set: updateData },
        { new: true, runValidators: true }
    )
        .populate('uploadedBy', 'username displayName avatarUrl')
        .populate('imageCategory', 'name description')
        .lean();

    // Clear cache for images endpoint
    clearCache('/api/images');

    res.status(200).json({
        message: 'Cập nhật ảnh thành công',
        image: updatedImage,
    });
});

// Moderate Image
export const moderateImage = asyncHandler(async (req, res) => {
    const { imageId } = req.params;
    const { status, notes } = req.body; // status: 'approved', 'rejected', 'flagged'

    // Permission check is handled by requirePermission('moderateImages') middleware

    if (!['approved', 'rejected', 'flagged'].includes(status)) {
        return res.status(400).json({
            message: 'Trạng thái kiểm duyệt không hợp lệ. Phải là: approved, rejected, hoặc flagged',
        });
    }

    const image = await Image.findById(imageId);

    if (!image) {
        return res.status(404).json({
            message: 'Không tìm thấy ảnh',
        });
    }

    // Update moderation status
    image.isModerated = true;
    image.moderationStatus = status;
    image.moderatedAt = new Date();
    image.moderatedBy = req.user._id;
    image.moderationNotes = notes?.trim() || undefined;
    await image.save();

    res.status(200).json({
        message: 'Kiểm duyệt ảnh thành công',
        image: {
            _id: image._id,
            imageTitle: image.imageTitle,
            moderationStatus: image.moderationStatus,
            moderatedAt: image.moderatedAt,
            moderationNotes: image.moderationNotes,
        },
    });
});

// Analytics
export const getAnalytics = asyncHandler(async (req, res) => {
    // Permission check is handled by requirePermission('viewAnalytics') middleware

    // Get date range from query (default to last 30 days)
    const days = parseInt(req.query.days) || 30;
    const now = new Date();

    // For Vietnam timezone (UTC+7), we need to adjust the date range
    // Vietnam "today" in UTC terms: from 17:00 UTC yesterday to 16:59:59 UTC today
    // To include all of today, we'll use "now + 1 day" as the upper bound
    // This ensures any record created "today" in Vietnam timezone is included

    // Start date: (days) days ago
    // We'll use a simple approach: subtract days from now, set to start of that day in UTC
    // Then adjust for Vietnam timezone offset
    const startDateUTC = new Date(now);
    startDateUTC.setUTCDate(startDateUTC.getUTCDate() - days);
    startDateUTC.setUTCHours(0, 0, 0, 0);

    // End date: Use now + 24 hours to ensure we include all of today in Vietnam timezone
    const endDateUTC = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Calculate comparison period (previous period of same length)
    const comparisonStartDateUTC = new Date(startDateUTC);
    comparisonStartDateUTC.setUTCDate(comparisonStartDateUTC.getUTCDate() - days);

    const comparisonEndDateUTC = new Date(startDateUTC);
    comparisonEndDateUTC.setUTCMilliseconds(comparisonEndDateUTC.getUTCMilliseconds() - 1);

    // User analytics
    const totalUsers = await User.countDocuments();
    const newUsers = await User.countDocuments({ createdAt: { $gte: startDateUTC } });
    const bannedUsers = await User.countDocuments({ isBanned: true });

    // Image analytics
    const totalImages = await Image.countDocuments();
    const newImages = await Image.countDocuments({ createdAt: { $gte: startDateUTC } });
    const moderatedImages = await Image.countDocuments({ isModerated: true });
    const pendingModeration = await Image.countDocuments({ moderationStatus: 'pending' });
    const approvedImages = await Image.countDocuments({ moderationStatus: 'approved' });
    const rejectedImages = await Image.countDocuments({ moderationStatus: 'rejected' });
    const flaggedImages = await Image.countDocuments({ moderationStatus: 'flagged' });

    // Category analytics
    const categoryStats = await Image.aggregate([
        { $group: { _id: '$imageCategory', count: { $sum: 1 } } },
        {
            $lookup: {
                from: 'categories',
                localField: '_id',
                foreignField: '_id',
                as: 'category'
            }
        },
        { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
        {
            $project: {
                _id: 1,
                count: 1,
                name: { $ifNull: ['$category.name', 'Unknown'] }
            }
        },
        { $sort: { count: -1 } },
    ]);

    // Daily uploads for the last 30 days (current period)
    const dailyUploads = await Image.aggregate([
        { $match: { createdAt: { $gte: startDateUTC, $lte: endDateUTC } } },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Ho_Chi_Minh' } },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } },
    ]);

    // Daily uploads for comparison period (previous period)
    const dailyUploadsComparison = await Image.aggregate([
        { $match: { createdAt: { $gte: comparisonStartDateUTC, $lte: comparisonEndDateUTC } } },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Ho_Chi_Minh' } },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } },
    ]);

    // Daily users for trend chart (current period)
    const dailyUsers = await User.aggregate([
        { $match: { createdAt: { $gte: startDateUTC, $lte: endDateUTC } } },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Ho_Chi_Minh' } },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } },
    ]);

    // Daily users for comparison period (previous period)
    const dailyUsersComparison = await User.aggregate([
        { $match: { createdAt: { $gte: comparisonStartDateUTC, $lte: comparisonEndDateUTC } } },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Ho_Chi_Minh' } },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } },
    ]);

    // Daily pending images for trend chart (current period)
    const dailyPending = await Image.aggregate([
        {
            $match: {
                createdAt: { $gte: startDateUTC, $lte: endDateUTC },
                moderationStatus: 'pending'
            }
        },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Ho_Chi_Minh' } },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } },
    ]);

    // Daily pending images for comparison period
    const dailyPendingComparison = await Image.aggregate([
        {
            $match: {
                createdAt: { $gte: comparisonStartDateUTC, $lte: comparisonEndDateUTC },
                moderationStatus: 'pending'
            }
        },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Ho_Chi_Minh' } },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } },
    ]);

    // Daily approved images for trend chart (current period)
    const dailyApproved = await Image.aggregate([
        {
            $match: {
                createdAt: { $gte: startDateUTC, $lte: endDateUTC },
                moderationStatus: 'approved'
            }
        },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Ho_Chi_Minh' } },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } },
    ]);

    // Daily approved images for comparison period
    const dailyApprovedComparison = await Image.aggregate([
        {
            $match: {
                createdAt: { $gte: comparisonStartDateUTC, $lte: comparisonEndDateUTC },
                moderationStatus: 'approved'
            }
        },
        {
            $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Ho_Chi_Minh' } },
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } },
    ]);

    // Top uploaders
    const topUploaders = await Image.aggregate([
        { $match: { createdAt: { $gte: startDateUTC } } },
        { $group: { _id: '$uploadedBy', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        {
            $lookup: {
                from: 'users',
                localField: '_id',
                foreignField: '_id',
                as: 'user'
            }
        },
        { $unwind: '$user' },
        {
            $project: {
                userId: '$_id',
                username: '$user.username',
                displayName: '$user.displayName',
                uploadCount: '$count'
            }
        },
    ]);

    res.status(200).json({
        period: {
            days,
            startDate: startDateUTC,
            endDate: endDateUTC,
        },
        users: {
            total: totalUsers,
            new: newUsers,
            banned: bannedUsers,
        },
        images: {
            total: totalImages,
            new: newImages,
            moderated: moderatedImages,
            pendingModeration,
            approved: approvedImages,
            rejected: rejectedImages,
            flagged: flaggedImages,
        },
        categories: categoryStats,
        dailyUploads,
        dailyUploadsComparison,
        dailyUsers,
        dailyUsersComparison,
        dailyPending,
        dailyPendingComparison,
        dailyApproved,
        dailyApprovedComparison,
        topUploaders,
    });
});

// Real-time Analytics
export const getRealtimeAnalytics = asyncHandler(async (req, res) => {
    // Permission check is handled by requirePermission('viewAnalytics') middleware

    // Get users online (users who have viewed a page in the last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const activeUsers = await PageView.distinct('userId', {
        timestamp: { $gte: fiveMinutesAgo },
        userId: { $exists: true, $ne: null }, // Only count authenticated users
    });

    const usersOnline = activeUsers.length;

    // Get page views in the last 60 seconds (for "pages views / second" chart)
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const recentPageViews = await PageView.find({
        timestamp: { $gte: oneMinuteAgo },
    }).sort({ timestamp: 1 }).lean();

    // Group by second for the chart
    const viewsPerSecond = {};
    recentPageViews.forEach((view) => {
        const timestamp = view.timestamp instanceof Date ? view.timestamp : new Date(view.timestamp);
        const second = Math.floor(timestamp.getTime() / 1000);
        viewsPerSecond[second] = (viewsPerSecond[second] || 0) + 1;
    });

    // Convert to array format for chart
    const viewsPerSecondData = Object.entries(viewsPerSecond)
        .map(([second, count]) => ({
            second: parseInt(second),
            count: count,
        }))
        .sort((a, b) => a.second - b.second)
        .slice(-60); // Last 60 seconds

    // Get most active pages (last 5 minutes)
    const mostActivePages = await PageView.aggregate([
        {
            $match: {
                timestamp: { $gte: fiveMinutesAgo },
            },
        },
        {
            $group: {
                _id: '$path',
                userCount: { $addToSet: '$userId' }, // Unique users per page
            },
        },
        {
            $project: {
                path: '$_id',
                userCount: { $size: '$userCount' },
            },
        },
        { $sort: { userCount: -1 } },
        { $limit: 6 },
    ]);

    res.status(200).json({
        usersOnline,
        viewsPerSecond: viewsPerSecondData,
        mostActivePages: mostActivePages.map((page) => ({
            path: page.path,
            userCount: page.userCount,
        })),
    });
});

// Track page view (called from frontend)
export const trackPageView = asyncHandler(async (req, res) => {
    const { path } = req.body;
    const userId = req.user?._id || null;
    const sessionId = req.headers['x-session-id'] || req.cookies?.sessionId || null;

    if (!path) {
        return res.status(400).json({
            message: 'Path is required',
        });
    }

    // Create page view record
    await PageView.create({
        userId: userId || undefined,
        path: path,
        sessionId: sessionId || undefined,
        timestamp: new Date(),
    });

    res.status(200).json({
        message: 'Page view tracked',
    });
});

// Admin Role Management (Only Super Admin)
export const getAllAdminRoles = asyncHandler(async (req, res) => {
    // Permission check is handled by requirePermission('viewAdmins') middleware

    const adminRoles = await AdminRole.find()
        .populate('userId', 'username email displayName')
        .populate('grantedBy', 'username displayName')
        .sort({ createdAt: -1 })
        .lean();

    // Filter out any admin roles for super admin users (check via AdminRole)
    // Super admins should have role === 'super_admin' in AdminRole
    const filteredRoles = adminRoles.filter(role => {
        // Super admin role is valid, but legacy isSuperAdmin users shouldn't have AdminRole entries
        // Since we're unifying, we keep all AdminRole entries
        return true;
    });

    res.status(200).json({
        adminRoles: filteredRoles,
    });
});

export const getAdminRole = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    // Users can view their own role, super admin can view any (computed from AdminRole)
    if (userId !== req.user._id.toString() && !req.user.isSuperAdmin) {
        return res.status(403).json({
            message: 'Quyền truy cập bị từ chối: cần quyền Super admin',
        });
    }

    const adminRole = await AdminRole.findOne({ userId })
        .populate('userId', 'username email displayName')
        .populate('grantedBy', 'username displayName')
        .lean();

    if (!adminRole) {
        return res.status(404).json({
            message: 'Không tìm thấy quyền admin',
        });
    }

    res.status(200).json({
        adminRole,
    });
});

export const createAdminRole = asyncHandler(async (req, res) => {
    // Permission check is handled by requireSuperAdmin middleware in routes

    const { userId, role, permissions, expiresAt, active, allowedIPs } = req.body;

    if (!userId) {
        return res.status(400).json({
            message: 'Cần ID tên tài khoản',
        });
    }

    // Validate role
    const validRoles = ['super_admin', 'admin', 'moderator'];
    const selectedRole = role || 'admin';
    if (!validRoles.includes(selectedRole)) {
        return res.status(400).json({
            message: `Vai trò không hợp lệ. Phải là một trong: ${validRoles.join(', ')}`,
        });
    }

    // Validate permissions against role constraints
    if (permissions) {
        const validation = validatePermissionsForRole(selectedRole, permissions);
        if (!validation.valid) {
            return res.status(400).json({
                message: 'Quyền hạn không hợp lệ cho vai trò này',
                errors: validation.errors,
            });
        }
    }

    const user = await User.findById(userId);

    if (!user) {
        return res.status(404).json({
            message: 'Không tìm thấy tài khoản',
        });
    }

    // Super admins can create admin roles for anyone, including other super admins

    // Check if admin role already exists
    const existingRole = await AdminRole.findOne({ userId });

    if (existingRole) {
        return res.status(400).json({
            message: 'Tài khoản đang có quyền admin',
        });
    }

    // Note: isAdmin is computed from AdminRole (single source of truth)
    // No need to write to User.isAdmin - it is computed automatically

    // Create admin role with validated permissions
    // Apply role inheritance: admin automatically gets all moderator permissions
    const defaultPermissions = {
        viewDashboard: true, // Default permission for all roles
    };

    // Start with user-provided permissions (if any)
    const userPermissions = permissions
        ? { ...defaultPermissions, ...permissions }
        : defaultPermissions;

    // Apply automatic inheritance based on role
    // Admin inherits all moderator permissions, super_admin inherits all admin permissions
    const finalPermissions = applyRoleInheritance(selectedRole, userPermissions);

    // Validate and process expiresAt
    let expiresAtDate = null;
    if (expiresAt) {
        expiresAtDate = new Date(expiresAt);
        if (isNaN(expiresAtDate.getTime())) {
            return res.status(400).json({ message: 'Ngày hết hạn không hợp lệ' });
        }
        if (expiresAtDate < new Date()) {
            return res.status(400).json({ message: 'Ngày hết hạn không thể là quá khứ' });
        }
    }

    // Validate active flag
    const isActive = active !== undefined ? active : true;

    // Validate and process allowedIPs
    let validatedIPs = [];
    if (allowedIPs && Array.isArray(allowedIPs) && allowedIPs.length > 0) {
        // Basic IP validation (IPv4, IPv6, CIDR)
        const ipv4Regex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:\/([0-3]?[0-9]))?$/;
        const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}(?:\/\d{1,3})?$/;
        const ipv6CompressedRegex = /^::1$|^::$|^([0-9a-fA-F]{1,4}:)+::([0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}(\/\d{1,3})?$/;

        validatedIPs = allowedIPs.filter(ip => {
            const trimmed = ip.trim();
            return ipv4Regex.test(trimmed) || ipv6Regex.test(trimmed) || ipv6CompressedRegex.test(trimmed);
        });

        if (validatedIPs.length !== allowedIPs.length) {
            return res.status(400).json({ message: 'Một hoặc nhiều địa chỉ IP không hợp lệ' });
        }
    }

    const adminRole = await AdminRole.create({
        userId,
        role: selectedRole,
        permissions: finalPermissions,
        grantedBy: req.user._id,
        expiresAt: expiresAtDate,
        active: isActive,
        allowedIPs: validatedIPs,
    });

    await adminRole.populate('userId', 'username email displayName');
    await adminRole.populate('grantedBy', 'username displayName');

    // Invalidate permission cache for this user (all IPs)
    invalidateUserCache(userId);

    // Log permission change
    await logPermissionChange({
        action: 'create',
        performedBy: req.user,
        targetUser: user,
        newRole: {
            role: adminRole.role,
            permissions: adminRole.permissions,
            grantedBy: adminRole.grantedBy,
        },
        reason: req.body.reason || null,
        ipAddress: getClientIp(req),
    });

    res.status(201).json({
        message: 'Thêm quyền admin thành công',
        adminRole,
    });
});

export const updateAdminRole = asyncHandler(async (req, res) => {
    // Permission check is handled by requireSuperAdmin middleware in routes

    const { userId } = req.params;
    const { role, permissions, reason, expiresAt, active, allowedIPs } = req.body;

    const adminRole = await AdminRole.findOne({ userId });

    if (!adminRole) {
        return res.status(404).json({
            message: 'Tài khoản này không có quyền admin',
        });
    }

    // Super admins can edit any admin role, including their own and other super admins

    // Store old role data for audit logging
    const oldRole = {
        role: adminRole.role,
        permissions: { ...adminRole.permissions.toObject() },
    };

    // Determine the role to validate against (use new role if provided, otherwise current role)
    const roleToValidate = role !== undefined ? role : adminRole.role;

    // Validate role if it's being changed
    if (role !== undefined) {
        const validRoles = ['super_admin', 'admin', 'moderator'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({
                message: `Vai trò không hợp lệ. Phải là một trong: ${validRoles.join(', ')}`,
            });
        }
    }

    // Validate permissions against role constraints
    // If permissions are being updated, validate the merged result
    if (permissions !== undefined) {
        // Merge current permissions with new permissions
        const mergedPermissions = {
            ...adminRole.permissions.toObject(),
            ...permissions,
        };

        // Apply role inheritance to ensure inherited permissions are set
        const permissionsWithInheritance = applyRoleInheritance(roleToValidate, mergedPermissions);

        // Validate merged permissions against the role (new role if changed, otherwise current role)
        const validation = validatePermissionsForRole(roleToValidate, permissionsWithInheritance);
        if (!validation.valid) {
            return res.status(400).json({
                message: 'Quyền hạn không hợp lệ cho vai trò này',
                errors: validation.errors,
            });
        }
    }

    const updateData = {};

    // Handle expiresAt
    if (expiresAt !== undefined) {
        if (expiresAt === null) {
            updateData.expiresAt = null; // Clear expiration
        } else {
            const expiresAtDate = new Date(expiresAt);
            if (isNaN(expiresAtDate.getTime())) {
                return res.status(400).json({ message: 'Ngày hết hạn không hợp lệ' });
            }
            if (expiresAtDate < new Date()) {
                return res.status(400).json({ message: 'Ngày hết hạn không thể là quá khứ' });
            }
            updateData.expiresAt = expiresAtDate;
        }
    }

    // Handle active flag
    if (active !== undefined) {
        updateData.active = active;
    }

    // Handle allowedIPs
    if (allowedIPs !== undefined) {
        if (!Array.isArray(allowedIPs)) {
            return res.status(400).json({ message: 'allowedIPs phải là một mảng' });
        }

        if (allowedIPs.length === 0) {
            updateData.allowedIPs = []; // Clear IP restrictions
        } else {
            // Validate IP addresses
            const ipv4Regex = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?:\/([0-3]?[0-9]))?$/;
            const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}(?:\/\d{1,3})?$/;
            const ipv6CompressedRegex = /^::1$|^::$|^([0-9a-fA-F]{1,4}:)+::([0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}(\/\d{1,3})?$/;

            const validatedIPs = allowedIPs.filter(ip => {
                const trimmed = ip.trim();
                return ipv4Regex.test(trimmed) || ipv6Regex.test(trimmed) || ipv6CompressedRegex.test(trimmed);
            });

            if (validatedIPs.length !== allowedIPs.length) {
                return res.status(400).json({ message: 'Một hoặc nhiều địa chỉ IP không hợp lệ' });
            }

            updateData.allowedIPs = validatedIPs;
        }
    }

    if (role !== undefined) {
        updateData.role = role;
    }

    if (permissions !== undefined) {
        // Merge permissions and apply inheritance
        const mergedPermissions = {
            ...adminRole.permissions.toObject(),
            ...permissions,
        };
        // Apply inheritance to ensure inherited permissions are always true
        updateData.permissions = applyRoleInheritance(roleToValidate, mergedPermissions);
    }

    const updatedRole = await AdminRole.findOneAndUpdate(
        { userId },
        updateData,
        { new: true, runValidators: true }
    )
        .populate('userId', 'username email displayName')
        .populate('grantedBy', 'username displayName');

    // Invalidate permission cache for this user (all IPs)
    invalidateUserCache(userId);

    // Get target user for audit logging
    const targetUser = await User.findById(userId).select('username email displayName').lean();

    // Log permission change
    await logPermissionChange({
        action: 'update',
        performedBy: req.user,
        targetUser: targetUser || { _id: userId },
        oldRole,
        newRole: {
            role: updatedRole.role,
            permissions: updatedRole.permissions.toObject(),
        },
        reason: reason || null,
        ipAddress: getClientIp(req),
    });

    res.status(200).json({
        message: 'Cập nhật quyền admin thành công',
        adminRole: updatedRole,
    });
});

export const deleteAdminRole = asyncHandler(async (req, res) => {
    // Permission check is handled by requireSuperAdmin middleware in routes

    const { userId } = req.params;
    const { reason } = req.body;

    const adminRole = await AdminRole.findOne({ userId });

    if (!adminRole) {
        return res.status(404).json({
            message: 'Tải khoản này không có quyền admin',
        });
    }

    // Super admins can delete any admin role, including their own and other super admins

    // Store old role data for audit logging
    const oldRole = {
        role: adminRole.role,
        permissions: { ...adminRole.permissions.toObject() },
    };

    // Get target user for audit logging
    const targetUser = await User.findById(userId).select('username email displayName').lean();

    // Remove admin role
    await AdminRole.findOneAndDelete({ userId });

    // Invalidate permission cache for this user (all IPs)
    invalidateUserCache(userId);

    // Note: isAdmin is computed from AdminRole (single source of truth)
    // No need to write to User.isAdmin - it will be computed as false automatically

    // Log permission change
    await logPermissionChange({
        action: 'delete',
        performedBy: req.user,
        targetUser: targetUser || { _id: userId },
        oldRole,
        reason: reason || null,
        ipAddress: getClientIp(req),
    });

    res.status(200).json({
        message: 'Xoá quyền admin thành công',
    });
});

// Collection Management
export const getAllCollectionsAdmin = asyncHandler(async (req, res) => {
    // Permission check is handled by requirePermission('viewCollections') middleware

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 20), 100);
    const skip = (page - 1) * limit;
    const search = req.query.search?.trim();

    const query = {};
    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } },
        ];
    }

    const [collections, total] = await Promise.all([
        Collection.find(query)
            .populate('createdBy', 'username displayName email')
            .populate('coverImage', 'imageUrl thumbnailUrl')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Collection.countDocuments(query),
    ]);

    // Add image count to each collection
    const collectionsWithCounts = collections.map(collection => ({
        ...collection,
        imageCount: collection.images?.length || 0,
    }));

    res.status(200).json({
        collections: collectionsWithCounts,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
        },
    });
});

export const updateCollectionAdmin = asyncHandler(async (req, res) => {
    // Permission check is handled by requirePermission('manageCollections') middleware

    const { collectionId } = req.params;
    const { name, description, isPublic } = req.body;

    const collection = await Collection.findById(collectionId);

    if (!collection) {
        return res.status(404).json({
            message: 'Không tìm thấy bộ sưu tập',
        });
    }

    const updateData = {};

    if (name !== undefined) {
        updateData.name = name.trim();
    }

    if (description !== undefined) {
        updateData.description = description?.trim() || undefined;
    }

    if (isPublic !== undefined) {
        updateData.isPublic = isPublic;
    }

    const updatedCollection = await Collection.findByIdAndUpdate(
        collectionId,
        updateData,
        { new: true, runValidators: true }
    )
        .populate('createdBy', 'username displayName')
        .populate('coverImage', 'imageUrl thumbnailUrl');

    res.status(200).json({
        message: 'Cập nhật bộ sưu tập thành công',
        collection: updatedCollection,
    });
});

// Export Data
export const exportData = asyncHandler(async (req, res) => {
    // Permission check is handled by requirePermission('exportData') middleware

    try {
        // Get all data
        const [users, images, categories, collections, adminRoles] = await Promise.all([
            User.find().select('username email displayName bio phone createdAt updatedAt isAdmin isSuperAdmin').lean(),
            Image.find().populate('uploadedBy', 'username displayName').populate('imageCategory', 'name').select('imageTitle imageCategory imageUrl uploadedBy createdAt updatedAt').lean(),
            Category.find().select('name description createdAt updatedAt').lean(),
            Collection.find().populate('createdBy', 'username displayName').select('name description images createdAt updatedAt createdBy').lean(),
            AdminRole.find().populate('userId', 'username displayName email').populate('grantedBy', 'username displayName').select('userId role permissions grantedBy createdAt updatedAt').lean(),
        ]);

        // Format data for export
        const exportData = {
            exportDate: new Date().toISOString(),
            exportedBy: {
                userId: req.user._id,
                username: req.user.username,
                displayName: req.user.displayName,
            },
            statistics: {
                totalUsers: users.length,
                totalImages: images.length,
                totalCategories: categories.length,
                totalCollections: collections.length,
                totalAdminRoles: adminRoles.length,
            },
            data: {
                users,
                images,
                categories,
                collections,
                adminRoles,
            },
        };

        // Set headers for JSON download
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="photoapp-export-${new Date().toISOString().split('T')[0]}.json"`);

        res.json(exportData);
    } catch (error) {
        logger.error('Error exporting data:', error);
        res.status(500).json({
            message: 'Lỗi khi xuất dữ liệu',
            error: error.message,
        });
    }
});

export const deleteCollectionAdmin = asyncHandler(async (req, res) => {
    // Permission check is handled by requirePermission('manageCollections') middleware

    const { collectionId } = req.params;

    const collection = await Collection.findById(collectionId);

    if (!collection) {
        return res.status(404).json({
            message: 'Không tìm thấy bộ sưu tập',
        });
    }

    await Collection.findByIdAndDelete(collectionId);

    res.status(200).json({
        message: 'Xoá bộ sưu tập thành công',
    });
});

// Favorites Management
export const getAllFavorites = asyncHandler(async (req, res) => {
    // Permission check is handled by requirePermission('manageFavorites') middleware

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 20), 100);
    const skip = (page - 1) * limit;
    const search = req.query.search || '';

    // Build query
    let userQuery = {};
    if (search) {
        userQuery = {
            $or: [
                { username: { $regex: search, $options: 'i' } },
                { displayName: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
            ],
        };
    }

    // Get users with favorites
    const users = await User.find(userQuery)
        .select('username displayName email favorites')
        .populate('favorites', 'imageTitle imageUrl uploadedBy')
        .lean();

    // Flatten favorites with user info
    const allFavorites = [];
    users.forEach(user => {
        if (user.favorites && user.favorites.length > 0) {
            user.favorites.forEach(fav => {
                if (fav && typeof fav === 'object') {
                    allFavorites.push({
                        _id: `${user._id}_${fav._id}`,
                        user: {
                            _id: user._id,
                            username: user.username,
                            displayName: user.displayName,
                            email: user.email,
                        },
                        image: fav,
                        createdAt: fav.createdAt || new Date(),
                    });
                }
            });
        }
    });

    // Sort by date (newest first)
    allFavorites.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Paginate
    const total = allFavorites.length;
    const paginatedFavorites = allFavorites.slice(skip, skip + limit);

    res.json({
        favorites: paginatedFavorites,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
        },
    });
});

export const deleteFavorite = asyncHandler(async (req, res) => {
    // Permission check is handled by requirePermission('manageFavorites') middleware

    const { userId, imageId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
        return res.status(404).json({
            message: 'Không tìm thấy người dùng',
        });
    }

    // Remove favorite
    await User.findByIdAndUpdate(userId, {
        $pull: { favorites: imageId },
    });

    // Log action
    await SystemLog.create({
        level: 'info',
        message: `Admin removed favorite: image ${imageId} from user ${userId}`,
        userId: req.user._id,
        action: 'deleteFavorite',
        metadata: { targetUserId: userId, imageId },
    });

    res.json({
        message: 'Đã xóa yêu thích thành công',
    });
});

// Content Moderation
export const getPendingContent = asyncHandler(async (req, res) => {
    // Permission check is handled by requirePermission('moderateContent') middleware

    // Get images with moderationStatus 'pending' or without moderationStatus
    const images = await Image.find({
        $or: [
            { moderationStatus: 'pending' },
            { moderationStatus: { $exists: false } },
        ],
    })
        .populate('uploadedBy', 'username displayName')
        .populate('imageCategory', 'name')
        .sort({ createdAt: -1 })
        .lean();

    res.json({
        content: images.map(img => ({
            _id: img._id,
            title: img.imageTitle,
            content: img.imageTitle, // For now, use title as content
            uploadedBy: img.uploadedBy,
            status: img.moderationStatus || 'pending',
            createdAt: img.createdAt,
            imageUrl: img.imageUrl,
            category: img.imageCategory,
        })),
    });
});

export const approveContent = asyncHandler(async (req, res) => {
    // Permission check is handled by requirePermission('moderateContent') middleware

    const { contentId } = req.params;

    const image = await Image.findById(contentId);
    if (!image) {
        return res.status(404).json({
            message: 'Không tìm thấy nội dung',
        });
    }

    // Update moderation status to approved
    image.moderationStatus = 'approved';
    image.isModerated = true;
    image.moderatedAt = new Date();
    image.moderatedBy = req.user._id;
    await image.save();

    // Log action
    await SystemLog.create({
        level: 'info',
        message: `Content approved: ${contentId}`,
        userId: req.user._id,
        action: 'approveContent',
        metadata: { contentId },
    });

    res.json({
        message: 'Đã duyệt nội dung thành công',
    });
});

export const rejectContent = asyncHandler(async (req, res) => {
    // Permission check is handled by requirePermission('moderateContent') middleware

    const { contentId } = req.params;
    const { reason } = req.body;

    const image = await Image.findById(contentId);
    if (!image) {
        return res.status(404).json({
            message: 'Không tìm thấy nội dung',
        });
    }

    // Update moderation status to rejected
    image.moderationStatus = 'rejected';
    image.isModerated = true;
    image.moderatedAt = new Date();
    image.moderatedBy = req.user._id;
    if (reason) {
        image.moderationNotes = reason;
    }
    await image.save();

    // Log action
    await SystemLog.create({
        level: 'info',
        message: `Content rejected: ${contentId}${reason ? ` - Reason: ${reason}` : ''}`,
        userId: req.user._id,
        action: 'rejectContent',
        metadata: { contentId, reason },
    });

    res.json({
        message: 'Đã từ chối nội dung',
    });
});

// System Logs
export const getSystemLogs = asyncHandler(async (req, res) => {
    // Permission check is handled by requirePermission('viewLogs') middleware

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 50), 200);
    const skip = (page - 1) * limit;
    const level = req.query.level; // Filter by level
    const action = req.query.action; // Filter by action (e.g., 'permission_create', 'permission_update', 'permission_delete')
    const search = req.query.search || '';

    // Build query
    let query = {};
    if (level) {
        query.level = level;
    }
    if (action) {
        query.action = action;
    }
    if (search) {
        query.message = { $regex: search, $options: 'i' };
    }

    const [logs, total] = await Promise.all([
        SystemLog.find(query)
            .populate('userId', 'username displayName')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        SystemLog.countDocuments(query),
    ]);

    res.json({
        logs: logs.map(log => ({
            _id: log._id,
            timestamp: log.createdAt,
            level: log.level,
            message: log.message,
            userId: log.userId,
            action: log.action,
            metadata: log.metadata,
        })),
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
        },
    });
});

// Settings Management
export const getSettings = asyncHandler(async (req, res) => {
    // Permission check is handled by requirePermission('manageSettings') middleware

    const settings = await Settings.findOne({ key: 'system' });

    if (!settings) {
        // Create default settings
        const defaultSettings = await Settings.create({
            key: 'system',
            value: {
                siteName: 'PhotoApp',
                siteDescription: 'Discover beautiful photos',
                maxUploadSize: 10,
                allowedFileTypes: ['jpg', 'jpeg', 'png', 'webp'],
                maintenanceMode: false,
            },
            description: 'System-wide settings',
        });
        return res.json({ settings: defaultSettings.value });
    }

    res.json({ settings: settings.value });
});

export const updateSettings = asyncHandler(async (req, res) => {
    // Permission check is handled by requirePermission('manageSettings') middleware

    const { settings } = req.body;

    let systemSettings = await Settings.findOne({ key: 'system' });

    if (!systemSettings) {
        systemSettings = await Settings.create({
            key: 'system',
            value: settings,
            description: 'System-wide settings',
            updatedBy: req.user._id,
        });
    } else {
        systemSettings.value = { ...systemSettings.value, ...settings };
        systemSettings.updatedBy = req.user._id;
        await systemSettings.save();
    }

    // Log action
    await SystemLog.create({
        level: 'info',
        message: 'System settings updated',
        userId: req.user._id,
        action: 'updateSettings',
        metadata: { settings },
    });

    res.json({
        message: 'Đã cập nhật cài đặt thành công',
        settings: systemSettings.value,
    });
});

// Cache Test Endpoint (for testing permission caching)
export const getCacheStats = asyncHandler(async (req, res) => {
    // Permission check is handled by requireSuperAdmin middleware in routes

    const stats = getPermissionCacheStats();

    res.json({
        message: 'Permission cache statistics',
        cache: stats,
        timestamp: new Date().toISOString(),
    });
});


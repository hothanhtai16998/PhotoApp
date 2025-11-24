import User from '../models/User.js';
import Image from '../models/Image.js';
import AdminRole from '../models/AdminRole.js';
import Category from '../models/Category.js';
import Collection from '../models/Collection.js';
import PageView from '../models/PageView.js';
import Session from '../models/Session.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { logger } from '../utils/logger.js';
import { deleteImageFromS3 } from '../libs/s3.js';
import { PERMISSIONS } from '../middlewares/permissionMiddleware.js';
import { clearCache } from '../middlewares/cacheMiddleware.js';

// Statistics
export const getDashboardStats = asyncHandler(async (req, res) => {
    // Check permission (super admin or admin with viewDashboard permission)
    // Note: viewDashboard is default true, but we check it for consistency
    const { hasPermission } = await import('../middlewares/permissionMiddleware.js');
    const canView = req.user.isSuperAdmin || await hasPermission(req.user._id, 'viewDashboard');
    
    if (!canView) {
        return res.status(403).json({
            message: 'Quyền truy cập bị từ chối: cần quyền xem bảng điều khiển',
        });
    }
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
    // Check permission (super admin or admin with viewUsers permission)
    const { hasPermission } = await import('../middlewares/permissionMiddleware.js');
    const canView = req.user.isSuperAdmin || await hasPermission(req.user._id, 'viewUsers');
    
    if (!canView) {
        return res.status(403).json({
            message: 'Quyền truy cập bị từ chối: cần quyền xem người dùng',
        });
    }

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

    // Check permission (super admin or admin with editUsers permission)
    const { hasPermission } = await import('../middlewares/permissionMiddleware.js');
    const canEdit = req.user.isSuperAdmin || await hasPermission(req.user._id, 'editUsers');
    
    if (!canEdit) {
        return res.status(403).json({
            message: 'Quyền truy cập bị từ chối: cần quyền chỉnh sửa người dùng',
        });
    }

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

    // Check permission (super admin or admin with deleteUsers permission)
    const { hasPermission } = await import('../middlewares/permissionMiddleware.js');
    const canDelete = req.user.isSuperAdmin || await hasPermission(req.user._id, 'deleteUsers');
    
    if (!canDelete) {
        return res.status(403).json({
            message: 'Quyền truy cập bị từ chối: cần quyền xóa người dùng',
        });
    }

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

    // Check permission (super admin or admin with banUsers permission)
    const { hasPermission } = await import('../middlewares/permissionMiddleware.js');
    const canBan = req.user.isSuperAdmin || await hasPermission(req.user._id, 'banUsers');
    
    if (!canBan) {
        return res.status(403).json({
            message: 'Quyền truy cập bị từ chối: cần quyền cấm người dùng',
        });
    }

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

    // Check permission (super admin or admin with unbanUsers permission)
    const { hasPermission } = await import('../middlewares/permissionMiddleware.js');
    const canUnban = req.user.isSuperAdmin || await hasPermission(req.user._id, 'unbanUsers');
    
    if (!canUnban) {
        return res.status(403).json({
            message: 'Quyền truy cập bị từ chối: cần quyền bỏ cấm người dùng',
        });
    }

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
    // Check permission (super admin or admin with viewImages permission)
    const { hasPermission } = await import('../middlewares/permissionMiddleware.js');
    const canView = req.user.isSuperAdmin || await hasPermission(req.user._id, 'viewImages');
    
    if (!canView) {
        return res.status(403).json({
            message: 'Quyền truy cập bị từ chối: cần quyền xem ảnh',
        });
    }

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

    // Check permission (super admin or admin with deleteImages permission)
    const { hasPermission } = await import('../middlewares/permissionMiddleware.js');
    const canDelete = req.user.isSuperAdmin || await hasPermission(req.user._id, 'deleteImages');
    
    if (!canDelete) {
        return res.status(403).json({
            message: 'Quyền truy cập bị từ chối: cần quyền xóa ảnh',
        });
    }

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

    // Check permission (super admin or admin with editImages permission)
    const { hasPermission } = await import('../middlewares/permissionMiddleware.js');
    const canEdit = req.user.isSuperAdmin || await hasPermission(req.user._id, 'editImages');
    
    if (!canEdit) {
        return res.status(403).json({
            message: 'Quyền truy cập bị từ chối: cần quyền chỉnh sửa ảnh',
        });
    }

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

    // Check permission (super admin or admin with moderateImages permission)
    const { hasPermission } = await import('../middlewares/permissionMiddleware.js');
    const canModerate = req.user.isSuperAdmin || await hasPermission(req.user._id, 'moderateImages');
    
    if (!canModerate) {
        return res.status(403).json({
            message: 'Quyền truy cập bị từ chối: cần quyền kiểm duyệt ảnh',
        });
    }

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
    // Check permission (super admin or admin with viewAnalytics permission)
    const { hasPermission } = await import('../middlewares/permissionMiddleware.js');
    const canView = req.user.isSuperAdmin || await hasPermission(req.user._id, 'viewAnalytics');
    
    if (!canView) {
        return res.status(403).json({
            message: 'Quyền truy cập bị từ chối: cần quyền xem phân tích',
        });
    }

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
    // Check permission (super admin or admin with viewAnalytics permission)
    const { hasPermission } = await import('../middlewares/permissionMiddleware.js');
    const canView = req.user.isSuperAdmin || await hasPermission(req.user._id, 'viewAnalytics');
    
    if (!canView) {
        return res.status(403).json({
            message: 'Quyền truy cập bị từ chối: cần quyền xem phân tích',
        });
    }

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
    // Check permission (super admin or admin with viewAdmins permission)
    const { hasPermission } = await import('../middlewares/permissionMiddleware.js');
    const canView = req.user.isSuperAdmin || await hasPermission(req.user._id, 'viewAdmins');
    
    if (!canView) {
        return res.status(403).json({
            message: 'Quyền truy cập bị từ chối: cần quyền xem admin',
        });
    }

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
    // Only super admin can create admin roles (computed from AdminRole)
    if (!req.user.isSuperAdmin) {
        return res.status(403).json({
            message: 'Quyền truy cập bị từ chối: cần quyền Super admin',
        });
    }

    const { userId, role, permissions } = req.body;

    if (!userId) {
        return res.status(400).json({
            message: 'Cần ID tên tài khoản',
        });
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

    // Set user as admin
    user.isAdmin = true;
    await user.save();

    // Create admin role
    const adminRole = await AdminRole.create({
        userId,
        role: role || 'admin',
        permissions: permissions || {
            manageUsers: false,
            deleteUsers: false,
            manageImages: false,
            deleteImages: false,
            manageCategories: false,
            manageAdmins: false,
            viewDashboard: true,
        },
        grantedBy: req.user._id,
    });

    await adminRole.populate('userId', 'username email displayName');
    await adminRole.populate('grantedBy', 'username displayName');

    res.status(201).json({
        message: 'Thêm quyền admin thành công',
        adminRole,
    });
});

export const updateAdminRole = asyncHandler(async (req, res) => {
    // Only super admin can update admin roles (computed from AdminRole)
    if (!req.user.isSuperAdmin) {
        return res.status(403).json({
            message: 'Quyền truy cập bị từ chối: cần quyền admin',
        });
    }

    const { userId } = req.params;
    const { role, permissions } = req.body;

    const adminRole = await AdminRole.findOne({ userId });

    if (!adminRole) {
        return res.status(404).json({
            message: 'Tài khoản này không có quyền admin',
        });
    }

    // Super admins can edit any admin role, including their own and other super admins

    const updateData = {};

    if (role !== undefined) {
        updateData.role = role;
    }

    if (permissions !== undefined) {
        updateData.permissions = {
            ...adminRole.permissions,
            ...permissions,
        };
    }

    const updatedRole = await AdminRole.findOneAndUpdate(
        { userId },
        updateData,
        { new: true, runValidators: true }
    )
        .populate('userId', 'username email displayName')
        .populate('grantedBy', 'username displayName');

    res.status(200).json({
        message: 'Cập nhật quyền admin thành công',
        adminRole: updatedRole,
    });
});

export const deleteAdminRole = asyncHandler(async (req, res) => {
    // Only super admin can delete admin roles (computed from AdminRole)
    if (!req.user.isSuperAdmin) {
        return res.status(403).json({
            message: 'Quyền truy cập bị từ chối: cần quyền admin',
        });
    }

    const { userId } = req.params;

    const adminRole = await AdminRole.findOne({ userId });

    if (!adminRole) {
        return res.status(404).json({
            message: 'Tải khoản này không có quyền admin',
        });
    }

    // Super admins can delete any admin role, including their own and other super admins

    // Remove admin role
    await AdminRole.findOneAndDelete({ userId });

    // Update user's isAdmin status
    const user = await User.findById(userId);
    if (user) {
        user.isAdmin = false;
        await user.save();
    }

    res.status(200).json({
        message: 'Xoá quyền admin thành công',
    });
});

// Collection Management
export const getAllCollectionsAdmin = asyncHandler(async (req, res) => {
    // Check permission (super admin or admin with viewCollections permission)
    const { hasPermission } = await import('../middlewares/permissionMiddleware.js');
    const canView = req.user.isSuperAdmin || await hasPermission(req.user._id, 'viewCollections');
    
    if (!canView) {
        return res.status(403).json({
            message: 'Quyền truy cập bị từ chối: cần quyền xem bộ sưu tập',
        });
    }

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
    // Check permission (super admin or admin with manageCollections permission)
    const { hasPermission } = await import('../middlewares/permissionMiddleware.js');
    const canManage = req.user.isSuperAdmin || await hasPermission(req.user._id, 'manageCollections');
    
    if (!canManage) {
        return res.status(403).json({
            message: 'Quyền truy cập bị từ chối: cần quyền quản lý bộ sưu tập',
        });
    }

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

export const deleteCollectionAdmin = asyncHandler(async (req, res) => {
    // Check permission (super admin or admin with manageCollections permission)
    const { hasPermission } = await import('../middlewares/permissionMiddleware.js');
    const canManage = req.user.isSuperAdmin || await hasPermission(req.user._id, 'manageCollections');
    
    if (!canManage) {
        return res.status(403).json({
            message: 'Quyền truy cập bị từ chối: cần quyền quản lý bộ sưu tập',
        });
    }

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


import User from '../../models/User.js';
import Image from '../../models/Image.js';
import Notification from '../../models/Notification.js';
import { asyncHandler } from '../../middlewares/asyncHandler.js';
import { logger } from '../../utils/logger.js';
import { deleteImageFromS3 } from '../../libs/s3.js';

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
    const { computeAdminStatus } = await import('../../utils/adminUtils.js');
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
    const { computeAdminStatus: computeTargetStatus } = await import('../../utils/adminUtils.js');
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
    const { computeAdminStatus } = await import('../../utils/adminUtils.js');
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

    // Create user_banned_admin notification
    try {
        await Notification.create({
            recipient: userId,
            type: 'user_banned_admin',
            actor: req.user._id,
            metadata: {
                reason: user.banReason,
                bannedBy: req.user.displayName || req.user.username,
            },
        });
    } catch (notifError) {
        logger.error('Failed to create user banned notification:', notifError);
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

    // Create user_unbanned_admin notification
    try {
        await Notification.create({
            recipient: userId,
            type: 'user_unbanned_admin',
            actor: req.user._id,
            metadata: {
                unbannedBy: req.user.displayName || req.user.username,
            },
        });
    } catch (notifError) {
        logger.error('Failed to create user unbanned notification:', notifError);
        // Don't fail the unban if notification fails
    }

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


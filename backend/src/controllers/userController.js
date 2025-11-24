import { asyncHandler } from "../middlewares/asyncHandler.js";
import bcrypt from "bcrypt";
import User from "../models/User.js";
import { uploadAvatar, deleteAvatarFromS3 } from "../libs/s3.js";
import { logger } from '../utils/logger.js';

export const authMe = asyncHandler(async (req, res) => {
    // req.user is already enriched with permissions by authMiddleware
    const user = req.user;

    // Return user with permissions (already included by enrichUserWithAdminStatus)
    return res.status(200).json({
        user: {
            _id: user._id,
            username: user.username,
            email: user.email,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            bio: user.bio,
            phone: user.phone,
            isOAuthUser: user.isOAuthUser,
            isAdmin: user.isAdmin || false,
            isSuperAdmin: user.isSuperAdmin || false,
            permissions: user.permissions || null,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
        },
    });
});

export const changePassword = asyncHandler(async (req, res) => {
    const { password, newPassword, newPasswordMatch } = req.body;
    const userId = req.user._id; // From authMiddleware

    if (!password || !newPassword || !newPasswordMatch) {
        return res.status(400).json({
            message: "Mật khẩu và xác nhận mật khẩu mới không được để trống",
        });
    }

    // Fetch user with hashedPassword (authMiddleware excludes it for security)
    const user = await User.findById(userId);

    // Verify current password
    const isPasswordMatch = await bcrypt.compare(password, user.hashedPassword);

    if (!isPasswordMatch) {
        return res.status(400).json({
            message: "Xác nhận mật khẩu hiện tại không đúng, xin thử lại"
        });
    }

    if (newPassword !== newPasswordMatch) {
        return res.status(400).json({
            message: "Mật khẩu mới không khớp, xin thử lại"
        });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await User.findByIdAndUpdate(userId, { hashedPassword });

    return res.status(200).json({
        message: "Cập nhật mật khẩu thành công"
    });
})

export const forgotPassword = asyncHandler(async (req, res) => { })

export const changeInfo = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { firstName, lastName, email, bio } = req.body;

    // Get current user to check for existing avatar
    const currentUser = await User.findById(userId);

    const updateData = {};

    // Update displayName if firstName/lastName provided
    if (firstName || lastName) {
        const firstNameValue = firstName?.trim() || '';
        const lastNameValue = lastName?.trim() || '';
        updateData.displayName = `${firstNameValue} ${lastNameValue}`.trim();
    }

    // Update email if provided
    if (email) {
        // Prevent OAuth users from changing email (must match Google account)
        if (currentUser.isOAuthUser) {
            return res.status(403).json({
                message: "Không thể thay đổi email đã liên kết với Google."
            });
        }

        // Check if email is already taken by another user
        const existingEmail = await User.findOne({
            email: email.toLowerCase().trim(),
            _id: { $ne: userId }
        });

        if (existingEmail) {
            return res.status(409).json({
                message: "Email đã tồn tại"
            });
        }
        updateData.email = email.toLowerCase().trim();
    }

    // Update bio if provided
    if (bio !== undefined) {
        updateData.bio = bio.trim() || undefined;
    }

    // Handle avatar upload if file is provided
    // Prevent OAuth users from changing avatar (must use Google avatar)
    if (req.file && currentUser.isOAuthUser) {
        return res.status(403).json({
            message: "Không thể thay đổi ảnh đại diện được liên kết với tài khoản Google."
        });
    }

    if (req.file) {
        let uploadResult;
        try {
            // Generate unique filename
            const timestamp = Date.now();
            const randomString = Math.random().toString(36).substring(2, 15);
            const filename = `avatar-${timestamp}-${randomString}`;

            // Upload avatar to S3 with Sharp processing
            uploadResult = await uploadAvatar(
                req.file.buffer,
                'photo-app-avatars',
                filename
            );

            // Delete old avatar from S3 if exists
            if (currentUser.avatarId) {
                try {
                    await deleteAvatarFromS3(currentUser.avatarId);
                } catch (deleteError) {
                    logger.warn('Lỗi xoá ảnh đại diện từ S3', deleteError);
                    // Continue even if deletion fails
                }
            }

            updateData.avatarUrl = uploadResult.avatarUrl;
            updateData.avatarId = uploadResult.publicId;
        } catch (error) {
            logger.error('Lỗi không thể cập nhật ảnh đại diện', error);
            return res.status(500).json({
                message: "Lỗi hệ thống"
            });
        }
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
        userId,
        updateData,
        { new: true, runValidators: true }
    ).select('-hashedPassword');

    return res.status(200).json({
        message: "Cập nhật thông tin thành công",
        user: updatedUser
    });
})
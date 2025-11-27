import { asyncHandler } from "../middlewares/asyncHandler.js";
import bcrypt from "bcrypt";
import User from "../models/User.js";
import Image from "../models/Image.js";
import Collection from "../models/Collection.js";
import Follow from "../models/Follow.js";
import Notification from "../models/Notification.js";
import { uploadAvatar, deleteAvatarFromS3 } from "../libs/s3.js";
import { logger } from '../utils/logger.js';

/**
 * Search users by email, username, or displayName
 * Public endpoint for collaboration features
 */
export const searchUsers = asyncHandler(async (req, res) => {
    const search = req.query.search?.trim();
    const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 10), 20);

    if (!search || search.length < 2) {
        return res.status(200).json({
            users: [],
        });
    }

    // Escape special regex characters for safety
    const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchRegex = new RegExp(escapedSearch, 'i');
    
    // Optimized query: Use indexed fields with regex
    // Try to match username first (most common), then email, then displayName
    // Using $or with indexed fields for better performance
    const query = {
        $or: [
            { username: searchRegex },      // Username is indexed
            { email: searchRegex },          // Email is indexed  
            { displayName: searchRegex },     // Display name search
        ],
    };

    // Use lean() for faster queries (no Mongoose overhead)
    // Select only needed fields to reduce data transfer
    // Limit results early for better performance
    const users = await User.find(query)
        .select('username email displayName avatarUrl')
        .limit(limit)
        .lean();

    res.status(200).json({
        users,
    });
});

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
            location: user.location,
            website: user.website,
            instagram: user.instagram,
            twitter: user.twitter,
            facebook: user.facebook,
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

    // Create password_changed notification
    try {
        await Notification.create({
            recipient: userId,
            type: 'password_changed',
            metadata: {
                timestamp: new Date().toISOString(),
                ipAddress: req.ip || req.headers['x-forwarded-for'] || 'Unknown',
            },
        });
    } catch (notifError) {
        logger.error('Failed to create password changed notification:', notifError);
        // Don't fail the password change if notification fails
    }

    return res.status(200).json({
        message: "Cập nhật mật khẩu thành công"
    });
})

export const forgotPassword = asyncHandler(async (req, res) => { })

export const changeInfo = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { firstName, lastName, email, bio, location, website, instagram, twitter, facebook, phone } = req.body;

    // Get current user to check for existing avatar
    const currentUser = await User.findById(userId);

    const updateData = {};
    const changedFields = [];

    // Helper function to normalize values for comparison (treat empty string, null, undefined as the same)
    const normalizeValue = (value) => {
        if (value === null || value === undefined) return undefined;
        const trimmed = String(value).trim();
        return trimmed === '' ? undefined : trimmed;
    };

    // Update displayName if firstName/lastName provided
    if (firstName !== undefined || lastName !== undefined) {
        const firstNameValue = firstName?.trim() || '';
        const lastNameValue = lastName?.trim() || '';
        const newDisplayName = `${firstNameValue} ${lastNameValue}`.trim();
        if (newDisplayName !== currentUser.displayName) {
            updateData.displayName = newDisplayName;
            changedFields.push('displayName');
        }
    }

    // Update email if provided and changed
    if (email !== undefined) {
        const newEmail = email.toLowerCase().trim();
        const oldEmail = (currentUser.email || '').toLowerCase().trim();
        
        // Only process if email actually changed
        if (newEmail !== oldEmail) {
            // Prevent OAuth users from changing email (must match Google account)
            if (currentUser.isOAuthUser) {
                return res.status(403).json({
                    message: "Không thể thay đổi email đã liên kết với Google."
                });
            }

            // Check if email is already taken by another user
            const existingEmail = await User.findOne({
                email: newEmail,
                _id: { $ne: userId }
            });

            if (existingEmail) {
                return res.status(409).json({
                    message: "Email đã tồn tại"
                });
            }
            updateData.email = newEmail;

            // Create email_changed notification
            try {
                await Notification.create({
                    recipient: userId,
                    type: 'email_changed',
                    metadata: {
                        oldEmail: currentUser.email,
                        newEmail: newEmail,
                        timestamp: new Date().toISOString(),
                    },
                });
            } catch (notifError) {
                logger.error('Failed to create email changed notification:', notifError);
                // Don't fail the email change if notification fails
            }
        }
    }

    // Update bio if provided and changed
    if (bio !== undefined) {
        const newBio = normalizeValue(bio);
        const oldBio = normalizeValue(currentUser.bio);
        if (newBio !== oldBio) {
            updateData.bio = newBio;
            changedFields.push('bio');
        }
    }

    // Update location if provided and changed
    if (location !== undefined) {
        const newLocation = normalizeValue(location);
        const oldLocation = normalizeValue(currentUser.location);
        if (newLocation !== oldLocation) {
            updateData.location = newLocation;
            changedFields.push('location');
        }
    }

    // Update phone if provided and changed
    if (phone !== undefined) {
        const newPhone = normalizeValue(phone);
        const oldPhone = normalizeValue(currentUser.phone);
        if (newPhone !== oldPhone) {
            updateData.phone = newPhone;
            changedFields.push('phone');
        }
    }

    // Update website if provided and changed
    if (website !== undefined) {
        let websiteValue = normalizeValue(website);
        // Ensure website has protocol if provided
        if (websiteValue && !websiteValue.startsWith('http://') && !websiteValue.startsWith('https://')) {
            websiteValue = `https://${websiteValue}`;
        }
        const oldWebsite = normalizeValue(currentUser.website);
        if (websiteValue !== oldWebsite) {
            updateData.website = websiteValue;
            changedFields.push('website');
        }
    }

    // Update social links if provided and changed
    if (instagram !== undefined) {
        const rawInstagram = instagram.trim().replace(/^@/, '');
        const newInstagram = normalizeValue(rawInstagram);
        const oldInstagram = normalizeValue(currentUser.instagram);
        if (newInstagram !== oldInstagram) {
            updateData.instagram = newInstagram;
            changedFields.push('instagram');
        }
    }
    if (twitter !== undefined) {
        const rawTwitter = twitter.trim().replace(/^@/, '');
        const newTwitter = normalizeValue(rawTwitter);
        const oldTwitter = normalizeValue(currentUser.twitter);
        if (newTwitter !== oldTwitter) {
            updateData.twitter = newTwitter;
            changedFields.push('twitter');
        }
    }
    if (facebook !== undefined) {
        const newFacebook = normalizeValue(facebook);
        const oldFacebook = normalizeValue(currentUser.facebook);
        if (newFacebook !== oldFacebook) {
            updateData.facebook = newFacebook;
            changedFields.push('facebook');
        }
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

    // Create profile_updated notification (user is notified of their own profile update)
    // This can be useful for security purposes (detecting unauthorized changes)
    // Only notify if there are actual field changes (exclude avatarUrl/avatarId from notification)
    try {
        const userFacingFields = changedFields.filter(field => 
            field !== 'avatarUrl' && field !== 'avatarId'
        );
        if (userFacingFields.length > 0) {
            await Notification.create({
                recipient: userId,
                type: 'profile_updated',
                metadata: {
                    changedFields: userFacingFields,
                    timestamp: new Date().toISOString(),
                },
            });
        }
    } catch (notifError) {
        logger.error('Failed to create profile updated notification:', notifError);
        // Don't fail the update if notification fails
    }

    return res.status(200).json({
        message: "Cập nhật thông tin thành công",
        user: updatedUser
    });
});

/**
 * Get user profile statistics
 * GET /api/users/:userId/stats
 * Returns: totalImages, totalCollections, totalFavorites (received), totalDownloads, totalViews, followersCount, followingCount, profileViews, joinDate
 */
export const getUserStats = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    
    // Get user with profile fields for completion calculation
    const user = await User.findById(userId).select('profileViews createdAt avatarUrl bio phone displayName').lean();
    if (!user) {
        return res.status(404).json({
            message: 'User not found',
        });
    }

    // Get user's images
    const userImages = await Image.find({ uploadedBy: userId }).select('views downloads').lean();
    
    // Calculate stats
    const totalImages = userImages.length;
    const totalViews = userImages.reduce((sum, img) => sum + (img.views || 0), 0);
    const totalDownloads = userImages.reduce((sum, img) => sum + (img.downloads || 0), 0);
    
    // Get collections count
    const totalCollections = await Collection.countDocuments({ createdBy: userId });
    
    // Calculate total likes received (how many users have favorited this user's images)
    // Count all users who have any of this user's images in their favorites
    const userImageIds = userImages.map(img => img._id);
    const totalLikesReceived = userImageIds.length > 0 
        ? await User.countDocuments({
            favorites: { $in: userImageIds }
        })
        : 0;
    
    // Get followers/following count
    const followersCount = await Follow.countDocuments({ following: userId });
    const followingCount = await Follow.countDocuments({ follower: userId });
    
    // Calculate profile completion percentage
    // Criteria: avatar, bio, phone, at least 1 image, at least 1 collection
    const completionCriteria = {
        hasAvatar: !!(user.avatarUrl && user.avatarUrl.trim() !== ''),
        hasBio: !!(user.bio && user.bio.trim() !== ''),
        hasPhone: !!(user.phone && user.phone.trim() !== ''),
        hasImages: totalImages > 0,
        hasCollections: totalCollections > 0,
    };
    
    const completedCount = Object.values(completionCriteria).filter(Boolean).length;
    const totalCriteria = Object.keys(completionCriteria).length;
    const completionPercentage = Math.round((completedCount / totalCriteria) * 100);
    
    res.status(200).json({
        totalImages,
        totalCollections,
        totalFavorites: totalLikesReceived, // Likes received (favorites on user's images)
        totalDownloads,
        totalViews,
        followersCount,
        followingCount,
        profileViews: user.profileViews || 0,
        joinDate: user.createdAt,
        verifiedBadge: false, // Future feature
        profileCompletion: {
            percentage: completionPercentage,
            completed: completedCount,
            total: totalCriteria,
            criteria: completionCriteria,
        },
    });
});

/**
 * Track profile view
 * POST /api/users/:userId/view
 * Increments profileViews when someone visits a user's profile
 */
export const trackProfileView = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const viewerId = req.user?._id; // Optional - can be null for anonymous views
    
    // Don't count self-views
    if (viewerId && viewerId.toString() === userId) {
        return res.status(200).json({
            message: 'Self-view not counted',
            profileViews: 0,
        });
    }
    
    // Update profile views
    const user = await User.findByIdAndUpdate(
        userId,
        {
            $inc: { profileViews: 1 },
            $set: { lastProfileView: new Date() },
        },
        { new: true }
    ).select('profileViews');
    
    if (!user) {
        return res.status(404).json({
            message: 'User not found',
        });
    }
    
    res.status(200).json({
        message: 'Profile view tracked',
        profileViews: user.profileViews,
    });
});

/**
 * Get public user data by username
 * GET /api/users/username/:username
 * Public endpoint - returns basic user info
 */
export const getUserByUsername = asyncHandler(async (req, res) => {
    const { username } = req.params;
    
    const user = await User.findOne({ username: username.toLowerCase() })
        .select('username displayName avatarUrl bio location website instagram twitter facebook createdAt')
        .lean();
    
    if (!user) {
        return res.status(404).json({
            message: 'User not found',
        });
    }
    
    res.status(200).json({
        user: {
            _id: user._id,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl || '',
            bio: user.bio || '',
            location: user.location || '',
            website: user.website || '',
            instagram: user.instagram || '',
            twitter: user.twitter || '',
            facebook: user.facebook || '',
            createdAt: user.createdAt,
        },
    });
});

/**
 * Get public user data by userId
 * GET /api/users/:userId
 * Public endpoint - returns basic user info
 */
export const getUserById = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    
    const user = await User.findById(userId)
        .select('username displayName avatarUrl bio location website instagram twitter facebook createdAt')
        .lean();
    
    if (!user) {
        return res.status(404).json({
            message: 'User not found',
        });
    }
    
    res.status(200).json({
        user: {
            _id: user._id,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl || '',
            bio: user.bio || '',
            location: user.location || '',
            website: user.website || '',
            instagram: user.instagram || '',
            twitter: user.twitter || '',
            facebook: user.facebook || '',
            createdAt: user.createdAt,
        },
    });
})
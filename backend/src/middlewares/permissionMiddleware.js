import AdminRole from '../models/AdminRole.js';
import User from '../models/User.js';
import { asyncHandler } from './asyncHandler.js';

/**
 * Permission definitions
 */
export const PERMISSIONS = {
    MANAGE_USERS: 'manageUsers',
    DELETE_USERS: 'deleteUsers',
    MANAGE_IMAGES: 'manageImages',
    DELETE_IMAGES: 'deleteImages',
    MANAGE_CATEGORIES: 'manageCategories',
    MANAGE_ADMINS: 'manageAdmins',
    VIEW_DASHBOARD: 'viewDashboard',
};

/**
 * Check if user has a specific permission
 */
export const hasPermission = async (userId, permission) => {
    // Check if user is super admin (has all permissions)
    const user = await User.findById(userId).select('isSuperAdmin').lean();
    if (user?.isSuperAdmin) {
        return true;
    }

    // Check admin role permissions
    const adminRole = await AdminRole.findOne({ userId }).lean();
    if (!adminRole) {
        return false;
    }

    // Super admin role has all permissions
    if (adminRole.role === 'super_admin') {
        return true;
    }

    // Check specific permission
    return adminRole.permissions[permission] === true;
};

/**
 * Middleware to check if user has a specific permission
 * Must be used after protectedRoute middleware
 */
export const requirePermission = (permission) => {
    return asyncHandler(async (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                message: 'Authentication required',
            });
        }

        // Check if user is super admin
        if (req.user.isSuperAdmin) {
            return next();
        }

        // Check admin role
        const adminRole = await AdminRole.findOne({ userId: req.user._id }).lean();

        if (!adminRole) {
            return res.status(403).json({
                message: 'Admin access required',
            });
        }

        // Super admin role has all permissions
        if (adminRole.role === 'super_admin') {
            return next();
        }

        // Check specific permission
        if (!adminRole.permissions[permission]) {
            return res.status(403).json({
                message: `Permission denied: ${permission} required`,
            });
        }

        // Attach admin role to request for use in controllers
        req.adminRole = adminRole;
        next();
    });
};

/**
 * Middleware to check if user is super admin
 */
export const requireSuperAdmin = asyncHandler(async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            message: 'Authentication required',
        });
    }

    if (req.user.isSuperAdmin) {
        return next();
    }

    const adminRole = await AdminRole.findOne({ userId: req.user._id }).lean();

    if (!adminRole || adminRole.role !== 'super_admin') {
        return res.status(403).json({
            message: 'Super admin access required',
        });
    }

    req.adminRole = adminRole;
    next();
});


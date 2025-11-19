import AdminRole from '../models/AdminRole.js';
import { asyncHandler } from './asyncHandler.js';

/**
 * Middleware to protect admin routes
 * Must be used after protectedRoute middleware
 * Checks if user is super admin or has an admin role
 */
export const adminRoute = asyncHandler(async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            message: 'Authentication required',
        });
    }

    // Check if user is super admin
    if (req.user.isSuperAdmin) {
        return next();
    }

    // Check if user has admin role
    const adminRole = await AdminRole.findOne({ userId: req.user._id }).lean();

    if (!adminRole && !req.user.isAdmin) {
        return res.status(403).json({
            message: 'Admin access required',
        });
    }

    // Attach admin role to request for use in controllers
    if (adminRole) {
        req.adminRole = adminRole;
    }

    next();
});


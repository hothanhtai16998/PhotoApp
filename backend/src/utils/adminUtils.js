import AdminRole from '../models/AdminRole.js';

/**
 * Compute admin status from AdminRole
 * This unifies the permission system - AdminRole is the single source of truth
 * 
 * @param {string|Object} userId - User ID or User object
 * @returns {Promise<{isAdmin: boolean, isSuperAdmin: boolean, adminRole: Object|null}>}
 */
export const computeAdminStatus = async (userId) => {
    const userIdStr = typeof userId === 'object' ? userId._id?.toString() || userId.toString() : userId.toString();
    
    // Check AdminRole (single source of truth)
    const adminRole = await AdminRole.findOne({ userId: userIdStr }).lean();
    
    if (!adminRole) {
        return {
            isAdmin: false,
            isSuperAdmin: false,
            adminRole: null,
        };
    }
    
    // Super admin role has all permissions
    const isSuperAdmin = adminRole.role === 'super_admin';
    
    // User is admin if they have any admin role
    const isAdmin = true;
    
    return {
        isAdmin,
        isSuperAdmin,
        adminRole,
    };
};

/**
 * Enrich user object with computed admin status from AdminRole
 * 
 * @param {Object} user - User object
 * @returns {Promise<Object>} User object with computed isAdmin and isSuperAdmin
 */
export const enrichUserWithAdminStatus = async (user) => {
    if (!user || !user._id) {
        return user;
    }
    
    const { isAdmin, isSuperAdmin, adminRole } = await computeAdminStatus(user._id);
    
    // Extract permissions from adminRole for frontend use
    const permissions = adminRole?.permissions || null;
    
    return {
        ...user,
        isAdmin,
        isSuperAdmin,
        // Attach permissions for frontend permission checks
        permissions: permissions,
        // Attach adminRole for use in controllers/middleware
        _adminRole: adminRole,
    };
};


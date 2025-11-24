import mongoose from 'mongoose';

const adminRoleSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true,
            index: true,
        },
        role: {
            type: String,
            enum: ['super_admin', 'admin', 'moderator'],
            default: 'admin',
            required: true,
        },
        permissions: {
            // User Management - Granular permissions
            viewUsers: {
                type: Boolean,
                default: false,
            },
            editUsers: {
                type: Boolean,
                default: false,
            },
            deleteUsers: {
                type: Boolean,
                default: false,
            },
            banUsers: {
                type: Boolean,
                default: false,
            },
            unbanUsers: {
                type: Boolean,
                default: false,
            },
            
            // Image Management - Granular permissions
            viewImages: {
                type: Boolean,
                default: false,
            },
            editImages: {
                type: Boolean,
                default: false,
            },
            deleteImages: {
                type: Boolean,
                default: false,
            },
            moderateImages: {
                type: Boolean,
                default: false,
            },
            
            // Category Management - Granular permissions
            viewCategories: {
                type: Boolean,
                default: false,
            },
            createCategories: {
                type: Boolean,
                default: false,
            },
            editCategories: {
                type: Boolean,
                default: false,
            },
            deleteCategories: {
                type: Boolean,
                default: false,
            },
            
            // Admin Management - Granular permissions (only super_admin can delegate)
            viewAdmins: {
                type: Boolean,
                default: false,
            },
            createAdmins: {
                type: Boolean,
                default: false,
            },
            editAdmins: {
                type: Boolean,
                default: false,
            },
            deleteAdmins: {
                type: Boolean,
                default: false,
            },
            
            // Dashboard & Analytics
            viewDashboard: {
                type: Boolean,
                default: true,
            },
            viewAnalytics: {
                type: Boolean,
                default: false,
            },
            
            // Collections
            viewCollections: {
                type: Boolean,
                default: false,
            },
            manageCollections: {
                type: Boolean,
                default: false,
            },
            
            // Favorites Management
            manageFavorites: {
                type: Boolean,
                default: false,
            },
            
            // Content Moderation (general)
            moderateContent: {
                type: Boolean,
                default: false,
            },
            
            // System & Logs
            viewLogs: {
                type: Boolean,
                default: false,
            },
            exportData: {
                type: Boolean,
                default: false,
            },
            manageSettings: {
                type: Boolean,
                default: false,
            },
            
            // Legacy permissions (for backward compatibility)
            manageUsers: {
                type: Boolean,
                default: false,
            },
            manageImages: {
                type: Boolean,
                default: false,
            },
            manageCategories: {
                type: Boolean,
                default: false,
            },
            manageAdmins: {
                type: Boolean,
                default: false,
            },
        },
        grantedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
    },
    {
        timestamps: true,
    }
);

// Index for faster queries
adminRoleSchema.index({ userId: 1, role: 1 });

const AdminRole = mongoose.model('AdminRole', adminRoleSchema);

export default AdminRole;


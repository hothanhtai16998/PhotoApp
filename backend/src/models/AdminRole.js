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
            // User management
            manageUsers: {
                type: Boolean,
                default: false,
            },
            deleteUsers: {
                type: Boolean,
                default: false,
            },
            // Image management
            manageImages: {
                type: Boolean,
                default: false,
            },
            deleteImages: {
                type: Boolean,
                default: false,
            },
            // Category management
            manageCategories: {
                type: Boolean,
                default: false,
            },
            // Admin management (only super_admin can delegate)
            manageAdmins: {
                type: Boolean,
                default: false,
            },
            // View dashboard
            viewDashboard: {
                type: Boolean,
                default: true,
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


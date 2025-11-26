import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
    {
        recipient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        type: {
            type: String,
            required: true,
            enum: [
                'collection_invited',
                'collection_image_added',
                'collection_image_removed',
                'collection_permission_changed',
                'collection_removed',
            ],
            index: true,
        },
        collection: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Collection',
            required: true,
            index: true,
        },
        actor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            // User who performed the action (e.g., who invited, who added image)
        },
        image: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Image',
            // For image-related notifications
        },
        metadata: {
            type: mongoose.Schema.Types.Mixed,
            // Additional data like permission level, etc.
        },
        isRead: {
            type: Boolean,
            default: false,
            index: true,
        },
        readAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

// Compound indexes for common queries
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });

// Ensure virtuals are included in JSON
notificationSchema.set('toJSON', { virtuals: true });
notificationSchema.set('toObject', { virtuals: true });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;


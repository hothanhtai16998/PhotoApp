import mongoose from 'mongoose';

const imageSchema = new mongoose.Schema(
    {
        publicId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        imageTitle: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        imageUrl: {
            type: String,
            required: true,
        },
        // Multiple image sizes for progressive loading (like Unsplash)
        thumbnailUrl: {
            type: String,
            // Optional - will fallback to imageUrl if not set
        },
        smallUrl: {
            type: String,
            // Optional - will fallback to imageUrl if not set
        },
        regularUrl: {
            type: String,
            // Optional - will fallback to imageUrl if not set
        },
        imageCategory: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Category',
            required: true,
            index: true,
        },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        location: {
            type: String,
            trim: true,
            index: true,
        },
        cameraModel: {
            type: String,
            trim: true,
        },
        views: {
            type: Number,
            default: 0,
            min: 0,
        },
        downloads: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    {
        timestamps: true,
    }
);

// Compound index for common queries
imageSchema.index({ uploadedBy: 1, createdAt: -1 });
imageSchema.index({ imageCategory: 1, createdAt: -1 });

// Text index for fast full-text search (replaces slow regex queries)
imageSchema.index({
    imageTitle: 'text',
    location: 'text'
});

// Compound index for search + category queries
imageSchema.index({ imageCategory: 1, createdAt: -1, imageTitle: 1 });

const Image = mongoose.model('Image', imageSchema);

export default Image;
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
        // GPS coordinates for automatic location detection
        coordinates: {
            latitude: {
                type: Number,
                min: -90,
                max: 90,
            },
            longitude: {
                type: Number,
                min: -180,
                max: 180,
            },
        },
        cameraModel: {
            type: String,
            trim: true,
        },
        // Dominant colors extracted from image (for color filtering)
        dominantColors: {
            type: [String],
            default: [],
            enum: ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'brown', 'black', 'white', 'gray'],
        },
        // Tags/keywords for better searchability
        tags: {
            type: [String],
            default: [],
            index: true, // Index for fast tag-based searches
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
        // Track views per day (date string as key: "YYYY-MM-DD")
        dailyViews: {
            type: Map,
            of: Number,
            default: {},
        },
        // Track downloads per day (date string as key: "YYYY-MM-DD")
        dailyDownloads: {
            type: Map,
            of: Number,
            default: {},
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
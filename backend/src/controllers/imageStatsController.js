import mongoose from 'mongoose';
import Image from '../models/Image.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';

// Increment view count for an image
export const incrementView = asyncHandler(async (req, res) => {
    const imageId = req.params.imageId;

    if (!mongoose.Types.ObjectId.isValid(imageId)) {
        return res.status(400).json({ message: 'Invalid image ID' });
    }

    // Get current date in UTC as YYYY-MM-DD string
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0]; // Format: YYYY-MM-DD

    // Increment both total views and daily views
    const image = await Image.findByIdAndUpdate(
        imageId,
        {
            $inc: {
                views: 1,
                [`dailyViews.${todayStr}`]: 1,
            },
        },
        { new: true, runValidators: true }
    );

    if (!image) {
        return res.status(404).json({
            message: 'Không tìm thấy ảnh',
        });
    }

    // Convert dailyViews Map to plain object for JSON response
    const dailyViewsObj = image.dailyViews ? Object.fromEntries(image.dailyViews) : {};

    res.status(200).json({
        views: image.views,
        dailyViews: dailyViewsObj,
    });
});

// Increment download count for an image
export const incrementDownload = asyncHandler(async (req, res) => {
    const imageId = req.params.imageId;

    if (!mongoose.Types.ObjectId.isValid(imageId)) {
        return res.status(400).json({ message: 'Invalid image ID' });
    }

    // Get current date in UTC as YYYY-MM-DD string
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0]; // Format: YYYY-MM-DD

    // Increment both total downloads and daily downloads
    const image = await Image.findByIdAndUpdate(
        imageId,
        {
            $inc: {
                downloads: 1,
                [`dailyDownloads.${todayStr}`]: 1,
            },
        },
        { new: true, runValidators: true }
    );

    if (!image) {
        return res.status(404).json({
            message: 'Không tìm thấy ảnh',
        });
    }

    // Convert dailyDownloads Map to plain object for JSON response
    const dailyDownloadsObj = image.dailyDownloads ? Object.fromEntries(image.dailyDownloads) : {};

    res.status(200).json({
        downloads: image.downloads,
        dailyDownloads: dailyDownloadsObj,
    });
});


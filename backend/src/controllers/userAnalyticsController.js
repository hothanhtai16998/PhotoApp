import Image from '../models/Image.js';
import { asyncHandler } from '../middlewares/asyncHandler.js';
import { logger } from '../utils/logger.js';

/**
 * Get analytics data for a user's images
 * Returns: views/downloads over time, most popular images, geographic distribution, best performing categories
 */
export const getUserAnalytics = asyncHandler(async (req, res) => {
    const userId = req.user._id;
    const { days = 30 } = req.query; // Default to last 30 days

    // Validate days parameter
    const daysNum = Math.min(Math.max(1, parseInt(days) || 30), 365); // Between 1 and 365 days

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysNum);

    // Get all user's images with their stats
    const userImages = await Image.find({ uploadedBy: userId })
        .select('imageTitle views downloads dailyViews dailyDownloads location imageCategory createdAt imageUrl thumbnailUrl smallUrl')
        .populate('imageCategory', 'name')
        .lean();

    // 1. Views/Downloads over time (aggregate daily data)
    const viewsOverTime = {};
    const downloadsOverTime = {};

    userImages.forEach(image => {
        // Process dailyViews
        if (image.dailyViews) {
            const dailyViewsObj = image.dailyViews instanceof Map
                ? Object.fromEntries(image.dailyViews)
                : image.dailyViews;

            Object.entries(dailyViewsObj).forEach(([date, count]) => {
                if (date >= startDate.toISOString().split('T')[0] && date <= endDate.toISOString().split('T')[0]) {
                    viewsOverTime[date] = (viewsOverTime[date] || 0) + count;
                }
            });
        }

        // Process dailyDownloads
        if (image.dailyDownloads) {
            const dailyDownloadsObj = image.dailyDownloads instanceof Map
                ? Object.fromEntries(image.dailyDownloads)
                : image.dailyDownloads;

            Object.entries(dailyDownloadsObj).forEach(([date, count]) => {
                if (date >= startDate.toISOString().split('T')[0] && date <= endDate.toISOString().split('T')[0]) {
                    downloadsOverTime[date] = (downloadsOverTime[date] || 0) + count;
                }
            });
        }
    });

    // Find first date with actual data (for views and downloads separately)
    // Only consider dates within the selected period
    const viewsDates = Object.keys(viewsOverTime)
        .filter(date => {
            const dateObj = new Date(date);
            return viewsOverTime[date] > 0 && 
                   dateObj >= startDate && 
                   dateObj <= endDate;
        })
        .sort();
    
    const downloadsDates = Object.keys(downloadsOverTime)
        .filter(date => {
            const dateObj = new Date(date);
            return downloadsOverTime[date] > 0 && 
                   dateObj >= startDate && 
                   dateObj <= endDate;
        })
        .sort();
    
    const firstViewsDate = viewsDates.length > 0 ? new Date(viewsDates[0]) : null;
    const firstDownloadsDate = downloadsDates.length > 0 ? new Date(downloadsDates[0]) : null;
    
    // For views: start from first date with data (within period), or startDate if no data
    const viewsStartDate = firstViewsDate && firstViewsDate >= startDate ? firstViewsDate : startDate;
    
    // For downloads: start from first date with data (within period), or startDate if no data
    const downloadsStartDate = firstDownloadsDate && firstDownloadsDate >= startDate ? firstDownloadsDate : startDate;

    // Fill in missing dates from first data date (not from period start)
    const viewsDatesToFill = [];
    for (let d = new Date(viewsStartDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        viewsDatesToFill.push(dateStr);
        if (!viewsOverTime[dateStr]) viewsOverTime[dateStr] = 0;
    }

    const downloadsDatesToFill = [];
    for (let d = new Date(downloadsStartDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        downloadsDatesToFill.push(dateStr);
        if (!downloadsOverTime[dateStr]) downloadsOverTime[dateStr] = 0;
    }

    // Convert to array format for charting - only include dates from first data date
    const viewsData = viewsDatesToFill.map(date => ({
        date,
        value: viewsOverTime[date] || 0
    }));

    const downloadsData = downloadsDatesToFill.map(date => ({
        date,
        value: downloadsOverTime[date] || 0
    }));

    // 2. Most popular images (by views and downloads)
    const mostPopularImages = userImages
        .map(img => ({
            _id: img._id,
            imageTitle: img.imageTitle,
            imageUrl: img.imageUrl,
            thumbnailUrl: img.thumbnailUrl || img.smallUrl || img.imageUrl,
            smallUrl: img.smallUrl || img.imageUrl,
            views: img.views || 0,
            downloads: img.downloads || 0,
            totalEngagement: (img.views || 0) + (img.downloads || 0) * 2, // Downloads weighted 2x
            createdAt: img.createdAt,
        }))
        .sort((a, b) => b.totalEngagement - a.totalEngagement)
        .slice(0, 10); // Top 10

    // 3. Geographic distribution
    const geographicDistribution = {};
    userImages.forEach(image => {
        if (image.location) {
            // Extract country/region from location (simple approach)
            const locationParts = (image.location || '').split(',').map(s => String(s || '').trim());
            const country = locationParts[locationParts.length - 1] || image.location;

            if (!geographicDistribution[country]) {
                geographicDistribution[country] = {
                    location: country,
                    imageCount: 0,
                    totalViews: 0,
                    totalDownloads: 0,
                };
            }

            geographicDistribution[country].imageCount += 1;
            geographicDistribution[country].totalViews += image.views || 0;
            geographicDistribution[country].totalDownloads += image.downloads || 0;
        }
    });

    const geographicData = Object.values(geographicDistribution)
        .sort((a, b) => b.totalViews - a.totalViews)
        .slice(0, 10); // Top 10 locations

    // 4. Best performing categories
    const categoryPerformance = {};
    userImages.forEach(image => {
        const categoryName = image.imageCategory?.name || 'Unknown';

        if (!categoryPerformance[categoryName]) {
            categoryPerformance[categoryName] = {
                category: categoryName,
                imageCount: 0,
                totalViews: 0,
                totalDownloads: 0,
                avgViews: 0,
            };
        }

        categoryPerformance[categoryName].imageCount += 1;
        categoryPerformance[categoryName].totalViews += image.views || 0;
        categoryPerformance[categoryName].totalDownloads += image.downloads || 0;
    });

    // Calculate averages
    Object.values(categoryPerformance).forEach(cat => {
        cat.avgViews = cat.imageCount > 0 ? Math.round(cat.totalViews / cat.imageCount) : 0;
    });

    const categoryData = Object.values(categoryPerformance)
        .sort((a, b) => b.totalViews - a.totalViews)
        .slice(0, 10); // Top 10 categories

    // Calculate summary stats - use views from the selected period (sum all data within period)
    // Sum all values in viewsData and downloadsData (which now only include dates from first data date)
    const totalViews = viewsData.reduce((sum, item) => sum + item.value, 0);
    const totalDownloads = downloadsData.reduce((sum, item) => sum + item.value, 0);
    const totalImages = userImages.length;
    const avgViewsPerImage = totalImages > 0 ? Math.round(totalViews / totalImages) : 0;
    const avgDownloadsPerImage = totalImages > 0 ? Math.round(totalDownloads / totalImages) : 0;

    res.status(200).json({
        summary: {
            totalImages,
            totalViews,
            totalDownloads,
            avgViewsPerImage,
            avgDownloadsPerImage,
            period: `${daysNum} days`,
        },
        viewsOverTime: viewsData,
        downloadsOverTime: downloadsData,
        mostPopularImages,
        geographicDistribution: geographicData,
        bestPerformingCategories: categoryData,
    });
});



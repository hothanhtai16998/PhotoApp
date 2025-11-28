# analyticsService Explanation

## What is analyticsService?

`analyticsService` is a **service module** that provides analytics-related API methods. It handles fetching user analytics data including views, downloads, popular images, and geographic distribution.

## Key Features

### 1. **User Analytics**
- Summary statistics
- Time series data
- Popular images
- Geographic distribution
- Category performance

### 2. **Configurable Period**
- Days parameter (default: 30)
- Maximum 365 days
- Flexible analysis period

### 3. **Comprehensive Data**
- Views over time
- Downloads over time
- Most popular images
- Best performing categories

## Step-by-Step Breakdown

### Get User Analytics

```typescript
getUserAnalytics: async (days?: number): Promise<UserAnalytics> => {
  const params = days ? { days } : {};
  const res = await api.get('/users/analytics', {
    params,
    withCredentials: true,
  });
  return res.data;
},
```

**What this does:**
- Fetches user analytics
- Optional days parameter
- Default: 30 days
- Returns comprehensive analytics

### Analytics Data Structure

```typescript
export interface UserAnalytics {
  summary: AnalyticsSummary;
  viewsOverTime: TimeSeriesData[];
  downloadsOverTime: TimeSeriesData[];
  mostPopularImages: PopularImage[];
  geographicDistribution: GeographicData[];
  bestPerformingCategories: CategoryPerformance[];
}
```

**What this does:**
- Defines complete analytics structure
- Summary statistics
- Time series data
- Popular content
- Geographic data
- Category performance

### Summary Statistics

```typescript
export interface AnalyticsSummary {
  totalImages: number;
  totalViews: number;
  totalDownloads: number;
  avgViewsPerImage: number;
  avgDownloadsPerImage: number;
  period: string;
}
```

**What this does:**
- Defines summary structure
- Total counts
- Average metrics
- Analysis period

### Time Series Data

```typescript
export interface TimeSeriesData {
  date: string;
  value: number;
}
```

**What this does:**
- Defines time series structure
- Date and value
- Used for charts

### Popular Image

```typescript
export interface PopularImage {
  _id: string;
  imageTitle: string;
  views: number;
  downloads: number;
  totalEngagement: number;
  createdAt: string;
}
```

**What this does:**
- Defines popular image structure
- Engagement metrics
- Used for top images

## Usage Examples

### Get Analytics

```typescript
const analytics = await analyticsService.getUserAnalytics(30);
console.log(analytics.summary.totalViews);
```

### Custom Period

```typescript
const analytics = await analyticsService.getUserAnalytics(90);
// 90 days of analytics
```

### Access Data

```typescript
const analytics = await analyticsService.getUserAnalytics();

// Summary
console.log(analytics.summary.totalImages);

// Time series
analytics.viewsOverTime.forEach(data => {
  console.log(data.date, data.value);
});

// Popular images
analytics.mostPopularImages.forEach(image => {
  console.log(image.imageTitle, image.totalEngagement);
});
```

## Summary

**analyticsService** is the analytics service that:
1. ✅ Provides user analytics
2. ✅ Time series data
3. ✅ Popular content
4. ✅ Geographic distribution
5. ✅ Category performance

It's the "analytics API" - providing insights into user performance!


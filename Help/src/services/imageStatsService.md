# imageStatsService Explanation

## What is imageStatsService?

`imageStatsService` is a **service module** that provides image statistics-related API methods. It handles incrementing view counts and download counts for images.

## Key Features

### 1. **Statistics Tracking**
- Increment views
- Increment downloads
- Daily tracking
- Analytics support

### 2. **Simple API**
- PATCH requests
- No body needed
- Returns updated counts

### 3. **Analytics Integration**
- Used for analytics
- Daily tracking
- Performance metrics

## Step-by-Step Breakdown

### Increment View

```typescript
incrementView: async (imageId: string): Promise<IncrementViewResponse> => {
  const res = await api.patch(
    `/images/${imageId}/view`,
    {},
    {
      withCredentials: true,
    }
  );
  return res.data;
},
```

**What this does:**
- Increments view count
- Tracks daily views
- Returns updated counts
- Used when viewing image

### Increment Download

```typescript
incrementDownload: async (
  imageId: string
): Promise<IncrementDownloadResponse> => {
  const res = await api.patch(
    `/images/${imageId}/download`,
    {},
    {
      withCredentials: true,
    }
  );
  return res.data;
},
```

**What this does:**
- Increments download count
- Tracks daily downloads
- Returns updated counts
- Used when downloading image

### Response Types

```typescript
export interface IncrementViewResponse {
  views: number;
  dailyViews: Record<string, number>;
}

export interface IncrementDownloadResponse {
  downloads: number;
  dailyDownloads: Record<string, number>;
}
```

**What this does:**
- Returns total counts
- Returns daily tracking
- Used for analytics

## Usage Examples

### Increment View

```typescript
const response = await imageStatsService.incrementView(imageId);
console.log(response.views);
console.log(response.dailyViews);
```

### Increment Download

```typescript
const response = await imageStatsService.incrementDownload(imageId);
console.log(response.downloads);
```

## Summary

**imageStatsService** is the image statistics service that:
1. ✅ Tracks views
2. ✅ Tracks downloads
3. ✅ Daily tracking
4. ✅ Analytics support
5. ✅ Simple API

It's the "stats tracker" - tracking image engagement!


# imageFilters Explanation

## What is imageFilters?

`imageFilters` is a **utility module** that provides image filtering functions. It filters images by orientation, date range, and color using frontend logic.

## Key Features

### 1. **Orientation Filtering**
- Portrait/landscape/square
- Uses imageTypes map
- Frontend filtering

### 2. **Date Range Filtering**
- Filter by date range
- From/to dates
- End of day handling

### 3. **Color Filtering**
- Filter by dominant color
- Frontend fallback
- Backend preferred

## Step-by-Step Breakdown

### Filter by Orientation

```typescript
export const filterByOrientation = (_images: Image[]): Image[] => {
  // This function is kept for API compatibility but actual filtering
  // is done in applyImageFilters using imageTypes map
  return _images;
};
```

**What this does:**
- Placeholder function
- Actual filtering in applyImageFilters
- Kept for compatibility

### Filter by Date Range

```typescript
export const filterByDateRange = (images: Image[], dateFrom: string, dateTo: string): Image[] => {
  if (!dateFrom && !dateTo) return images;

  return images.filter(img => {
    if (!img.createdAt) return false;
    
    const imgDate = new Date(img.createdAt);
    const fromDate = dateFrom ? new Date(dateFrom) : null;
    const toDate = dateTo ? new Date(dateTo + 'T23:59:59') : null; // End of day

    if (fromDate && imgDate < fromDate) return false;
    if (toDate && imgDate > toDate) return false;
    
    return true;
  });
};
```

**What this does:**
- Filters images by date range
- Handles from/to dates
- End of day for toDate
- Returns filtered array

### Apply Image Filters

```typescript
export const applyImageFilters = (
  images: Image[],
  filters: SearchFilters,
  imageTypes: Map<string, 'portrait' | 'landscape'>
): Image[] => {
  let filtered = [...images];

  // Filter by orientation
  if (filters.orientation !== 'all') {
    filtered = filtered.filter(img => {
      const imgType = imageTypes.get(img._id);
      
      if (!imgType) {
        // Exclude undetermined images when filtering is active
        return false;
      }
      
      if (filters.orientation === 'portrait') {
        return imgType === 'portrait';
      } else if (filters.orientation === 'landscape') {
        return imgType === 'landscape';
      } else if (filters.orientation === 'square') {
        // Square detection would need actual dimensions
        return false; // Placeholder
      }
      return true;
    });
  }

  // Filter by date range
  filtered = filterByDateRange(filtered, filters.dateFrom, filters.dateTo);

  // Filter by color (frontend fallback)
  if (filters.color !== 'all') {
    filtered = filtered.filter(img => {
      if (!img.dominantColors || img.dominantColors.length === 0) {
        return false;
      }
      
      return img.dominantColors.includes(filters.color);
    });
  }

  return filtered;
};
```

**What this does:**
- Applies all filters
- Orientation filtering
- Date range filtering
- Color filtering (fallback)
- Returns filtered array

## Usage Examples

### Apply Filters

```typescript
import { applyImageFilters } from '@/utils/imageFilters';

const filtered = applyImageFilters(images, filters, imageTypes);
```

### Filter by Date

```typescript
import { filterByDateRange } from '@/utils/imageFilters';

const filtered = filterByDateRange(images, '2024-01-01', '2024-12-31');
```

## Note

- Color filtering is preferred on backend
- Frontend filtering is fallback
- Orientation uses imageTypes map
- Date filtering is frontend-only

## Summary

**imageFilters** is the image filtering utility that:
1. ✅ Filters by orientation
2. ✅ Filters by date range
3. ✅ Filters by color (fallback)
4. ✅ Uses imageTypes map
5. ✅ Frontend filtering

It's the "image filter" - filtering images client-side!


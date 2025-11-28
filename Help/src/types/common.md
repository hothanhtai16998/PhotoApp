# common Types Explanation

## What is common Types?

`common` types is a **TypeScript type definitions file** that defines common utility types used across the application. It includes coordinates and pagination interfaces.

## Key Features

### 1. **Geographic Types**
- Coordinates interface
- Latitude/longitude

### 2. **Pagination Types**
- Pagination metadata
- Page, limit, total, pages

### 3. **Reusable Types**
- Used across multiple modules
- Consistent structure

## Step-by-Step Breakdown

### Coordinates Interface

```typescript
export interface Coordinates {
  latitude: number;
  longitude: number;
}
```

**What this does:**
- Defines geographic coordinates
- Latitude and longitude
- Used for image location
- Used for geocoding

### Pagination Interface

```typescript
export interface Pagination {
  page: number;
  pages: number;
  total: number;
  limit: number;
}
```

**What this does:**
- Defines pagination metadata
- Current page number
- Total pages
- Total items
- Items per page

## Usage Examples

### Coordinates

```typescript
import type { Coordinates } from '@/types/common';

const coords: Coordinates = {
  latitude: 10.762622,
  longitude: 106.660172,
};
```

### Pagination

```typescript
import type { Pagination } from '@/types/common';

const pagination: Pagination = {
  page: 1,
  pages: 10,
  total: 100,
  limit: 10,
};
```

## Summary

**common types** is the common type definitions file that:
1. ✅ Defines Coordinates interface
2. ✅ Defines Pagination interface
3. ✅ Reusable types
4. ✅ Consistent structure
5. ✅ Easy to use

It's the "common types" - shared type definitions!


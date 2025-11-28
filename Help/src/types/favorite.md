# favorite Types Explanation

## What is favorite Types?

`favorite` types is a **TypeScript type definitions file** that defines all favorite-related types and interfaces. It provides type safety for favorite operations, responses, and batch checking.

## Key Features

### 1. **Response Types**
- Favorite response
- Favorites check response
- Favorites list response

### 2. **Type Safety**
- TypeScript interfaces
- Consistent structure
- Pagination support

### 3. **Batch Operations**
- Batch check response
- Map of image IDs to favorite status

## Step-by-Step Breakdown

### Favorite Response

```typescript
export interface FavoriteResponse {
  success: boolean;
  isFavorited: boolean;
  message: string;
}
```

**What this does:**
- Defines toggle favorite response
- Success flag
- Favorite status
- Optional message

### Favorites Check Response

```typescript
export interface FavoritesCheckResponse {
  success: boolean;
  favorites: Record<string, boolean>;
}
```

**What this does:**
- Defines batch check response
- Map of imageId -> isFavorited
- Used for batch checking
- Efficient for multiple images

### Favorites List Response

```typescript
export interface FavoritesListResponse {
  success: boolean;
  images: Image[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
```

**What this does:**
- Defines favorites list response
- Images array
- Pagination metadata
- Used for favorites page

## Usage Examples

### Favorite Response

```typescript
import type { FavoriteResponse } from '@/types/favorite';

const response: FavoriteResponse = await favoriteService.toggleFavorite(imageId);
console.log(response.isFavorited);
```

### Batch Check

```typescript
import type { FavoritesCheckResponse } from '@/types/favorite';

const response: FavoritesCheckResponse = await favoriteService.checkFavorites([
  'imageId1',
  'imageId2',
]);
console.log(response.favorites); // { imageId1: true, imageId2: false }
```

### Favorites List

```typescript
import type { FavoritesListResponse } from '@/types/favorite';

const response: FavoritesListResponse = await favoriteService.getFavorites({
  page: 1,
  limit: 20,
});
console.log(response.images);
console.log(response.pagination);
```

## Summary

**favorite types** is the favorite type definitions file that:
1. ✅ Defines favorite response types
2. ✅ Batch check types
3. ✅ List response types
4. ✅ Type safety
5. ✅ Consistent structure

It's the "favorite types" - ensuring type safety for favorites!


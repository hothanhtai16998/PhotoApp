# favoriteService Explanation

## What is favoriteService?

`favoriteService` is a **service module** that provides favorite-related API methods. It handles toggling favorites, fetching favorite images, and batch checking favorite status.

## Key Features

### 1. **Favorite Operations**
- Toggle favorite
- Get favorites list
- Batch check favorites

### 2. **Validation**
- Validates MongoDB ObjectId format
- Filters invalid IDs
- Error handling

### 3. **Pagination**
- Supports pagination
- Configurable limit
- Returns pagination metadata

## Step-by-Step Breakdown

### Toggle Favorite

```typescript
toggleFavorite: async (imageId: string): Promise<FavoriteResponse> => {
  const res = await api.post(`/favorites/${imageId}`, {}, {
    withCredentials: true,
  });
  return res.data;
},
```

**What this does:**
- Toggles favorite status
- POST to `/favorites/:imageId`
- Returns favorite response
- Requires authentication

### Get Favorites

```typescript
getFavorites: async (params?: {
  page?: number;
  limit?: number;
}): Promise<FavoritesListResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.page) {
    queryParams.append('page', params.page.toString());
  }
  if (params?.limit) {
    queryParams.append('limit', params.limit.toString());
  }

  const queryString = queryParams.toString();
  const url = queryString ? `/favorites?${queryString}` : '/favorites';

  const res = await api.get(url, {
    withCredentials: true,
  });
  return res.data;
},
```

**What this does:**
- Fetches user's favorites
- Supports pagination
- Builds query string
- Returns favorites list

### Batch Check Favorites

```typescript
checkFavorites: async (imageIds: string[]): Promise<FavoritesCheckResponse> => {
  // Validate array
  if (!Array.isArray(imageIds) || imageIds.length === 0) {
    throw new Error('imageIds must be a non-empty array');
  }
  
  // Validate MongoDB ObjectId format
  const isValidMongoId = (id: string): boolean => {
    return /^[0-9a-fA-F]{24}$/.test(String(id));
  };
  
  // Filter valid IDs
  const stringIds = imageIds
    .map(id => String(id).trim())
    .filter(id => id && isValidMongoId(id));
  
  if (stringIds.length === 0) {
    throw new Error('imageIds must contain at least one valid MongoDB ObjectId');
  }
  
  const res = await api.post('/favorites/check', { imageIds: stringIds }, {
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return res.data;
},
```

**What this does:**
- Validates input array
- Validates MongoDB ObjectId format
- Filters invalid IDs
- Batch checks favorite status
- Returns map of imageId -> isFavorited

## Usage Examples

### Toggle Favorite

```typescript
const response = await favoriteService.toggleFavorite(imageId);
console.log(response.isFavorited);
```

### Get Favorites

```typescript
const response = await favoriteService.getFavorites({
  page: 1,
  limit: 20,
});
```

### Batch Check

```typescript
const response = await favoriteService.checkFavorites([
  'imageId1',
  'imageId2',
  'imageId3',
]);
console.log(response.favorites); // { imageId1: true, imageId2: false, ... }
```

## Summary

**favoriteService** is the favorite management service that:
1. ✅ Toggles favorite status
2. ✅ Fetches favorites with pagination
3. ✅ Batch checks favorite status
4. ✅ Validates MongoDB ObjectIds
5. ✅ Type-safe interfaces

It's the "favorites API" - managing user favorites!


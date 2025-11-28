# collectionFavoriteService Explanation

## What is collectionFavoriteService?

`collectionFavoriteService` is a **service module** that provides collection favorite-related API methods. It handles toggling collection favorites, fetching favorite collections, and batch checking favorite status.

## Key Features

### 1. **Collection Favorite Operations**
- Toggle favorite
- Get favorite collections
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
toggleFavorite: async (collectionId: string): Promise<CollectionFavoriteResponse> => {
  const res = await api.post(`/collection-favorites/${collectionId}`, {}, {
    withCredentials: true,
  });
  return res.data;
},
```

**What this does:**
- Toggles collection favorite status
- POST to `/collection-favorites/:collectionId`
- Returns favorite response
- Requires authentication

### Get Favorite Collections

```typescript
getFavoriteCollections: async (params?: {
  page?: number;
  limit?: number;
}): Promise<CollectionFavoritesListResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.page) {
    queryParams.append('page', params.page.toString());
  }
  if (params?.limit) {
    queryParams.append('limit', params.limit.toString());
  }

  const queryString = queryParams.toString();
  const url = queryString ? `/collection-favorites?${queryString}` : '/collection-favorites';

  const res = await api.get(url, {
    withCredentials: true,
  });
  return res.data;
},
```

**What this does:**
- Fetches user's favorite collections
- Supports pagination
- Builds query string
- Returns collections list

### Batch Check Favorites

```typescript
checkFavorites: async (collectionIds: string[]): Promise<CollectionFavoritesCheckResponse> => {
  // Validate array
  if (!Array.isArray(collectionIds) || collectionIds.length === 0) {
    throw new Error('collectionIds must be a non-empty array');
  }
  
  // Validate MongoDB ObjectId format
  const isValidMongoId = (id: string): boolean => {
    return /^[0-9a-fA-F]{24}$/.test(String(id));
  };
  
  // Filter valid IDs
  const stringIds = collectionIds
    .map(id => String(id).trim())
    .filter(id => id && isValidMongoId(id));
  
  if (stringIds.length === 0) {
    throw new Error('collectionIds must contain at least one valid MongoDB ObjectId');
  }
  
  const res = await api.post('/collection-favorites/check', { collectionIds: stringIds }, {
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
- Returns map of collectionId -> isFavorited

## Usage Examples

### Toggle Favorite

```typescript
const response = await collectionFavoriteService.toggleFavorite(collectionId);
console.log(response.isFavorited);
```

### Get Favorite Collections

```typescript
const response = await collectionFavoriteService.getFavoriteCollections({
  page: 1,
  limit: 20,
});
```

### Batch Check

```typescript
const response = await collectionFavoriteService.checkFavorites([
  'collectionId1',
  'collectionId2',
  'collectionId3',
]);
console.log(response.favorites); // { collectionId1: true, collectionId2: false, ... }
```

## Summary

**collectionFavoriteService** is the collection favorite management service that:
1. ✅ Toggles collection favorite status
2. ✅ Fetches favorite collections with pagination
3. ✅ Batch checks favorite status
4. ✅ Validates MongoDB ObjectIds
5. ✅ Type-safe interfaces

It's the "collection favorites API" - managing collection favorites!


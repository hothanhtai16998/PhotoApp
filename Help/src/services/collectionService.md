# collectionService Explanation

## What is collectionService?

`collectionService` is a **service module** that provides collection-related API methods. It handles creating, updating, deleting collections, managing images in collections, and collection operations.

## Key Features

### 1. **Collection CRUD**
- Get user collections
- Get collection by ID
- Create collection
- Update collection
- Delete collection

### 2. **Image Management**
- Add image to collection
- Remove image from collection
- Reorder images
- Get collections containing image

### 3. **Collection Operations**
- Track collection share
- Export collection as ZIP
- Request cancellation support

## Step-by-Step Breakdown

### Get User Collections

```typescript
getUserCollections: async (signal?: AbortSignal): Promise<Collection[]> => {
  const response = await api.get<CollectionResponse>('/collections', {
    signal, // Pass abort signal for request cancellation
  });
  if (response.data.success && response.data.collections) {
    return response.data.collections;
  }
  throw new Error('Failed to fetch collections');
},
```

**What this does:**
- Fetches all user collections
- Supports request cancellation
- Returns collections array
- Throws on error

### Get Collection by ID

```typescript
getCollectionById: async (collectionId: string): Promise<Collection> => {
  const response = await api.get<CollectionResponse>(`/collections/${collectionId}`);
  if (response.data.success && response.data.collection) {
    return response.data.collection;
  }
  throw new Error('Failed to fetch collection');
},
```

**What this does:**
- Fetches single collection
- Returns collection data
- Throws on error

### Create Collection

```typescript
createCollection: async (data: CreateCollectionData): Promise<Collection> => {
  const response = await api.post<CollectionResponse>('/collections', data);
  if (response.data.success && response.data.collection) {
    return response.data.collection;
  }
  throw new Error(response.data.message || 'Failed to create collection');
},
```

**What this does:**
- Creates new collection
- Returns created collection
- Handles errors

### Add/Remove Images

```typescript
addImageToCollection: async (
  collectionId: string,
  imageId: string
): Promise<Collection> => {
  const response = await api.post<CollectionResponse>(
    `/collections/${collectionId}/images`,
    { imageId }
  );
  // Returns updated collection
},

removeImageFromCollection: async (
  collectionId: string,
  imageId: string
): Promise<Collection> => {
  const response = await api.delete<CollectionResponse>(
    `/collections/${collectionId}/images/${imageId}`
  );
  // Returns updated collection
},
```

**What this does:**
- Adds image to collection
- Removes image from collection
- Returns updated collection

### Reorder Images

```typescript
reorderCollectionImages: async (
  collectionId: string,
  imageIds: string[]
): Promise<Collection> => {
  const response = await api.patch<CollectionResponse>(
    `/collections/${collectionId}/images/reorder`,
    { imageIds }
  );
  // Returns updated collection with new order
},
```

**What this does:**
- Reorders images in collection
- Takes array of image IDs
- Returns updated collection

### Export Collection

```typescript
exportCollection: async (collectionId: string): Promise<Blob> => {
  const response = await api.get(`/collections/${collectionId}/export`, {
    responseType: 'blob',
  });
  return response.data;
},
```

**What this does:**
- Exports collection as ZIP
- Returns Blob
- Used for download

## Usage Examples

### Get Collections

```typescript
const collections = await collectionService.getUserCollections();
```

### Create Collection

```typescript
const collection = await collectionService.createCollection({
  name: 'My Collection',
  description: 'My favorite photos',
  isPublic: true,
});
```

### Add Image

```typescript
const updated = await collectionService.addImageToCollection(collectionId, imageId);
```

### Reorder Images

```typescript
const updated = await collectionService.reorderCollectionImages(collectionId, [
  'imageId1',
  'imageId2',
  'imageId3',
]);
```

## Summary

**collectionService** is the collection management service that:
1. ✅ Full CRUD operations
2. ✅ Image management
3. ✅ Reordering support
4. ✅ Export functionality
5. ✅ Request cancellation

It's the "collection API" - managing all collection operations!


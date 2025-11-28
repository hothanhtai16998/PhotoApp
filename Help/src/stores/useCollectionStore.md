# useCollectionStore Explanation

## What is useCollectionStore?

`useCollectionStore` is a **Zustand store** that manages collection data, favorite status, and version history. It provides methods to fetch, update, delete collections, and manage collection versions.

## Key Features

### 1. **Collection Management**
- Stores current collection
- Loading states
- Error handling

### 2. **Favorite Status**
- Tracks if collection is favorited
- Toggle favorite
- Loading state for toggle

### 3. **Version History**
- Fetches collection versions
- Restore previous versions
- Loading state for versions

### 4. **Cover Image**
- Set cover image
- Loading state for update
- Visual feedback

## Step-by-Step Breakdown

### Fetch Collection

```typescript
fetchCollection: async (collectionId: string) => {
  set((state) => {
    state.loading = true;
    state.error = null;
  });

  try {
    const data = await collectionService.getCollectionById(collectionId);
    set((state) => {
      state.collection = data;
      state.loading = false;
    });

    // Check favorite status
    try {
      const favoritesResponse = await collectionFavoriteService.checkFavorites([collectionId]);
      set((state) => {
        state.isFavorited = favoritesResponse.favorites[collectionId] ?? false;
      });
    } catch (error) {
      console.error('Failed to check favorite status:', error);
    }
  } catch (error) {
    // Error handling...
  }
},
```

**What this does:**
- Fetches collection from API
- Checks favorite status
- Updates state
- Handles errors

### Update Collection

```typescript
updateCollection: async (
  collectionId: string,
  data: {
    name?: string;
    description?: string;
    isPublic?: boolean;
    coverImage?: string | null;
    tags?: string[];
  }
) => {
  try {
    const updatedCollection = await collectionService.updateCollection(collectionId, data);
    set((state) => {
      state.collection = updatedCollection;
    });
  } catch (error) {
    // Error handling...
  }
},
```

**What this does:**
- Updates collection via API
- Updates state with new data
- Handles errors

### Toggle Favorite

```typescript
toggleFavorite: async (collectionId: string) => {
  if (get().togglingFavorite) return;

  set((state) => {
    state.togglingFavorite = true;
  });

  try {
    const response = await collectionFavoriteService.toggleFavorite(collectionId);
    set((state) => {
      state.isFavorited = response.isFavorited;
      state.togglingFavorite = false;
    });

    toast.success(
      response.isFavorited ? 'Đã thêm vào yêu thích' : 'Đã xóa khỏi yêu thích'
    );
  } catch (error) {
    // Error handling...
  }
},
```

**What this does:**
- Prevents double-clicks
- Toggles favorite status
- Shows success message
- Handles errors

### Set Cover Image

```typescript
setCoverImage: async (collectionId: string, imageId: string) => {
  set((state) => {
    state.updatingCover = imageId;
  });

  try {
    const updatedCollection = await collectionService.updateCollection(collectionId, {
      coverImage: imageId,
    });

    set((state) => {
      state.collection = updatedCollection;
      state.updatingCover = null;
    });

    toast.success('Đã đặt ảnh làm ảnh bìa');
  } catch (error) {
    // Error handling...
  }
},
```

**What this does:**
- Sets loading state for specific image
- Updates collection cover
- Shows success message
- Clears loading state

### Version History

```typescript
fetchVersions: async (collectionId: string) => {
  set((state) => {
    state.loadingVersions = true;
  });

  try {
    const versionsData = await collectionVersionService.getCollectionVersions(collectionId);
    set((state) => {
      state.versions = versionsData;
      state.loadingVersions = false;
    });
  } catch (error) {
    // Error handling...
  }
},

restoreVersion: async (collectionId: string, versionNumber: number) => {
  try {
    const restoredCollection = await collectionVersionService.restoreCollectionVersion(
      collectionId,
      versionNumber
    );

    set((state) => {
      state.collection = restoredCollection as unknown as Collection;
    });

    await get().fetchVersions(collectionId);
    toast.success(`Đã khôi phục về phiên bản ${versionNumber}`);
  } catch (error) {
    // Error handling...
  }
},
```

**What this does:**
- Fetches version history
- Restores previous version
- Reloads versions after restore
- Shows success message

## Summary

**useCollectionStore** is the collection state management store that:
1. ✅ Manages collection data
2. ✅ Tracks favorite status
3. ✅ Handles version history
4. ✅ Manages cover image
5. ✅ Error handling

It's the "collection manager" - handling all collection operations!


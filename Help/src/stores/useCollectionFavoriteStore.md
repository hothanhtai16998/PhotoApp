# useCollectionFavoriteStore Explanation

## What is useCollectionFavoriteStore?

`useCollectionFavoriteStore` is a **Zustand store** that manages collection favorite statuses. It handles checking favorites, toggling favorites, and maintaining favorite state.

## Key Features

### 1. **Favorite Status Management**
- Stores favorite statuses
- Batch checking
- Toggle favorite
- Loading state

### 2. **State Management**
- Map of collectionId -> isFavorited
- Toggling state
- Clear favorites

### 3. **Error Handling**
- Handles errors gracefully
- Shows toast messages
- Resets state on error

## Step-by-Step Breakdown

### Check Favorites

```typescript
checkFavorites: async (collectionIds: string[]) => {
  if (collectionIds.length === 0) return;

  try {
    const favoritesResponse = await collectionFavoriteService.checkFavorites(collectionIds);
    set((state) => {
      state.favoriteStatuses = {
        ...state.favoriteStatuses,
        ...favoritesResponse.favorites,
      };
    });
  } catch (error) {
    console.error('Failed to check favorite statuses:', error);
  }
},
```

**What this does:**
- Batch checks favorite status
- Merges with existing statuses
- Silent error handling
- Used for initial load

### Toggle Favorite

```typescript
toggleFavorite: async (collectionId: string) => {
  set((state) => {
    state.togglingFavoriteId = collectionId;
  });

  try {
    const response = await collectionFavoriteService.toggleFavorite(collectionId);
    set((state) => {
      state.favoriteStatuses[collectionId] = response.isFavorited;
      state.togglingFavoriteId = null;
    });

    toast.success(
      response.isFavorited ? 'Đã thêm vào yêu thích' : 'Đã xóa khỏi yêu thích'
    );
  } catch (error) {
    set((state) => {
      state.togglingFavoriteId = null;
    });
    toast.error('Không thể cập nhật yêu thích. Vui lòng thử lại.');
    throw error;
  }
},
```

**What this does:**
- Sets loading state
- Toggles favorite via API
- Updates local state
- Shows success/error message
- Handles errors

### Clear Favorites

```typescript
clearFavorites: () => {
  set((state) => {
    state.favoriteStatuses = {};
    state.togglingFavoriteId = null;
  });
},
```

**What this does:**
- Clears all favorite statuses
- Resets toggling state
- Used on logout

## Usage Examples

### Check Favorites

```typescript
const { checkFavorites } = useCollectionFavoriteStore();

useEffect(() => {
  if (collections.length > 0) {
    const ids = collections.map(c => c._id);
    checkFavorites(ids);
  }
}, [collections]);
```

### Toggle Favorite

```typescript
const { toggleFavorite, favoriteStatuses, togglingFavoriteId } = useCollectionFavoriteStore();

const handleToggle = async () => {
  await toggleFavorite(collectionId);
};

const isFavorited = favoriteStatuses[collectionId] ?? false;
const isLoading = togglingFavoriteId === collectionId;
```

## Summary

**useCollectionFavoriteStore** is the collection favorite store that:
1. ✅ Manages favorite statuses
2. ✅ Batch checking
3. ✅ Toggle favorite
4. ✅ Loading states
5. ✅ Error handling

It's the "collection favorites manager" - handling collection favorite operations!


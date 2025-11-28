# useFavoriteStore Explanation

## What is useFavoriteStore?

`useFavoriteStore` is a **Zustand store** that manages favorite images. It provides methods to fetch favorites, track image types (portrait/landscape), and update favorite images.

## Key Features

### 1. **Favorite Management**
- Stores favorite images
- Pagination support
- Loading states

### 2. **Image Type Tracking**
- Tracks portrait/landscape
- Used for layout optimization
- Map-based storage

### 3. **Update Support**
- Updates individual images
- Clears favorites
- Maintains state consistency

## Step-by-Step Breakdown

### Store Structure

```typescript
export const useFavoriteStore = create(
  immer<FavoriteState>((set) => ({
    images: [],
    loading: false,
    pagination: null,
    currentPage: 1,
    imageTypes: new Map<string, 'portrait' | 'landscape'>(),

    fetchFavorites: async (page = 1) => { /* ... */ },
    setImageType: (imageId: string, type: 'portrait' | 'landscape') => { /* ... */ },
    updateImage: (imageId: string, updatedImage: Image) => { /* ... */ },
    clearFavorites: () => { /* ... */ },
  }))
);
```

**What this does:**
- Stores favorite images array
- Tracks pagination
- Maps image IDs to types
- Provides CRUD methods

### Fetch Favorites

```typescript
fetchFavorites: async (page = 1) => {
  set((state) => {
    state.loading = true;
  });

  try {
    const response = await favoriteService.getFavorites({
      page,
      limit: 20,
    });

    set((state) => {
      state.images = response.images || [];
      state.pagination = response.pagination || null;
      state.currentPage = page;
      state.loading = false;
    });
  } catch (error) {
    console.error('Failed to fetch favorites:', error);
    set((state) => {
      state.loading = false;
    });
    throw error;
  }
},
```

**What this does:**
- Fetches favorites from API
- Sets loading state
- Updates images and pagination
- Handles errors
- Throws error for component handling

### Set Image Type

```typescript
setImageType: (imageId: string, type: 'portrait' | 'landscape') => {
  set((state) => {
    if (!state.imageTypes.has(imageId)) {
      state.imageTypes.set(imageId, type);
    }
  });
},
```

**What this does:**
- Stores image type in map
- Only sets if not already set
- Used for layout optimization
- Prevents overwriting

### Update Image

```typescript
updateImage: (imageId: string, updatedImage: Image) => {
  set((state) => {
    const index = state.images.findIndex((img) => img._id === imageId);
    if (index !== -1) {
      state.images[index] = updatedImage;
    }
  });
},
```

**What this does:**
- Updates image in array
- Finds by ID
- Replaces with updated image
- Maintains array order

### Clear Favorites

```typescript
clearFavorites: () => {
  set((state) => {
    state.images = [];
    state.pagination = null;
    state.currentPage = 1;
    state.imageTypes.clear();
  });
},
```

**What this does:**
- Clears all favorites
- Resets pagination
- Clears image types map
- Used on logout

## Usage Examples

### Fetch Favorites

```typescript
const { images, loading, fetchFavorites } = useFavoriteStore();

useEffect(() => {
  fetchFavorites(1);
}, []);
```

### Track Image Type

```typescript
const { setImageType } = useFavoriteStore();

const handleImageLoad = (imageId: string, width: number, height: number) => {
  const type = width > height ? 'landscape' : 'portrait';
  setImageType(imageId, type);
};
```

### Update Image

```typescript
const { updateImage } = useFavoriteStore();

const handleImageUpdate = (imageId: string, updatedImage: Image) => {
  updateImage(imageId, updatedImage);
};
```

## Summary

**useFavoriteStore** is the favorite images store that:
1. ✅ Manages favorite images
2. ✅ Tracks image types
3. ✅ Supports pagination
4. ✅ Updates individual images
5. ✅ Easy to use

It's the "favorites manager" - keeping track of liked images!


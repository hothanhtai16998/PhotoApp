# useUserImageStore Explanation

## What is useUserImageStore?

`useUserImageStore` is a **Zustand store** that manages user images for profile pages. It handles fetching user images, tracking image types, and counting photos vs illustrations.

## Key Features

### 1. **Image Management**
- Fetch user images
- Update image
- Clear images
- Image type tracking

### 2. **Content Counting**
- Photos count
- Illustrations count
- Category-based classification

### 3. **Request Cancellation**
- Supports AbortSignal
- Prevents race conditions
- Better performance

## Step-by-Step Breakdown

### Fetch User Images

```typescript
fetchUserImages: async (userId: string, refresh = false, signal?: AbortSignal) => {
  set((state) => {
    state.loading = true;
  });

  try {
    const response = await imageService.fetchUserImages(
      userId,
      {
        page: 1,
        limit: 30, // Load first 30 images only for initial render
        ...(refresh ? { _refresh: true } : {}),
      },
      signal
    );

    const userImages = response.images || [];

    set((state) => {
      state.images = userImages;
      state.loading = false;

      // Count photos and illustrations
      const photos = userImages.filter((img) => {
        const categoryName = typeof img.imageCategory === 'string'
          ? img.imageCategory
          : img.imageCategory?.name;
        return (
          categoryName &&
          !categoryName.toLowerCase().includes('illustration') &&
          !categoryName.toLowerCase().includes('svg')
        );
      });

      const illustrations = userImages.filter((img) => {
        const categoryName = typeof img.imageCategory === 'string'
          ? img.imageCategory
          : img.imageCategory?.name;
        return (
          categoryName &&
          (categoryName.toLowerCase().includes('illustration') ||
           categoryName.toLowerCase().includes('svg'))
        );
      });

      state.photosCount = photos.length;
      state.illustrationsCount = illustrations.length;
    });
  } catch (error) {
    // Ignore cancelled requests
    if (axios.isCancel(error) || (error as { code?: string })?.code === 'ERR_CANCELED') {
      return;
    }
    // Handle error...
  }
},
```

**What this does:**
- Fetches user images
- Supports refresh flag
- Supports request cancellation
- Counts photos vs illustrations
- Classifies by category

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
- Tracks image orientation
- Used for layout optimization
- Only sets if not already set

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

### Clear Images

```typescript
clearImages: () => {
  set((state) => {
    state.images = [];
    state.photosCount = 0;
    state.illustrationsCount = 0;
    state.imageTypes.clear();
  });
},
```

**What this does:**
- Clears all images
- Resets counts
- Clears image types
- Used on navigation

## Usage Examples

### Fetch Images

```typescript
const { images, loading, fetchUserImages } = useUserImageStore();

useEffect(() => {
  const signal = useRequestCancellation();
  fetchUserImages(userId, false, signal);
}, [userId]);
```

### Access Counts

```typescript
const { photosCount, illustrationsCount } = useUserImageStore();

<div>
  <span>{photosCount} Photos</span>
  <span>{illustrationsCount} Illustrations</span>
</div>
```

## Summary

**useUserImageStore** is the user image store that:
1. ✅ Manages user images
2. ✅ Counts photos/illustrations
3. ✅ Tracks image types
4. ✅ Request cancellation
5. ✅ Update support

It's the "user image manager" - handling user profile images!


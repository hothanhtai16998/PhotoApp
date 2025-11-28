# useImageStore Explanation

## What is useImageStore?

`useImageStore` is a **Zustand store** that manages image data, pagination, upload progress, and filtering. It handles fetching, uploading, and removing images with smart caching and merge strategies.

## Key Features

### 1. **Image Management**
- Stores image list
- Pagination support
- Loading states
- Error handling

### 2. **Upload Progress**
- Tracks upload progress (0-100%)
- Simulates S3 upload progress
- Visual feedback

### 3. **Smart Caching**
- Preserves recent uploads
- Filters deleted images
- Cache-busting on category/search change
- Merge strategies

### 4. **Filtering**
- Category filter
- Search filter
- Location filter
- Color filter

## Step-by-Step Breakdown

### Upload Image

```typescript
uploadImage: async (data: UploadImageData) => {
  set((state) => {
    state.loading = true;
    state.uploadProgress = 0;
  });

  try {
    const response = await imageService.uploadImage(data, (progress) => {
      set((state) => {
        state.uploadProgress = progress; // 0-85%
      });
    });

    // Simulate S3 upload (85-95%)
    let s3Progress = 85;
    progressInterval = setInterval(() => {
      s3Progress += 1;
      if (s3Progress < 95) {
        set((state) => {
          state.uploadProgress = s3Progress;
        });
      }
    }, 500);

    // Backend response = S3 upload complete
    set((state) => {
      const uploadedImage = {
        ...response.image,
        createdAt: response.image.createdAt || new Date().toISOString(),
      };
      
      // Only add if approved
      if (uploadedImage.moderationStatus === 'approved' || 
          !uploadedImage.moderationStatus) {
        state.images.unshift(uploadedImage);
      }
      
      state.uploadProgress = 100;
      state.loading = false;
    });
  } catch (error) {
    // Error handling...
  }
},
```

**What this does:**
- Tracks upload progress
- Simulates S3 upload
- Adds image to store if approved
- Shows appropriate message

### Fetch Images

```typescript
fetchImages: async (params?: FetchImagesParams, signal?: AbortSignal) => {
  // Prevent concurrent requests
  let shouldProceed = false;
  
  set((state) => {
    if (state.loading && !params?._refresh) {
      shouldProceed = false;
      return;
    }
    state.loading = true;
    shouldProceed = true;

    // Clear images on new query
    if (categoryChanged || searchChanged || locationChanged || params?.page === 1) {
      state.images = [];
    }
  });

  if (!shouldProceed) return;

  try {
    const response = await imageService.fetchImages(fetchParams, signal);
    
    set((state) => {
      // Filter deleted images
      const deletedIdsSet = new Set(state.deletedImageIds);
      const newImages = response.images.filter(
        (img: Image) => !deletedIdsSet.has(img._id)
      );

      const isNewQuery = params?.search !== undefined || 
                        params?.category !== undefined ||
                        params?.page === 1;

      if (isNewQuery) {
        // Preserve recent uploads (last 15 minutes)
        const recentUploads = state.images.filter((img) => {
          const uploadTime = new Date(img.createdAt).getTime();
          const isRecent = Date.now() - uploadTime < 900000; // 15 min
          if (isRecent) {
            // Check category match if filtering
            if (params?.category !== undefined) {
              return img.imageCategory?.name === params.category;
            }
            return true;
          }
          return false;
        });

        // Merge: recent uploads + fetched images
        const fetchedIds = new Set(newImages.map((img) => img._id));
        const uniqueRecentUploads = recentUploads.filter(
          (img) => !fetchedIds.has(img._id)
        );

        state.images = [...uniqueRecentUploads, ...newImages];
      } else {
        // Pagination - append
        const existingIds = new Set(state.images.map((img) => img._id));
        const uniqueNewImages = newImages.filter(
          (img) => !existingIds.has(img._id)
        );
        state.images = [...state.images, ...uniqueNewImages];
      }

      state.pagination = response.pagination;
      state.loading = false;
    });
  } catch (error) {
    // Handle errors...
  }
},
```

**What this does:**
- Prevents concurrent requests
- Clears on new query
- Preserves recent uploads
- Filters deleted images
- Merges for pagination
- Handles cancellation

### Remove Image

```typescript
removeImage: (imageId: string) => {
  set((state) => {
    // Add to deleted IDs
    if (!state.deletedImageIds.includes(imageId)) {
      state.deletedImageIds.push(imageId);
    }

    // Limit to last 1000 deletions
    if (state.deletedImageIds.length > 1000) {
      state.deletedImageIds = state.deletedImageIds.slice(-1000);
    }

    // Remove from current images
    state.images = state.images.filter((img) => img._id !== imageId);

    // Update pagination
    if (state.pagination) {
      state.pagination.total = Math.max(0, state.pagination.total - 1);
    }
  });
},
```

**What this does:**
- Adds to deleted IDs list
- Removes from current images
- Updates pagination total
- Prevents memory leak (limits array)

## Summary

**useImageStore** is the image state management store that:
1. ✅ Manages image list and pagination
2. ✅ Tracks upload progress
3. ✅ Smart caching and merging
4. ✅ Filters deleted images
5. ✅ Preserves recent uploads

It's the "image manager" - handling all image operations!


# imageService Explanation

## What is imageService?

`imageService` is a **service module** that re-exports all image-related services for backward compatibility. It provides a unified interface for image upload, fetch, update, and stats operations.

## Key Features

### 1. **Unified Interface**
- Single import for all image operations
- Backward compatible
- Organized by operation type

### 2. **Service Organization**
- `imageUploadService` - Upload operations
- `imageFetchService` - Fetch operations
- `imageUpdateService` - Update operations
- `imageStatsService` - Stats operations

### 3. **Re-exports**
- Exports individual services
- Maintains compatibility
- Easy migration path

## Step-by-Step Breakdown

### Service Structure

```typescript
export const imageService = {
  // Upload operations
  preUploadImage: imageUploadService.preUploadImage,
  finalizeImageUpload: imageUploadService.finalizeImageUpload,
  uploadImage: imageUploadService.uploadImage,
  createBulkUploadNotification: imageUploadService.createBulkUploadNotification,

  // Fetch operations
  fetchImages: imageFetchService.fetchImages,
  fetchUserImages: imageFetchService.fetchUserImages,
  fetchLocations: imageFetchService.fetchLocations,

  // Update operations
  updateImage: imageUpdateService.updateImage,
  updateImageWithFile: imageUpdateService.updateImageWithFile,
  batchUpdateImages: imageUpdateService.batchUpdateImages,

  // Stats operations
  incrementView: imageStatsService.incrementView,
  incrementDownload: imageStatsService.incrementDownload,
};
```

**What this does:**
- Re-exports all methods from split services
- Groups by operation type
- Maintains backward compatibility

### Individual Service Exports

```typescript
export { imageUploadService } from './imageUploadService';
export { imageFetchService } from './imageFetchService';
export { imageUpdateService } from './imageUpdateService';
export { imageStatsService } from './imageStatsService';
```

**What this does:**
- Exports individual services
- Allows direct imports
- Better for new code

## Usage Examples

### Using Unified Service

```typescript
import { imageService } from '@/services/imageService';

// Upload
await imageService.uploadImage(data);

// Fetch
const images = await imageService.fetchImages({ page: 1 });

// Update
await imageService.updateImage(imageId, data);

// Stats
await imageService.incrementView(imageId);
```

### Using Individual Services

```typescript
import { imageUploadService, imageFetchService } from '@/services/imageService';

// Upload
await imageUploadService.uploadImage(data);

// Fetch
const images = await imageFetchService.fetchImages({ page: 1 });
```

## Why Split Services?

1. **Better Organization** - Each service has a single responsibility
2. **Smaller Bundles** - Tree-shaking works better
3. **Easier Maintenance** - Changes are isolated
4. **Backward Compatible** - Old code still works

## Summary

**imageService** is the unified image service that:
1. ✅ Re-exports all image operations
2. ✅ Maintains backward compatibility
3. ✅ Organized by operation type
4. ✅ Exports individual services
5. ✅ Easy to use

It's the "image API" - providing all image operations!


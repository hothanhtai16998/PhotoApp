# imageUploadService Explanation

## What is imageUploadService?

`imageUploadService` is a **service module** that provides image upload-related API methods. It handles pre-upload (S3 upload), finalize (database record), legacy upload, and bulk upload notifications.

## Key Features

### 1. **Two-Phase Upload**
- Pre-upload: Upload to S3 only
- Finalize: Create database record
- Better error handling

### 2. **Progress Tracking**
- Upload progress callback
- HTTP upload progress (0-85%)
- S3 processing simulation (85-100%)

### 3. **Legacy Support**
- Legacy upload method
- Backward compatible
- Single-phase upload

### 4. **Bulk Operations**
- Bulk upload notifications
- Success/failure tracking

## Step-by-Step Breakdown

### Pre-Upload Image

```typescript
preUploadImage: async (
  imageFile: File,
  onUploadProgress?: (progress: number) => void
): Promise<PreUploadResponse> => {
  const formData = new FormData();
  formData.append('image', imageFile);

  const res = await api.post('/images/pre-upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    withCredentials: true,
    timeout: 120000, // 2 minutes
    onUploadProgress: (progressEvent) => {
      if (onUploadProgress && progressEvent.total) {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onUploadProgress(percentCompleted);
      }
    },
  });

  return res.data;
},
```

**What this does:**
- Uploads image to S3 only
- No database record yet
- Tracks upload progress
- Returns pre-upload response with URLs

### Finalize Image Upload

```typescript
finalizeImageUpload: async (
  data: FinalizeImageData
): Promise<FinalizeImageResponse> => {
  const res = await api.post('/images/finalize', data, {
    withCredentials: true,
    timeout: 30000, // 30 seconds
  });

  return res.data;
},
```

**What this does:**
- Creates database record
- Links metadata to pre-uploaded image
- Faster than full upload
- Used after pre-upload

### Legacy Upload

```typescript
uploadImage: async (
  data: UploadImageData,
  onUploadProgress?: (progress: number) => void
) => {
  const formData = new FormData();
  formData.append('image', data.image);
  formData.append('imageTitle', data.imageTitle);
  formData.append('imageCategory', data.imageCategory);
  // ... more fields

  const res = await api.post('/images/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    withCredentials: true,
    timeout: 120000,
    onUploadProgress: (progressEvent) => {
      if (onUploadProgress && progressEvent.total) {
        // Cap at 85% - remaining 15% for S3 upload and processing
        const httpProgress = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        const percentCompleted = Math.min(85, httpProgress);
        onUploadProgress(percentCompleted);
      }
    },
  });

  return res.data;
},
```

**What this does:**
- Single-phase upload
- Uploads file and creates record
- Progress capped at 85%
- Remaining 15% for S3/processing

### Bulk Upload Notification

```typescript
createBulkUploadNotification: async (
  successCount: number,
  totalCount: number,
  failedCount?: number
): Promise<void> => {
  try {
    await api.post(
      '/images/bulk-upload-notification',
      {
        successCount,
        totalCount,
        failedCount: failedCount || 0,
      },
      {
        withCredentials: true,
      }
    );
  } catch (error) {
    // Silently fail - don't interrupt upload flow
    console.error('Failed to create bulk upload notification:', error);
  }
},
```

**What this does:**
- Creates notification for bulk upload
- Tracks success/failure counts
- Silent failure (doesn't interrupt flow)

## Upload Flow

**Two-Phase (Recommended):**
1. Pre-upload → S3 upload (0-100%)
2. Finalize → Database record (fast)

**Legacy (Single-Phase):**
1. Upload → S3 + Database (0-85% HTTP, 85-100% processing)

## Usage Examples

### Pre-Upload + Finalize

```typescript
// Step 1: Pre-upload
const preUpload = await imageUploadService.preUploadImage(file, (progress) => {
  console.log(`Upload: ${progress}%`);
});

// Step 2: Finalize
const finalize = await imageUploadService.finalizeImageUpload({
  uploadId: preUpload.uploadId,
  imageTitle: 'My Photo',
  imageCategory: 'Nature',
  // ... more metadata
});
```

### Legacy Upload

```typescript
const response = await imageUploadService.uploadImage({
  image: file,
  imageTitle: 'My Photo',
  imageCategory: 'Nature',
}, (progress) => {
  console.log(`Progress: ${progress}%`);
});
```

## Summary

**imageUploadService** is the image upload service that:
1. ✅ Two-phase upload (pre-upload + finalize)
2. ✅ Progress tracking
3. ✅ Legacy upload support
4. ✅ Bulk upload notifications
5. ✅ Error handling

It's the "upload handler" - managing all image uploads!


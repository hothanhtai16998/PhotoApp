# imageUpdateService Explanation

## What is imageUpdateService?

`imageUpdateService` is a **service module** that provides image update-related API methods. It handles updating image metadata, replacing image files, and batch updating images.

## Key Features

### 1. **Metadata Updates**
- Update image metadata
- Title, location, EXIF data
- Tags

### 2. **File Replacement**
- Replace image file
- Batch file replacement
- Long timeout for uploads

### 3. **Batch Operations**
- Batch update multiple images
- Efficient processing
- Progress tracking

## Step-by-Step Breakdown

### Update Image

```typescript
updateImage: async (
  imageId: string,
  data: {
    imageTitle?: string;
    location?: string;
    coordinates?: Coordinates | null;
    cameraModel?: string;
    cameraMake?: string;
    focalLength?: number;
    aperture?: number;
    shutterSpeed?: string;
    iso?: number;
    tags?: string[];
  }
): Promise<Image> => {
  const res = await api.patch(`/images/${imageId}`, data, {
    withCredentials: true,
  });

  return res.data.image;
},
```

**What this does:**
- Updates image metadata
- No file upload
- Fast operation
- Returns updated image

### Update Image with File

```typescript
updateImageWithFile: async (
  imageId: string,
  editedFile: File
): Promise<Image> => {
  const formData = new FormData();
  formData.append('image', editedFile);

  const res = await api.patch(`/images/${imageId}/replace`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    withCredentials: true,
    timeout: 120000, // 2 minutes
  });

  return res.data.image;
},
```

**What this does:**
- Replaces image file
- Uploads new file
- Updates database
- Long timeout for upload

### Batch Update Images

```typescript
batchUpdateImages: async (
  editedImages: Array<{ imageId: string; file: File }>
): Promise<Image[]> => {
  const formData = new FormData();
  editedImages.forEach((item, index) => {
    formData.append(`images[${index}][imageId]`, item.imageId);
    formData.append(`images[${index}][file]`, item.file);
  });

  const res = await api.patch('/images/batch/replace', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    withCredentials: true,
    timeout: 300000, // 5 minutes for batch operations
  });

  return res.data.images;
},
```

**What this does:**
- Updates multiple images
- Batch file replacement
- Very long timeout (5 minutes)
- Returns updated images array

## Usage Examples

### Update Metadata

```typescript
const updated = await imageUpdateService.updateImage(imageId, {
  imageTitle: 'New Title',
  location: 'New Location',
  tags: ['tag1', 'tag2'],
});
```

### Replace File

```typescript
const updated = await imageUpdateService.updateImageWithFile(imageId, editedFile);
```

### Batch Update

```typescript
const updated = await imageUpdateService.batchUpdateImages([
  { imageId: 'id1', file: file1 },
  { imageId: 'id2', file: file2 },
]);
```

## Summary

**imageUpdateService** is the image update service that:
1. ✅ Updates image metadata
2. ✅ Replaces image files
3. ✅ Batch operations
4. ✅ Long timeouts for uploads
5. ✅ Error handling

It's the "image updater" - managing image updates!


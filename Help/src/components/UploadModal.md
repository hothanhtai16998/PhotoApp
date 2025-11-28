# UploadModal Component Explanation

## What is UploadModal?

`UploadModal` is the **image upload modal** that allows users to upload multiple images with metadata. It supports drag-and-drop, file selection, progress tracking, and batch uploads.

## Key Features

### 1. **Multiple Image Upload**
- Upload multiple images at once
- Individual metadata for each image
- Batch processing

### 2. **Drag and Drop**
- Drag files into modal
- Visual feedback
- File validation

### 3. **Progress Tracking**
- Shows upload progress per image
- Overall progress indicator
- Success/error states

### 4. **Form Validation**
- Validates each image
- Shows errors per image
- Prevents invalid submissions

## Step-by-Step Breakdown

### Modal State Hook

```typescript
const {
  dragActive,
  selectedFiles,
  setSelectedFiles,
  imagesData,
  setImagesData,
  showTooltip,
  setShowTooltip,
  fileInputRef,
  handleDrag,
  handleDrop,
  handleFileInput,
  updateImageData,
  updateImageCoordinates,
  resetState,
} = useUploadModalState({ preUploadAllImages });
```

**What this does:**
- Manages drag and drop state
- Handles file selection
- Manages image data array
- Provides file input ref

### Image Upload Hook

```typescript
const {
  categories,
  loadingCategories,
  loadCategories,
  showProgress,
  validateImagesWithErrors,
  showSuccess,
  uploadingIndex,
  totalUploads,
  uploadProgress,
  loading,
  handleSubmitAll,
  resetUploadState,
  preUploadAllImages,
} = useImageUpload({
  onSuccess: () => {
    // Success handling
  },
});
```

**What this does:**
- Manages upload process
- Handles pre-upload
- Tracks progress
- Validates images

### Form Validation

```typescript
const isFormValid = imagesData.length > 0 &&
  imagesData.every(img =>
    img.title.trim().length > 0 &&
    img.category.trim().length > 0 &&
    img.preUploadData && // Must be pre-uploaded
    !img.isUploading && // Not currently uploading
    !img.uploadError // No upload errors
  );
```

**What this does:**
- Checks all images have required fields
- Ensures all are pre-uploaded
- Checks no uploads in progress
- Checks no errors

### Submit Handler

```typescript
const handleSubmit = async () => {
  const validatedImages = validateImagesWithErrors(imagesData);
  setImagesData(validatedImages);

  if (!validatedImages.every(img => Object.keys(img.errors).length === 0)) {
    return; // Don't submit if errors
  }

  await handleSubmitAll(imagesData);
};
```

**What this does:**
- Validates all images
- Shows errors if any
- Submits only if valid
- Handles batch upload

### Body Scroll Lock

```typescript
useEffect(() => {
  if (isOpen) {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }
}, [isOpen]);
```

**What this does:**
- Locks body scroll when modal is open
- Compensates for scrollbar width
- Prevents layout shift
- Restores on close

## Summary

**UploadModal** is the image upload interface that:
1. ✅ Supports multiple image uploads
2. ✅ Drag and drop support
3. ✅ Progress tracking
4. ✅ Form validation
5. ✅ Batch processing
6. ✅ Error handling

It's the "upload hub" - making it easy to upload multiple images with metadata!


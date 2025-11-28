# UploadPage Component Explanation

## What is UploadPage?

`UploadPage` is the **image upload page** where users can upload images with metadata. It features automatic upload on file selection, progress tracking, and category examples.

## Key Features

### 1. **Automatic Upload**
- Starts upload immediately when file is selected
- No need to click "Upload" button first
- Shows progress during upload

### 2. **Two-Phase Upload**
- Phase 1: Pre-upload to S3 (with progress)
- Phase 2: Finalize with metadata (quick)

### 3. **Category Examples**
- Shows popular categories
- Displays example images per category
- Helps users understand what to upload

### 4. **Form Validation**
- Uses Zod schema validation
- Real-time error messages
- Prevents invalid submissions

## Step-by-Step Breakdown

### Form Setup

```typescript
const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<UploadFormValues>({
  resolver: zodResolver(uploadSchema),
});

const watchedFile = watch('image');
```

**What this does:**
- Sets up React Hook Form
- Uses Zod for validation
- Watches file input for changes
- Provides form state management

### Category Images Display

```typescript
useEffect(() => {
  const processCategoryImages = (allImages: Image[]) => {
    const categoryData = [];
    
    // Group images by category
    for (const category of categories) {
      const categoryImgs = allImages.filter(img => {
        const categoryName = typeof img.imageCategory === 'string' 
          ? img.imageCategory 
          : img.imageCategory?.name;
        return categoryName && categoryName.toLowerCase() === category.toLowerCase();
      }).slice(0, imagesPerCategory);
      
      if (categoryImgs.length >= minImagesPerCategory) {
        categoryData.push({ category, images: categoryImgs });
      }
    }
    
    // Fallback: use general images if no category matches
    if (categoryData.length === 0 && allImages.length > 0) {
      const shuffled = [...allImages].sort(() => 0.5 - Math.random());
      for (let i = 0; i < maxCategories && shuffled.length >= imagesPerCategory; i++) {
        categoryData.push({ 
          category: categories[i] || 'Featured', 
          images: shuffled.slice(i * imagesPerCategory, (i + 1) * imagesPerCategory) 
        });
      }
    }
    
    setCategoryImages(categoryData.slice(0, maxCategories));
  };
  
  if (images.length > 0) {
    processCategoryImages(images);
  } else {
    fetchImages({ limit: 50 }).then(() => {
      // Process after fetch
    });
  }
}, [images, fetchImages]);
```

**What this does:**
- Groups images by category
- Shows examples for each category
- Falls back to random images if no category matches
- Updates when images change

### Automatic Upload on File Selection

```typescript
useEffect(() => {
  const file = watchedFile?.[0];
  if (!file) {
    // Reset state if no file
    setPreUploadData(null);
    setUploadProgress(0);
    setIsUploading(false);
    setUploadError(null);
    return;
  }

  const startUpload = async () => {
    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);
    setPreUploadData(null);

    try {
      // Compress image first
      const compressedFile = await compressImage(file);
      
      // Pre-upload image to S3
      const result = await imageService.preUploadImage(
        compressedFile,
        (progress) => {
          setUploadProgress(progress);
        }
      );

      setPreUploadData(result);
      setUploadProgress(100);
      setIsUploading(false);
      toast.success('Ảnh đã tải lên thành công! Bạn có thể gửi bây giờ.');
    } catch (error) {
      setUploadError(getErrorMessage(error, 'Failed to upload image.'));
      setIsUploading(false);
      setUploadProgress(0);
      // Clear file input on error
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setValue('image', null as unknown as FileList);
    }
  };

  startUpload();
}, [watchedFile, setValue]);
```

**What this does:**
- Automatically starts upload when file is selected
- Compresses image first
- Shows progress during upload
- Stores pre-upload data for finalization
- Handles errors gracefully

### Finalize Upload

```typescript
const onSubmit = async (data: UploadFormValues) => {
  if (!preUploadData) {
    toast.error('Vui lòng đợi ảnh tải lên hoàn tất');
    return;
  }

  if (isUploading) {
    toast.error('Đang tải ảnh lên, vui lòng đợi...');
    return;
  }

  setIsFinalizing(true);

  try {
    const finalizeData: FinalizeImageData = {
      uploadId: preUploadData.uploadId,
      publicId: preUploadData.publicId,
      imageUrl: preUploadData.imageUrl,
      // ... all URLs
      imageTitle: data.imageTitle.trim(),
      imageCategory: data.imageCategory.trim(),
      location: data.location?.trim() || undefined,
      cameraModel: data.cameraModel?.trim() || undefined,
    };

    await imageService.finalizeImageUpload(finalizeData);
    toast.success('Tải ảnh lên thành công!');
    navigate('/');
  } catch (error) {
    toast.error(getErrorMessage(error, 'Failed to finalize upload.'));
  } finally {
    setIsFinalizing(false);
  }
};
```

**What this does:**
- Validates pre-upload is complete
- Sends metadata to finalize upload
- Links pre-uploaded image with metadata
- Navigates to home on success
- Handles errors

## Upload Progress

```typescript
{isUploading && (
  <div className="upload-progress-overlay">
    <div className="upload-progress-content">
      <div className="upload-progress-spinner" />
      <h3>Đang tải ảnh lên...</h3>
      <div className="upload-progress-bar-container">
        <div 
          className="upload-progress-bar" 
          style={{ width: `${uploadProgress}%` }}
        />
      </div>
      <p>{uploadProgress}%</p>
    </div>
  </div>
)}
```

**What this does:**
- Shows overlay during upload
- Displays progress bar
- Shows percentage
- Blocks interaction during upload

## Summary

**UploadPage** is the image upload interface that:
1. ✅ Automatically uploads on file selection
2. ✅ Shows upload progress
3. ✅ Two-phase upload (pre-upload + finalize)
4. ✅ Displays category examples
5. ✅ Validates form input
6. ✅ Handles errors gracefully

It's the "upload hub" - making it easy for users to share their photos!


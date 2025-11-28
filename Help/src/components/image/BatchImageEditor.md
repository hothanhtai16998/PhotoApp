# BatchImageEditor Component Explanation

## What is BatchImageEditor?

`BatchImageEditor` is a **component** that provides batch image editing capabilities. It allows editing multiple images with shared settings and individual fine-tuning.

## Key Features

### 1. **Batch Editing**
- Apply settings to all images
- Individual image editing
- Progress tracking
- Save all at once

### 2. **Shared Settings**
- Filters (brightness, contrast, saturation)
- Watermark settings
- Apply to all option

### 3. **Individual Editing**
- ImageEditor integration
- One image at a time
- Navigate between images
- Save individual edits

### 4. **Progress Tracking**
- Current image index
- Processed images count
- Total images count
- Visual progress

## Step-by-Step Breakdown

### Component Props

```typescript
interface BatchImageEditorProps {
  images: Image[];
  onSave: (editedImages: Array<{ imageId: string; file: File }>) => Promise<void>;
  onCancel: () => void;
}
```

**What this does:**
- Receives images array
- Save callback with edited images
- Cancel handler

### Batch Edit Settings

```typescript
interface BatchEditSettings {
  filters: {
    brightness: number;
    contrast: number;
    saturation: number;
  };
  watermark: {
    enabled: boolean;
    text: string;
    position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center';
    opacity: number;
    fontSize: number;
  };
}
```

**What this does:**
- Shared settings structure
- Filters and watermark
- Applied to all images

### Apply to All

```typescript
const handleApplyToAll = useCallback(async () => {
  setIsProcessing(true);
  try {
    const processed = new Map<string, Blob>();

    for (const image of images) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');

          // Apply filters
          ctx.filter = `brightness(${100 + editSettings.filters.brightness}%) 
                        contrast(${100 + editSettings.filters.contrast}%) 
                        saturate(${100 + editSettings.filters.saturation}%)`;
          ctx.drawImage(img, 0, 0);

          // Apply watermark
          if (editSettings.watermark.enabled && editSettings.watermark.text) {
            ctx.save();
            ctx.filter = 'none';
            ctx.globalAlpha = editSettings.watermark.opacity / 100;
            ctx.font = `bold ${editSettings.watermark.fontSize}px Arial`;
            // ... watermark positioning and drawing
            ctx.restore();
          }

          canvas.toBlob((blob) => {
            if (blob) {
              processed.set(image._id, blob);
              resolve();
            } else {
              reject(new Error('Failed to create blob'));
            }
          }, 'image/jpeg', 0.92);
        };
        img.src = image.imageUrl;
      });
    }

    // Convert to File objects
    const editedFiles = Array.from(processed.entries()).map(([imageId, blob]) => ({
      imageId,
      file: new File([blob], `edited-${imageId}.jpg`, { type: 'image/jpeg' }),
    }));

    setProcessedImages(new Map(processed));
    await onSave(editedFiles);
  } catch (error) {
    console.error('Failed to apply batch edits:', error);
    toast.error('Không thể áp dụng chỉnh sửa. Vui lòng thử lại.');
  } finally {
    setIsProcessing(false);
  }
}, [images, editSettings, onSave]);
```

**What this does:**
- Processes all images
- Applies shared settings
- Creates blob for each
- Converts to File objects
- Saves all at once

### Individual Image Editing

```typescript
const handleSaveSingleImage = useCallback(async (editedImageBlob: Blob) => {
  if (!currentImage) return;

  setProcessedImages(prev => {
    const next = new Map(prev);
    next.set(currentImage._id, editedImageBlob);
    return next;
  });

  // Move to next image if available
  if (currentImageIndex < images.length - 1) {
    setCurrentImageIndex(prev => prev + 1);
  }
}, [currentImage, currentImageIndex, images.length]);
```

**What this does:**
- Saves individual edit
- Stores in processed map
- Moves to next image
- Continues editing

### Progress Display

```typescript
<div className="batch-editor-progress">
  <div className="progress-text">
    Đang chỉnh sửa {currentImageIndex + 1} / {images.length}
  </div>
  <div className="progress-bar">
    <div
      className="progress-fill"
      style={{
        width: `${((currentImageIndex + 1) / images.length) * 100}%`,
      }}
    />
  </div>
</div>
```

**What this does:**
- Shows current progress
- Progress bar
- Vietnamese text

## Usage Examples

### In CollectionDetailPage

```typescript
<BatchImageEditor
  images={selectedImages}
  onSave={async (editedImages) => {
    await batchUpdateImages(editedImages);
  }}
  onCancel={() => {
    setShowBatchEditor(false);
  }}
/>
```

## Summary

**BatchImageEditor** is the batch image editor component that:
1. ✅ Batch editing with shared settings
2. ✅ Individual image editing
3. ✅ Progress tracking
4. ✅ Apply to all option
5. ✅ Save all at once

It's the "batch editor" - editing multiple images efficiently!


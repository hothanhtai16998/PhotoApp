# ImageModalRelated Component Explanation

## What is ImageModalRelated?

`ImageModalContent` is a **component** that displays related images in the image modal. It shows images from the same category or with similar tags.

## Key Features

### 1. **Related Images Display**
- Grid layout
- Portrait/landscape handling
- Progressive loading
- Image overlay with title

### 2. **Infinite Scroll**
- Load more on scroll
- Loading indicator
- Has more indicator

### 3. **Image Selection**
- Click to view related image
- Scrolls to top instantly
- Updates modal content

### 4. **Empty State**
- No related images message
- Icon display
- User-friendly message

## Step-by-Step Breakdown

### Component Props

```typescript
interface ImageModalRelatedProps {
  relatedImages: Image[];
  hasMoreRelatedImages: boolean;
  isLoadingRelatedImages: boolean;
  imageTypes: Map<string, 'portrait' | 'landscape'>;
  currentImageIds: Set<string>;
  processedImages: React.MutableRefObject<Set<string>>;
  onImageSelect: (image: Image) => void;
  onImageLoad: (imageId: string, img: HTMLImageElement) => void;
  modalContentRef: React.RefObject<HTMLDivElement | null>;
  loadMoreRef: React.RefObject<HTMLDivElement | null>;
}
```

**What this does:**
- Receives related images
- Loading states
- Handlers for selection and loading

### Image Click Handler

```typescript
const handleImageClick = (relatedImage: Image) => {
  onImageSelect(relatedImage);
  // Scroll to top instantly to show the new image (like Unsplash)
  if (modalContentRef.current) {
    modalContentRef.current.scrollTo({ top: 0, behavior: 'auto' });
  }
};
```

**What this does:**
- Selects related image
- Scrolls to top instantly
- Updates modal content

### Related Images Grid

```typescript
<div className="related-images-grid">
  {relatedImages.map((relatedImage) => {
    const imageType = imageTypes.get(relatedImage._id) || 'landscape';
    return (
      <div
        key={relatedImage._id}
        className={`related-image-item ${imageType}`}
        onClick={() => handleImageClick(relatedImage)}
      >
        <ProgressiveImage
          src={relatedImage.imageUrl}
          thumbnailUrl={relatedImage.thumbnailUrl}
          smallUrl={relatedImage.smallUrl}
          regularUrl={relatedImage.regularUrl}
          alt={relatedImage.imageTitle || 'Photo'}
          onLoad={(img) => {
            if (!processedImages.current.has(relatedImage._id) && currentImageIds.has(relatedImage._id)) {
              onImageLoad(relatedImage._id, img);
            }
          }}
        />
        <div className="related-image-overlay">
          <span className="related-image-title">{relatedImage.imageTitle}</span>
        </div>
      </div>
    );
  })}
</div>
```

**What this does:**
- Maps related images
- Progressive loading
- Image type for layout
- Overlay with title

### Infinite Scroll Trigger

```typescript
{hasMoreRelatedImages && (
  <div ref={loadMoreRef} className="related-images-load-more-trigger" />
)}
{isLoadingRelatedImages && (
  <div className="related-images-loading">
    <div className="loading-spinner" />
    <p>Đang tải ảnh...</p>
  </div>
)}
```

**What this does:**
- Intersection observer target
- Loading indicator
- Vietnamese text

### Empty State

```typescript
{relatedImages.length === 0 && (
  <div className="related-images-empty">
    <div className="related-images-empty-icon">
      <ImageOff size={48} />
    </div>
    <p className="related-images-empty-text">Không có ảnh liên quan</p>
  </div>
)}
```

**What this does:**
- Shows when no related images
- Icon and message
- User-friendly

## Usage Examples

### In ImageModal

```typescript
<ImageModalRelated
  relatedImages={relatedImages}
  hasMoreRelatedImages={hasMoreRelatedImages}
  isLoadingRelatedImages={isLoadingRelatedImages}
  imageTypes={imageTypes}
  currentImageIds={currentImageIds}
  processedImages={processedImages}
  onImageSelect={onImageSelect}
  onImageLoad={onImageLoad}
  modalContentRef={modalContentRef}
  loadMoreRef={loadMoreRef}
/>
```

## Summary

**ImageModalRelated** is the related images component that:
1. ✅ Displays related images grid
2. ✅ Infinite scroll
3. ✅ Image selection
4. ✅ Progressive loading
5. ✅ Empty state

It's the "related images" - showing similar images!


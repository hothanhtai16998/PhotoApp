# ImageModalContent Component Explanation

## What is ImageModalContent?

`ImageModalContent` is a **component** that renders the main image content in the image modal. It handles image display, zoom functionality, and responsive image loading.

## Key Features

### 1. **Image Display**
- AVIF/WebP support
- Responsive srcset
- Progressive loading
- Placeholder blur-up

### 2. **Zoom Functionality**
- Zoom in/out
- Pan when zoomed
- Double-click to zoom
- Mouse wheel zoom
- Touch gestures

### 3. **Image Types**
- Portrait/landscape handling
- Aspect ratio preservation
- Responsive sizing

### 4. **Loading States**
- Placeholder display
- Loading indicator
- Smooth transitions

## Step-by-Step Breakdown

### Component Props

```typescript
interface ImageModalContentProps {
  image: Image;
  imageTypes: Map<string, 'portrait' | 'landscape'>;
  modalImageSrc: string | null;
  modalPlaceholderSrc: string | null;
  isModalImageLoaded: boolean;
  setIsModalImageLoaded: (loaded: boolean) => void;
  zoomProps: UseImageZoomReturn;
}
```

**What this does:**
- Receives image and zoom props
- Handles loading state
- Image type for layout

### Zoom Container

```typescript
<div
  className="modal-main-image-container"
  ref={zoomContainerRef}
  onWheel={handleWheel}
  onMouseDown={handleMouseDown}
  onMouseMove={handleMouseMove}
  onMouseUp={handleMouseUp}
  onMouseLeave={handleMouseUp}
  onTouchStart={handleTouchStart}
  onTouchMove={handleTouchMove}
  onTouchEnd={handleTouchEnd}
  style={{
    cursor: isZoomed ? (zoom > 1 ? 'grab' : 'default') : 'zoom-in',
    userSelect: 'none',
    touchAction: 'none',
  }}
>
```

**What this does:**
- Zoom container with handlers
- Mouse and touch events
- Cursor changes based on zoom
- Prevents text selection

### Responsive Image

```typescript
<picture>
  {/* AVIF sources */}
  <source
    srcSet={
      image.thumbnailAvifUrl && image.smallAvifUrl && image.regularAvifUrl && image.imageAvifUrl
        ? `${image.thumbnailAvifUrl} 200w, ${image.smallAvifUrl} 800w, ${image.regularAvifUrl} 1080w, ${image.imageAvifUrl} 1920w`
        : image.regularAvifUrl ?? image.imageAvifUrl ?? ''
    }
    type="image/avif"
    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 98vw, 1920px"
  />
  {/* WebP sources */}
  <source
    srcSet={...}
    type="image/webp"
    sizes="..."
  />
  {/* Fallback img */}
  <img
    ref={zoomImageRef}
    src={modalImageSrc ?? image.regularUrl ?? image.smallUrl ?? image.imageUrl}
    alt={image.imageTitle ?? 'Photo'}
    style={{
      backgroundImage: modalPlaceholderSrc ? `url("${modalPlaceholderSrc}")` : undefined,
      backgroundSize: 'cover',
    }}
    onLoad={() => setIsModalImageLoaded(true)}
  />
</picture>
```

**What this does:**
- AVIF/WebP with fallback
- Responsive srcset
- Blur-up placeholder
- Loading callback

### Zoom Transform

```typescript
<div
  className="modal-image-wrapper"
  style={{
    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
    transformOrigin: 'center center',
    transition: zoom === 1 ? 'transform 0.3s ease' : 'none',
  }}
>
```

**What this does:**
- Applies zoom and pan
- Smooth transition when resetting
- No transition when zooming (for performance)

### Zoom Controls

```typescript
<div className="modal-zoom-controls">
  <button onClick={zoomIn} disabled={zoom >= 5}>
    <ZoomIn />
  </button>
  <button onClick={zoomOut} disabled={zoom <= 1}>
    <ZoomOut />
  </button>
  {isZoomed && (
    <button onClick={resetZoom}>
      <RotateCcw />
      Reset
    </button>
  )}
</div>
```

**What this does:**
- Zoom in/out buttons
- Reset button when zoomed
- Disabled states at limits

## Usage Examples

### In ImageModal

```typescript
<ImageModalContent
  image={image}
  imageTypes={imageTypes}
  modalImageSrc={modalImageSrc}
  modalPlaceholderSrc={modalPlaceholderSrc}
  isModalImageLoaded={isModalImageLoaded}
  setIsModalImageLoaded={setIsModalImageLoaded}
  zoomProps={zoomProps}
/>
```

## Summary

**ImageModalContent** is the image modal content component that:
1. ✅ Responsive image display
2. ✅ AVIF/WebP support
3. ✅ Zoom and pan functionality
4. ✅ Touch gestures
5. ✅ Progressive loading

It's the "modal content" - displaying the main image with zoom!


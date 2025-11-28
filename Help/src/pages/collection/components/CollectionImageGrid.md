# CollectionImageGrid Component Explanation

## What is CollectionImageGrid?

`CollectionImageGrid` is a **component** that displays images in a collection with drag-and-drop reordering, selection mode, and cover image setting.

## Key Features

### 1. **Image Grid**
- Responsive grid layout
- Portrait/landscape handling
- Progressive loading
- Empty state

### 2. **Drag and Drop**
- Reorder images
- Visual drag feedback
- Drop zones
- Owner only

### 3. **Selection Mode**
- Select multiple images
- Visual selection indicator
- Checkbox overlay
- Bulk actions

### 4. **Cover Image**
- Set cover image
- Visual indicator
- Owner only
- Loading state

## Step-by-Step Breakdown

### Component Props

```typescript
interface CollectionImageGridProps {
  images: Image[];
  imageTypes: Map<string, 'portrait' | 'landscape'>;
  coverImageId: string | null;
  isOwner: boolean;
  isReordering: boolean;
  selectionMode: boolean;
  draggedImageId: string | null;
  dragOverImageId: string | null;
  selectedImageIds: Set<string>;
  updatingCover: string | null;
  currentImageIds: Set<string>;
  processedImages: React.MutableRefObject<Set<string>>;
  handleImageLoad: (imageId: string, img: HTMLImageElement) => void;
  handleDragStart: (imageId: string, e: React.DragEvent) => void;
  handleDragOver: (imageId: string, e: React.DragEvent) => void;
  handleDragLeave: () => void;
  handleDrop: (targetImageId: string, e: React.DragEvent) => void;
  handleDragEnd: () => void;
  handleImageClick: (image: Image) => void;
  handleSetCoverImage: (imageId: string, e: React.MouseEvent) => void;
  toggleImageSelection: (imageId: string) => void;
  isMobile: boolean;
}
```

**What this does:**
- Receives images and handlers
- Drag and drop props
- Selection mode props
- Image loading props

### Empty State

```typescript
if (images.length === 0) {
  return (
    <div className="collection-detail-empty">
      <p>Bộ sưu tập này chưa có ảnh nào</p>
      <button onClick={() => navigate('/')}>
        Khám phá ảnh để thêm vào bộ sưu tập
      </button>
    </div>
  );
}
```

**What this does:**
- Shows when no images
- Message and button
- Navigate to home

### Image Grid Item

```typescript
{images.map((image) => {
  const imageType = imageTypes.get(image._id) || 'landscape';
  const isCoverImage = coverImageId === image._id;
  const isDragging = draggedImageId === image._id;
  const isDragOver = dragOverImageId === image._id;
  const isSelected = selectedImageIds.has(image._id);

  return (
    <div
      key={image._id}
      className={`collection-image-item ${imageType} ${isCoverImage ? 'is-cover' : ''} ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''} ${isSelected ? 'selected' : ''} ${selectionMode ? 'selection-mode' : ''}`}
      draggable={isOwner && !isReordering && !selectionMode}
      onDragStart={(e) => handleDragStart(image._id, e)}
      onDragOver={(e) => handleDragOver(image._id, e)}
      onDragLeave={handleDragLeave}
      onDrop={(e) => handleDrop(image._id, e)}
      onDragEnd={handleDragEnd}
      onClick={() => {
        if (isDragging) return;
        handleImageClick(image);
      }}
    >
      {/* Image and overlays */}
    </div>
  );
})}
```

**What this does:**
- Maps images to grid items
- Applies classes for state
- Drag handlers
- Click handler

### Cover Image Indicator

```typescript
{isCoverImage && (
  <div className="cover-image-badge">
    <span>Ảnh bìa</span>
  </div>
)}
```

**What this does:**
- Shows cover badge
- Visual indicator
- Vietnamese text

### Selection Checkbox

```typescript
{selectionMode && (
  <div
    className={`selection-checkbox ${isSelected ? 'checked' : ''}`}
    onClick={(e) => {
      e.stopPropagation();
      toggleImageSelection(image._id);
    }}
  >
    {isSelected && <Check size={16} />}
  </div>
)}
```

**What this does:**
- Shows in selection mode
- Toggle selection
- Visual checkmark

## Usage Examples

### In CollectionDetailPage

```typescript
<CollectionImageGrid
  images={images}
  imageTypes={imageTypes}
  coverImageId={coverImageId}
  isOwner={isOwner}
  isReordering={isReordering}
  selectionMode={selectionMode}
  draggedImageId={draggedImageId}
  dragOverImageId={dragOverImageId}
  selectedImageIds={selectedImageIds}
  updatingCover={updatingCover}
  currentImageIds={currentImageIds}
  processedImages={processedImages}
  handleImageLoad={handleImageLoad}
  handleDragStart={handleDragStart}
  handleDragOver={handleDragOver}
  handleDragLeave={handleDragLeave}
  handleDrop={handleDrop}
  handleDragEnd={handleDragEnd}
  handleImageClick={handleImageClick}
  handleSetCoverImage={handleSetCoverImage}
  toggleImageSelection={toggleImageSelection}
  isMobile={isMobile}
/>
```

## Summary

**CollectionImageGrid** is the collection image grid component that:
1. ✅ Displays images in grid
2. ✅ Drag and drop reordering
3. ✅ Selection mode
4. ✅ Cover image setting
5. ✅ Progressive loading

It's the "collection grid" - displaying collection images!


# ImageGridItem Component Explanation

## What is ImageGridItem?

`ImageGridItem` is a **memoized component** that renders a single image item in the image grid. It displays the image, user info, favorite button, and handles interactions.

## Key Features

### 1. **Image Display**
- Progressive image loading
- Portrait/landscape handling
- Aspect ratio support
- Eager loading option

### 2. **User Information**
- Avatar display
- Username/display name
- Click to navigate to profile
- User info overlay

### 3. **Favorite Functionality**
- Favorite button
- Batched favorite checking
- Toggle favorite
- Loading state

### 4. **Interactions**
- Click to open modal
- Download button
- Keyboard navigation
- Fade out animation

## Step-by-Step Breakdown

### Component Props

```typescript
interface ImageGridItemProps {
  image: Image;
  imageType: 'portrait' | 'landscape';
  aspectRatio?: number;
  onSelect: (image: Image) => void;
  onDownload: (image: Image, e: React.MouseEvent) => void;
  onImageLoad: (imageId: string, img: HTMLImageElement) => void;
  currentImageIds: Set<string>;
  processedImages: React.MutableRefObject<Set<string>>;
  isFadingOut?: boolean;
  eager?: boolean;
}
```

**What this does:**
- Receives image and handlers
- Tracks image type and loading state
- Handles selection and download

### Memoization

```typescript
export const ImageGridItem = memo(({ ... }: ImageGridItemProps) => {
  // Component implementation
});
```

**What this does:**
- Prevents unnecessary re-renders
- Only updates when props change
- Performance optimization

### Favorite Check

```typescript
const isFavorited = useBatchedFavoriteCheck(image._id);
```

**What this does:**
- Uses batched favorite checking
- Reduces API calls
- Automatic state updates

### User Click Handler

```typescript
const handleUserClick = useCallback((e: React.MouseEvent) => {
  e.stopPropagation();
  if (image.uploadedBy?.username) {
    navigate(`/profile/${image.uploadedBy.username}`);
  } else if (image.uploadedBy?._id) {
    navigate(`/profile/user/${image.uploadedBy._id}`);
  }
}, [image.uploadedBy, navigate]);
```

**What this does:**
- Navigates to user profile
- Prevents modal opening
- Handles username or ID

### Toggle Favorite

```typescript
const handleToggleFavorite = useCallback(async (e: React.MouseEvent) => {
  e.stopPropagation();
  if (!accessToken || !image._id || isTogglingFavorite) return;

  setIsTogglingFavorite(true);
  try {
    const response = await favoriteService.toggleFavorite(imageId);
    toast.success(response.isFavorited ? 'Đã thêm vào yêu thích' : 'Đã xóa khỏi yêu thích');
  } catch (error) {
    toast.error('Không thể cập nhật yêu thích. Vui lòng thử lại.');
  } finally {
    setIsTogglingFavorite(false);
  }
}, [accessToken, image._id, isTogglingFavorite]);
```

**What this does:**
- Toggles favorite status
- Shows loading state
- Displays success/error messages
- Prevents duplicate requests

## Usage Examples

### In ImageGrid

```typescript
{images.map((image) => (
  <ImageGridItem
    key={image._id}
    image={image}
    imageType={imageTypes.get(image._id) || 'landscape'}
    onSelect={handleImageSelect}
    onDownload={handleDownload}
    onImageLoad={handleImageLoad}
    currentImageIds={currentImageIds}
    processedImages={processedImages}
    eager={index < 12}
  />
))}
```

## Summary

**ImageGridItem** is the image grid item component that:
1. ✅ Displays image with progressive loading
2. ✅ User information and navigation
3. ✅ Favorite functionality
4. ✅ Download support
5. ✅ Memoized for performance

It's the "grid item" - rendering individual images in the grid!


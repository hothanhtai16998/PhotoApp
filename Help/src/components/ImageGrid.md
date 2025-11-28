# ImageGrid Component Explanation

## What is ImageGrid?

`ImageGrid` is the **main image display component** that shows images in a responsive grid layout. It handles search results, category filtering, pagination, infinite scroll, image modal, and mobile navigation.

## Key Features

### 1. **Responsive Grid Layout**
- Masonry-style grid
- Portrait/landscape detection
- Optimized for different screen sizes

### 2. **Image Modal Integration**
- Desktop: Opens modal on click
- Mobile: Navigates to full page view
- URL-based image selection

### 3. **Smooth Transitions**
- Prevents flash when category changes
- Keeps old images visible during transition
- Uses `useLayoutEffect` for synchronous updates

### 4. **Performance Optimizations**
- Lazy loading with Intersection Observer
- Image preloading
- Eager loading for above-fold images
- Connection-aware preloading

## Step-by-Step Breakdown

### State Management

```typescript
const [imageTypes, setImageTypes] = useState<Map<string, 'portrait' | 'landscape'>>(new Map());
const [imageAspectRatios, setImageAspectRatios] = useState<Map<string, number>>(new Map());
const processedImages = useRef<Set<string>>(new Set());
const [displayImages, setDisplayImages] = useState<Image[]>([]);
const [prevImages, setPrevImages] = useState<Image[]>([]);
```

**What these do:**
- `imageTypes`: Tracks portrait/landscape for layout
- `imageAspectRatios`: Stores aspect ratios
- `processedImages`: Prevents duplicate processing
- `displayImages`: Current images to show
- `prevImages`: Previous images (for smooth transitions)

### Smooth Category Transitions

```typescript
useLayoutEffect(() => {
  const categoryChanged = previousCategoryRef.current !== currentCategory;
  const imagesChanged = previousImagesRef.current !== images;
  
  if (categoryChanged && displayImages.length > 0) {
    // Keep old images visible during transition
    setPrevImages(displayImages);
    previousCategoryRef.current = currentCategory;
  }
  
  if (images.length > 0 && imagesChanged) {
    if (categoryChanged) {
      // Show new images, keep old ones briefly
      setDisplayImages(images);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setPrevImages([]); // Clear after paint
        });
      });
    } else {
      // Regular update
      setDisplayImages(images);
      setPrevImages([]);
    }
  }
}, [currentCategory, images, displayImages.length, loading]);
```

**What this does:**
- Detects category changes
- Keeps old images visible during transition
- Uses double `requestAnimationFrame` for smooth paint
- Prevents flash of empty state

**Why `useLayoutEffect`?**
- Runs synchronously before browser paints
- Prevents visual flicker
- Better UX for category changes

### Mobile Redirect

```typescript
useEffect(() => {
  if (imageSlugFromUrl && isMobileState) {
    sessionStorage.setItem(appConfig.storage.imagePageFromGridKey, 'true');
    navigate(`/photos/${imageSlugFromUrl}`, {
      state: { images, fromGrid: true },
      replace: true
    });
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.delete('image');
      return newParams;
    });
  }
}, [imageSlugFromUrl, isMobileState, navigate, images, setSearchParams]);
```

**What this does:**
- On mobile, redirects to full page view
- Sets flag for page mode detection
- Clears image param from URL
- Better mobile UX

### Image Selection (Desktop)

```typescript
const selectedImage = useMemo(() => {
  if (isMobileState) return null;
  if (!imageSlugFromUrl) return null;
  
  const shortId = extractIdFromSlug(imageSlugFromUrl);
  if (!shortId) return null;
  
  return images.find(img => {
    const imgShortId = img._id.slice(-12);
    return imgShortId === shortId;
  }) || null;
}, [imageSlugFromUrl, images, isMobileState]);
```

**What this does:**
- Finds selected image from URL slug
- Extracts short ID from slug
- Matches with image ID
- Only works on desktop

### Image Update Handler

```typescript
const handleImageUpdate = useCallback((updatedImage: Image) => {
  useImageStore.setState((state) => {
    const index = state.images.findIndex(img => img._id === updatedImage._id);
    if (index !== -1) {
      state.images[index] = updatedImage;
    }
  });
}, []);
```

**What this does:**
- Updates image in store when stats change
- Keeps store in sync with modal changes
- Optimistic updates

## Image Grid Hook

The component uses `useImageGrid` hook for:

- Filtering images
- Pagination logic
- Infinite scroll
- Search result counting
- Location result counting

## Performance Optimizations

### 1. **Intersection Observer**
- Lazy loads images as they enter viewport
- Connection-aware root margin
- Eager loading for above-fold images

### 2. **Image Preloading**
- Preloads images before they're visible
- Uses `preloadQueue` to manage preloads
- Prevents duplicate preloads

### 3. **Processed Images Tracking**
- Tracks which images have been processed
- Prevents duplicate processing
- Clears when image list changes significantly

## Summary

**ImageGrid** is the main image display component that:
1. ✅ Shows images in responsive grid
2. ✅ Handles search and filtering
3. ✅ Supports infinite scroll
4. ✅ Integrates with image modal
5. ✅ Optimized for performance
6. ✅ Smooth category transitions
7. ✅ Mobile-friendly navigation

It's the "image showcase" - displaying all images beautifully and efficiently!


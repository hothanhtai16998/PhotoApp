# ImageModal Component Explanation

## What is ImageModal?

`ImageModal` is the **image viewer component** that displays images in a modal overlay (desktop) or full page (mobile). It includes zoom, navigation, related images, and various actions.

## Key Features

### 1. **Dual Rendering Mode**
- Modal mode: Overlay with backdrop
- Page mode: Full page view (no overlay)

### 2. **Image Zoom**
- Zoom in/out with mouse wheel
- Double-click to zoom
- Keyboard shortcuts (+/-/0)
- Pan when zoomed

### 3. **Body Scroll Lock**
- Prevents background scrolling
- Preserves scroll position
- Handles scrollbar width

### 4. **Related Images**
- Shows related images below
- Infinite scroll for more
- Lazy loading

## Step-by-Step Breakdown

### Props

```typescript
interface ImageModalProps {
  image: Image;
  images: Image[];
  onClose: () => void;
  onImageSelect: (image: Image) => void;
  onDownload: (image: Image, e: React.MouseEvent) => void;
  imageTypes: Map<string, 'portrait' | 'landscape'>;
  onImageLoad: (imageId: string, img: HTMLImageElement) => void;
  currentImageIds: Set<string>;
  processedImages: React.MutableRefObject<Set<string>>;
  renderAsPage?: boolean;
}
```

**What these do:**
- `image`: Current image to display
- `images`: All images for navigation
- `renderAsPage`: If true, renders as page (no overlay)

### Mobile Detection

```typescript
const [isMobile, setIsMobile] = useState(() => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= appConfig.mobileBreakpoint;
});

useEffect(() => {
  const handleResize = () => {
    setIsMobile(window.innerWidth <= appConfig.mobileBreakpoint);
  };
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

**What this does:**
- Detects mobile viewport
- Updates on resize
- Used for conditional rendering

### Image Zoom Hook

```typescript
const zoomProps = useImageZoom({
  minZoom: 1,
  maxZoom: 5,
  zoomStep: 0.25,
  doubleClickZoom: 2,
});
```

**What this does:**
- Provides zoom functionality
- Handles zoom state
- Manages zoom interactions

### Image Modal Hook

```typescript
const {
  views,
  downloads,
  isFavorited,
  isTogglingFavorite,
  modalPlaceholderSrc,
  modalImageSrc,
  isModalImageLoaded,
  setIsModalImageLoaded,
  handleToggleFavorite,
} = useImageModal({
  image,
  images,
  onImageSelect,
  onClose,
  onDownload,
  onDownloadWithSize: handleDownloadWithSize,
});
```

**What this does:**
- Manages modal state
- Handles favorite toggle
- Manages image loading
- Tracks views and downloads

### Body Scroll Lock

```typescript
useEffect(() => {
  if (!renderAsPage) {
    const scrollY = window.scrollY;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.paddingRight = `${scrollbarWidth}px`;
    
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.paddingRight = '';
      window.scrollTo(0, scrollY);
    };
  }
}, [renderAsPage]);
```

**What this does:**
- Locks body scroll when modal is open
- Preserves scroll position
- Compensates for scrollbar width
- Restores scroll on close

**Why both `overflow: hidden` and `position: fixed`?**
- Maximum scroll prevention
- Works on all browsers
- Prevents scroll on mobile

### Zoom Keyboard Shortcuts

```typescript
useEffect(() => {
  const handleKeyboard = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return; // Don't interfere with inputs
    }

    if (e.key === '+' || e.key === '=') {
      e.preventDefault();
      zoomIn();
    } else if (e.key === '-') {
      e.preventDefault();
      zoomOut();
    } else if (e.key === '0') {
      e.preventDefault();
      resetZoom();
    }
  };

  document.addEventListener('keydown', handleKeyboard);
  return () => document.removeEventListener('keydown', handleKeyboard);
}, [zoomProps]);
```

**What this does:**
- Adds keyboard shortcuts for zoom
- Only when zoomed (doesn't interfere otherwise)
- Ignores when typing in inputs
- +/= to zoom in, - to zoom out, 0 to reset

## Component Structure

The modal is composed of sub-components:

1. **ImageModalHeader**: Close button, actions
2. **ImageModalContent**: Main image with zoom
3. **ImageModalSidebar**: Image info, stats, actions
4. **ImageModalRelated**: Related images below

## Summary

**ImageModal** is the comprehensive image viewer that:
1. ✅ Displays images in modal/page mode
2. ✅ Supports zoom and pan
3. ✅ Locks body scroll
4. ✅ Shows related images
5. ✅ Handles keyboard shortcuts
6. ✅ Mobile-responsive
7. ✅ Optimized performance

It's the "image viewer" - providing the best experience for viewing images!


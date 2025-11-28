# ImagePage Component Explanation

## What is ImagePage?

`ImagePage` is the **full-page view** for displaying a single image. It can render as a modal (when coming from grid) or as a full page (when accessed directly or refreshed).

## Component Structure

```typescript
function ImagePage() {
  const { slug } = useParams<{ slug: string }>();
  const [image, setImage] = useState<Image | null>(null);
  const [images, setImages] = useState<Image[]>([]);
  const [isFromGrid, setIsFromGrid] = useState(() => getInitialFromGrid());
  const renderAsPage = !isFromGrid;
  
  // Fetch and render image
}
```

## Key Features

### 1. **Dual Rendering Mode**
- **Modal Mode**: When coming from grid (overlay, can go back)
- **Page Mode**: When accessed directly (full page, no overlay)

### 2. **Smart Image Detection**
- Detects if coming from grid vs direct access
- Uses sessionStorage and location.state
- Prevents re-detection on re-renders

### 3. **Optimized Image Loading**
- Uses passed images if available (faster)
- Falls back to API fetch if needed
- Tracks image types (portrait/landscape)

### 4. **Navigation Handling**
- Back button goes to grid if from grid
- Back button goes to home if direct access
- Maintains image context during navigation

## Step-by-Step Breakdown

### Initial State Detection

```typescript
const getInitialFromGrid = () => {
  const hasState = location.state?.fromGrid === true;
  const fromGridFlag = sessionStorage.getItem(appConfig.storage.imagePageFromGridKey);
  const fromGrid = hasState || fromGridFlag === 'true';
  
  if (fromGridFlag === 'true') {
    sessionStorage.removeItem(appConfig.storage.imagePageFromGridKey);
  }
  
  return fromGrid;
};

const [isFromGrid] = useState(() => getInitialFromGrid());
const renderAsPage = !isFromGrid;
```

**What this does:**
- Checks `location.state` (from React Router navigation)
- Checks `sessionStorage` (set when clicking from grid)
- Only runs once (lazy initialization)
- Cleans up sessionStorage after reading
- Determines rendering mode

**Why lazy initialization?**
- Prevents re-detection on re-renders
- State is set once and never changes
- Better performance

### Image ID Extraction

```typescript
const imageId = useMemo(() => {
  if (!slug) return null;
  return extractIdFromSlug(slug);
}, [slug]);
```

**What this does:**
- Extracts image ID from URL slug
- Slug format: `title-last12chars`
- Returns last 12 characters of MongoDB ObjectId
- Memoized to prevent recalculation

### Image Fetching

```typescript
useEffect(() => {
  if (!imageId) {
    setError('Invalid image slug');
    setLoading(false);
    return;
  }

  const fetchImage = async () => {
    try {
      // Try to use passed images first (faster)
      const passedImages = location.state?.images as Image[] | undefined;
      if (passedImages && passedImages.length > 0) {
        const foundImage = passedImages.find(img => {
          const imgShortId = img._id.slice(-12);
          return imgShortId === imageId;
        });
        
        if (foundImage) {
          setImage(foundImage);
          setImages(passedImages);
          return; // Fast path - no API call needed
        }
      }
      
      // Fallback: fetch from API
      const relatedResponse = await imageService.fetchImages({ limit: 50 });
      const allImages = relatedResponse.images || [];
      const foundImage = allImages.find(img => {
        const imgShortId = img._id.slice(-12);
        return imgShortId === imageId;
      });
      
      if (foundImage) {
        setImage(foundImage);
        setImages(allImages);
      } else {
        setError('Image not found');
      }
    } catch (err) {
      setError('Failed to load image');
    } finally {
      setLoading(false);
    }
  };

  fetchImage();
}, [imageId, location.state]);
```

**What this does:**
1. **Fast Path**: Uses passed images if available (no API call)
2. **Fallback**: Fetches from API if no passed images
3. **Matching**: Finds image by matching last 12 characters of ID
4. **Error Handling**: Shows error if image not found

**Why two paths?**
- Faster when coming from grid (images already loaded)
- Works for direct access (fetches from API)
- Better UX - instant display when possible

### Image Type Detection

```typescript
const handleImageLoad = useCallback((imageId: string, img: HTMLImageElement) => {
  if (processedImages.current.has(imageId)) return;
  processedImages.current.add(imageId);
  const isPortrait = img.naturalHeight > img.naturalWidth;
  const imageType = isPortrait ? 'portrait' : 'landscape';
  setImageTypes(prev => {
    if (prev.has(imageId)) return prev;
    const newMap = new Map(prev);
    newMap.set(imageId, imageType);
    return newMap;
  });
}, []);
```

**What this does:**
- Detects if image is portrait or landscape
- Only processes once per image
- Stores in Map for quick lookup
- Used for layout optimization

### Navigation Handlers

```typescript
const handleImageSelect = useCallback((selectedImage: Image) => {
  const newSlug = generateImageSlug(selectedImage.imageTitle, selectedImage._id);
  navigate(`/photos/${newSlug}`, { replace: true, state: { images } });
}, [navigate, images]);

const handleClose = useCallback(() => {
  if (isFromGrid) {
    navigate(-1); // Go back to grid
  } else {
    navigate('/'); // Go to home
  }
}, [navigate, isFromGrid]);
```

**What this does:**
- `handleImageSelect`: Navigates to next/previous image
- `handleClose`: Goes back appropriately based on source
- Maintains image context during navigation

## Rendering Modes

### Modal Mode (`renderAsPage = false`)
- Overlay background
- Can close with ESC or click outside
- Back button returns to grid
- Used when coming from grid

### Page Mode (`renderAsPage = true`)
- Full page view
- No overlay
- Back button goes to home
- Used for direct access or refresh

## Flow Diagram

```
User navigates to /photos/:slug
    ↓
Check location.state and sessionStorage
    ↓
Determine isFromGrid
    ↓
Extract image ID from slug
    ↓
Try to use passed images (fast path)
    ↓
├─ Found → Set image and images → Render
└─ Not found → Fetch from API → Find image → Render
    ↓
Render ImageModal with renderAsPage flag
```

## Common Questions

### Q: Why two rendering modes?
**A:** Better UX. Modal when browsing, full page when sharing/bookmarking.

### Q: How does it detect if from grid?
**A:** Checks `location.state.fromGrid` and `sessionStorage` flag.

### Q: Why extract last 12 characters?
**A:** MongoDB ObjectIds are 24 chars. Last 12 are unique enough and shorter for URLs.

### Q: What if image not found?
**A:** Shows error message with button to go home.

### Q: Can I force page mode?
**A:** Yes, set `renderAsPage={true}` in ImageModal props.

## Summary

**ImagePage** is the full-page image viewer that:
1. ✅ Supports dual rendering (modal/page)
2. ✅ Detects navigation source
3. ✅ Optimizes image loading (fast path)
4. ✅ Handles navigation appropriately
5. ✅ Tracks image types
6. ✅ Provides error handling

It's the "image viewer" - giving users the best experience whether browsing or sharing!


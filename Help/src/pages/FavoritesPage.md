# FavoritesPage Component Explanation

## What is FavoritesPage?

`FavoritesPage` is the **favorites management page** where users can view all their favorited images. It supports pagination, image modal (desktop), and navigation to full page view (mobile).

## Key Features

### 1. **Responsive Design**
- Desktop: Shows modal when clicking image
- Mobile: Navigates to full page view
- Different UX for different screen sizes

### 2. **Image Type Detection**
- Automatically detects portrait vs landscape
- Used for optimal grid layout
- Only processes each image once

### 3. **Pagination**
- Supports paginated favorite lists
- Previous/Next navigation
- Shows current page and total pages

### 4. **Download Functionality**
- Downloads images via backend proxy
- Handles CORS issues
- Shows success/error messages

## Step-by-Step Breakdown

### Authentication Check

```typescript
useEffect(() => {
  if (!accessToken || !user?._id) {
    navigate('/signin');
    return;
  }
  fetchFavorites(1);
}, [accessToken, user, navigate, fetchFavorites]);
```

**What this does:**
- Checks if user is logged in
- Redirects to sign-in if not authenticated
- Fetches favorites on mount

### Mobile Redirect

```typescript
useEffect(() => {
  if (imageParamFromUrl && isMobile) {
    sessionStorage.setItem(appConfig.storage.imagePageFromGridKey, 'true');
    navigate(`/photos/${imageParamFromUrl}`, {
      state: { images, fromGrid: true },
      replace: true
    });
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      newParams.delete('image');
      return newParams;
    });
  }
}, [imageParamFromUrl, isMobile, navigate, images, setSearchParams]);
```

**What this does:**
- On mobile, redirects to full page view instead of modal
- Sets flag to indicate coming from grid
- Clears image param from URL
- Better mobile UX

### Image Selection (Desktop)

```typescript
const selectedImage = useMemo(() => {
  if (isMobile) return null;
  if (!imageParamFromUrl) return null;
  
  // Support both legacy ID and slug format
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(imageParamFromUrl);
  
  if (isObjectId) {
    return images.find(img => img._id === imageParamFromUrl) || null;
  } else {
    const shortId = extractIdFromSlug(imageParamFromUrl);
    return images.find(img => {
      const imgShortId = img._id.slice(-12);
      return imgShortId === shortId;
    }) || null;
  }
}, [imageParamFromUrl, images, isMobile]);
```

**What this does:**
- Finds selected image from URL parameter
- Supports both MongoDB ObjectId and slug format
- Only works on desktop (mobile uses navigation)

### Image Type Detection

```typescript
const handleImageLoad = useCallback((imageId: string, img: HTMLImageElement) => {
  if (!currentImageIds.has(imageId) || processedImages.current.has(imageId)) return;
  
  processedImages.current.add(imageId);
  const isPortrait = img.naturalHeight > img.naturalWidth;
  const imageType = isPortrait ? 'portrait' : 'landscape';
  setImageType(imageId, imageType);
}, [currentImageIds, setImageType]);
```

**What this does:**
- Detects image orientation when loaded
- Only processes once per image
- Updates store with image type
- Used for grid layout optimization

### Download Handler

```typescript
const handleDownloadImage = useCallback(async (image: Image, e: React.MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  
  try {
    const response = await api.get(`/images/${image._id}/download`, {
      responseType: 'blob',
      withCredentials: true,
    });
    
    const blob = new Blob([response.data], { type: response.headers['content-type'] || 'image/webp' });
    const blobUrl = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName; // From Content-Disposition or generated
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
    toast.success('Tải ảnh thành công');
  } catch (error) {
    toast.error('Tải ảnh thất bại. Vui lòng thử lại.');
  }
}, []);
```

**What this does:**
- Downloads image via backend proxy (avoids CORS)
- Creates blob URL from response
- Triggers download via anchor element
- Cleans up blob URL after download
- Shows success/error messages

## Empty State

```typescript
{images.length === 0 ? (
  <div className="favorites-empty">
    <Heart size={64} className="empty-icon" />
    <h2>Chưa có ảnh yêu thích</h2>
    <p>Bắt đầu lưu những ảnh bạn yêu thích để xem lại sau</p>
    <button onClick={() => navigate('/')}>
      Khám phá ảnh
    </button>
  </div>
) : (
  // Grid of favorite images
)}
```

**What this does:**
- Shows friendly empty state
- Encourages user to start favoriting
- Provides link to explore images

## Summary

**FavoritesPage** is the favorites management page that:
1. ✅ Displays user's favorited images
2. ✅ Supports pagination
3. ✅ Handles mobile vs desktop differently
4. ✅ Detects image types for layout
5. ✅ Provides download functionality
6. ✅ Shows empty state when no favorites

It's the "favorites hub" - where users can easily access all their saved images!


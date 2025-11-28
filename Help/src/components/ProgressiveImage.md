# ProgressiveImage Component Explanation

## What is ProgressiveImage?

`ProgressiveImage` is an **optimized image component** that loads images progressively (blur-up effect). It supports multiple image sizes, AVIF format, responsive images, and smart caching.

## Key Features

### 1. **Progressive Loading**
- Shows thumbnail first (blur-up)
- Loads small size for grid
- Optionally loads full size on demand

### 2. **AVIF Support**
- Uses AVIF when available (better compression)
- Falls back to WebP
- Falls back to original format

### 3. **Smart Caching**
- Global cache across components
- Browser cache detection
- Prevents flash on navigation

### 4. **Responsive Images**
- Uses `srcset` for different sizes
- Browser chooses optimal size
- Supports different DPR

## Step-by-Step Breakdown

### Image URL Generation

```typescript
const effectiveThumbnail = thumbnailUrl || generateThumbnailUrl(src);
const effectiveSmall = smallUrl || generateSmallUrl(src);
const effectiveRegular = regularUrl || src;
```

**What this does:**
- Uses provided URLs if available
- Falls back to original URL
- Supports old images without size variants

### Cache Detection

```typescript
const isCached = globalLoadedImages.has(effectiveSmall) || globalLoadedImages.has(effectiveThumbnail);

// Also check browser cache
let browserCached = false;
if (!isCached && typeof window !== 'undefined') {
  const testImg = new Image();
  testImg.src = testUrl;
  if (testImg.complete && testImg.naturalWidth > 0) {
    browserCached = true;
    globalLoadedImages.add(testUrl);
  }
}
```

**What this does:**
- Checks global cache (component-level)
- Checks browser cache (native)
- Adds to cache if found
- Prevents flash for cached images

### Progressive Loading

```typescript
const loadSmallImage = () => {
  if (effectiveSmall !== effectiveThumbnail && !loadedSrcs.current.has(effectiveSmall)) {
    const smallImg = new Image();
    smallImg.onload = () => {
      loadedSrcs.current.add(effectiveSmall);
      globalLoadedImages.add(effectiveSmall);
      setCurrentSrc(effectiveSmall);
      setIsLoaded(true);
    };
    smallImg.src = effectiveSmall;
  }
};
```

**What this does:**
- Loads small size after thumbnail
- Upgrades image quality
- Adds to cache
- Updates display

### Intersection Observer

```typescript
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && !preloadedRef.current) {
        preloadedRef.current = true;
        loadSmallImage();
        observer.disconnect();
      }
    });
  },
  {
    rootMargin: isSlowConnection ? '100px' : '300px',
  }
);

observer.observe(containerRef.current);
```

**What this does:**
- Preloads images before they're visible
- Connection-aware root margin
- Larger margin for fast connections
- Smaller margin for slow connections

### AVIF Support

```typescript
{hasAvif ? (
  <picture>
    <source srcSet={avifSrcSet} sizes={sizes} type="image/avif" />
    <source srcSet={webpSrcSet} sizes={sizes} type="image/webp" />
    <img src={currentWebpUrl} srcSet={webpSrcSet} sizes={sizes} />
  </picture>
) : (
  <img src={currentSrc} srcSet={webpSrcSet} sizes={sizes} />
)}
```

**What this does:**
- Uses `<picture>` element for format selection
- AVIF first (best compression)
- WebP fallback
- Original format fallback
- Browser chooses best format

### Responsive Srcset

```typescript
const generateSrcSet = (thumbnail: string, small: string, regular: string, original: string) => {
  const srcsetParts: string[] = [];
  if (thumbnail) srcsetParts.push(`${thumbnail} 200w`);
  if (small && small !== thumbnail) srcsetParts.push(`${small} 800w`);
  if (regular && regular !== small) srcsetParts.push(`${regular} 1080w`);
  if (original && original !== regular) srcsetParts.push(`${original} 1920w`);
  return srcsetParts.length > 0 ? srcsetParts.join(', ') : null;
};
```

**What this does:**
- Generates srcset with width descriptors
- Browser chooses optimal size
- Supports different viewport sizes
- Supports different DPR

## Global Cache

```typescript
const globalLoadedImages = new Set<string>();
```

**What this does:**
- Persists across component mounts
- Prevents re-loading cached images
- Shared across all ProgressiveImage instances
- Better performance

## Summary

**ProgressiveImage** is the optimized image component that:
1. ✅ Progressive loading (blur-up effect)
2. ✅ AVIF format support
3. ✅ Responsive images (srcset)
4. ✅ Smart caching
5. ✅ Connection-aware preloading
6. ✅ Prevents flash on navigation

It's the "image optimizer" - delivering the best image experience!


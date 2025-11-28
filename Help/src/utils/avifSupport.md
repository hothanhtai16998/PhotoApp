# avifSupport Explanation

## What is avifSupport?

`avifSupport` is a **utility module** that detects AVIF image format support in the browser and provides functions to get the best image URL based on browser capabilities.

## Key Features

### 1. **AVIF Detection**
- Detects browser AVIF support
- Caches result
- Promise-based

### 2. **Best URL Selection**
- Chooses AVIF or WebP
- Size variants support
- Fallback to original

### 3. **Performance**
- One-time detection
- Cached result
- Fast lookups

## Step-by-Step Breakdown

### Detect AVIF Support

```typescript
export async function detectAvifSupport(): Promise<boolean> {
  // Check if already cached
  if (typeof window !== 'undefined' && 'avifSupport' in window) {
    return (window as { avifSupport?: boolean }).avifSupport ?? false;
  }

  // Create a test image to check AVIF support
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      if (typeof window !== 'undefined') {
        (window as { avifSupport?: boolean }).avifSupport = true;
      }
      resolve(true);
    };
    img.onerror = () => {
      if (typeof window !== 'undefined') {
        (window as { avifSupport?: boolean }).avifSupport = false;
      }
      resolve(false);
    };
    // Use a 1x1 AVIF test image (data URI)
    img.src = 'data:image/avif;base64,...';
  });
}
```

**What this does:**
- Checks cache first
- Creates test image
- Tests AVIF data URI
- Caches result
- Returns boolean

### Get Best Image URL

```typescript
export async function getBestImageUrl(
  image: {
    thumbnailUrl?: string;
    smallUrl?: string;
    regularUrl?: string;
    imageUrl?: string;
    thumbnailAvifUrl?: string;
    smallAvifUrl?: string;
    regularAvifUrl?: string;
    imageAvifUrl?: string;
  },
  size: 'thumbnail' | 'small' | 'regular' | 'original' = 'regular'
): Promise<string> {
  const supportsAvif = await detectAvifSupport();

  const urlMap = {
    thumbnail: supportsAvif ? image.thumbnailAvifUrl : image.thumbnailUrl,
    small: supportsAvif ? image.smallAvifUrl : image.smallUrl,
    regular: supportsAvif ? image.regularAvifUrl : image.regularUrl,
    original: supportsAvif ? image.imageAvifUrl : image.imageUrl,
  };

  return urlMap[size] || image.imageUrl || '';
}
```

**What this does:**
- Detects AVIF support
- Selects best URL for size
- Prefers AVIF if supported
- Falls back to WebP/original
- Returns URL string

## Usage Examples

### Detect Support

```typescript
import { detectAvifSupport } from '@/utils/avifSupport';

const supportsAvif = await detectAvifSupport();
if (supportsAvif) {
  console.log('Browser supports AVIF');
}
```

### Get Best URL

```typescript
import { getBestImageUrl } from '@/utils/avifSupport';

const url = await getBestImageUrl(image, 'regular');
// Returns AVIF URL if supported, otherwise WebP URL
```

## Why AVIF?

1. **Better Compression** - 50% smaller than JPEG
2. **Modern Format** - Latest image standard
3. **Quality** - Better quality at same size
4. **Progressive** - Supports progressive loading

## Summary

**avifSupport** is the AVIF detection utility that:
1. ✅ Detects browser AVIF support
2. ✅ Caches result
3. ✅ Selects best image URL
4. ✅ Size variants support
5. ✅ Performance optimized

It's the "format detector" - choosing the best image format!


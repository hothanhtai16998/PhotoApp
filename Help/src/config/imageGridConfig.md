# imageGridConfig Explanation

## What is imageGridConfig?

`imageGridConfig` is a **configuration file** that contains image grid performance and behavior settings. It defines eager loading, preload margins, and intersection observer settings.

## Key Features

### 1. **Performance Settings**
- Eager image count
- Preload margins
- Intersection threshold
- Concurrent preloads

### 2. **Connection-Aware**
- Slow connection margin
- Normal connection margin
- Adaptive loading

### 3. **Centralized Configuration**
- Easy to edit
- Single source of truth
- Type-safe

## Step-by-Step Breakdown

### Image Grid Configuration

```typescript
export const imageGridConfig = {
    // Number of images to load eagerly (above the fold)
    eagerImageCount: 12,
    
    // Preload margins for intersection observer
    preload: {
        // Margin for slow connections (2g, slow-2g)
        slowConnectionMargin: '200px',
        
        // Margin for normal/fast connections
        normalConnectionMargin: '400px',
    },
    
    // Intersection observer threshold (0.01 = trigger when 1% visible)
    intersectionThreshold: 0.01,
    
    // Limit concurrent preloads to avoid overwhelming the browser
    maxConcurrentPreloads: 5,
} as const;
```

**What this does:**
- Defines eager loading count (12 images)
- Preload margins for different connections
- Intersection observer threshold
- Max concurrent preloads

**Why these values?**
- 12 images: Good above-the-fold coverage
- 200px slow: Conservative for slow connections
- 400px normal: Aggressive for fast connections
- 0.01 threshold: Early trigger for smooth loading
- 5 concurrent: Prevents browser overload

## Usage Examples

### Eager Loading

```typescript
import { imageGridConfig } from '@/config/imageGridConfig';

images.slice(0, imageGridConfig.eagerImageCount).map(image => (
  <img src={image.url} loading="eager" />
))
```

### Preload Margin

```typescript
import { imageGridConfig } from '@/config/imageGridConfig';

const isSlowConnection = navigator.connection?.effectiveType === '2g' || 
                         navigator.connection?.effectiveType === 'slow-2g';

const margin = isSlowConnection 
  ? imageGridConfig.preload.slowConnectionMargin 
  : imageGridConfig.preload.normalConnectionMargin;
```

### Intersection Observer

```typescript
import { imageGridConfig } from '@/config/imageGridConfig';

const observer = new IntersectionObserver(callback, {
  rootMargin: margin,
  threshold: imageGridConfig.intersectionThreshold,
});
```

## Summary

**imageGridConfig** is the image grid configuration that:
1. ✅ Defines eager loading
2. ✅ Preload margins
3. ✅ Intersection settings
4. ✅ Performance optimization
5. ✅ Connection-aware

It's the "grid settings" - optimizing image grid performance!


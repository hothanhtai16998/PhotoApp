# sliderConfig Explanation

## What is sliderConfig?

`sliderConfig` is a **configuration file** that contains slider/carousel settings. It defines image count, auto-play intervals, transition duration, and API limits.

## Key Features

### 1. **Slider Settings**
- Image count
- Auto-play interval
- Progress bar update
- Transition duration

### 2. **API Settings**
- Maximum pages
- API limit per request
- Prevents infinite loops

### 3. **Centralized Configuration**
- Easy to edit
- Single source of truth
- Type-safe

## Step-by-Step Breakdown

### Slider Configuration

```typescript
export const sliderConfig = {
    // Number of images to display in slider (daily random selection)
    imageCount: 10,
    
    // Maximum number of pages to fetch (to avoid infinite loops)
    maxPages: 10,
    
    // API limit per request
    apiLimit: 100,
    
    // Auto-play settings
    autoPlay: {
        // Interval between slides in milliseconds (6.2 seconds)
        intervalMs: 6200,
        
        // Progress bar update interval in milliseconds (60fps = ~16ms)
        progressUpdateIntervalMs: 16,
    },
    
    // Transition settings
    transition: {
        // Transition duration in milliseconds
        durationMs: 600,
    },
} as const;
```

**What this does:**
- Defines slider settings
- 10 images default
- 6.2 second auto-play
- 16ms progress updates (60fps)
- 600ms transition

**Why these values?**
- 10 images: Good variety
- 6200ms: Comfortable viewing time
- 16ms: Smooth 60fps animation
- 600ms: Smooth transition

## Usage Examples

### Image Count

```typescript
import { sliderConfig } from '@/config/sliderConfig';

const images = await fetchRandomImages(sliderConfig.imageCount);
```

### Auto-Play

```typescript
const interval = setInterval(() => {
  nextSlide();
}, sliderConfig.autoPlay.intervalMs);
```

### Progress Bar

```typescript
const progressInterval = setInterval(() => {
  updateProgress();
}, sliderConfig.autoPlay.progressUpdateIntervalMs);
```

## Summary

**sliderConfig** is the slider configuration that:
1. ✅ Defines image count
2. ✅ Auto-play settings
3. ✅ Transition settings
4. ✅ API limits
5. ✅ Centralized settings

It's the "slider settings" - centralizing slider configuration!


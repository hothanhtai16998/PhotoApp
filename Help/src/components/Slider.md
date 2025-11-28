# Slider Component Explanation

## What is Slider?

`Slider` is a **carousel component** that displays featured images in a rotating slideshow. It features autoplay, progress bar, touch gestures, and date-based randomization.

## Key Features

### 1. **Date-Based Randomization**
- Same images per day
- Changes daily automatically
- Uses date as seed for consistency

### 2. **Autoplay with Progress**
- Auto-advances slides
- Shows progress bar
- Pauses on hover
- Resumes from paused position

### 3. **Touch Gestures**
- Swipe left/right on mobile
- Smooth transitions
- Prevents accidental navigation

### 4. **Navigation Controls**
- Previous/Next buttons
- Keyboard arrow keys
- Click to navigate

## Step-by-Step Breakdown

### Date-Based Randomization

```typescript
function getDailyRandomImages(images: Image[], count: number): Image[] {
  const today = new Date();
  const dateString = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

  // Simple hash function to convert date string to number
  let seed = 0;
  for (let i = 0; i < dateString.length; i++) {
    seed = ((seed << 5) - seed) + dateString.charCodeAt(i);
    seed = seed & seed; // Convert to 32bit integer
  }

  // Shuffle array using seed
  const shuffled = [...images];
  let random = seed;
  for (let i = shuffled.length - 1; i > 0; i--) {
    random = (random * 9301 + 49297) % 233280; // Linear congruential generator
    const j = Math.floor((random / 233280) * (i + 1));
    const temp = shuffled[i]!;
    shuffled[i] = shuffled[j]!;
    shuffled[j] = temp;
  }

  return shuffled.slice(0, count);
}
```

**What this does:**
- Uses current date as seed
- Creates deterministic random shuffle
- Same date = same images
- Different date = different images

**Why date-based?**
- Fresh content daily
- Consistent for all users on same day
- Better than truly random

### Fetch Images

```typescript
useEffect(() => {
  const fetchImages = async () => {
    setLoading(true);
    try {
      const allImages: Image[] = [];
      let page = 1;
      let hasMore = true;
      const { maxPages, apiLimit, imageCount } = sliderConfig;

      while (hasMore && page <= maxPages) {
        const response = await imageService.fetchImages({
          limit: apiLimit,
          page: page,
        });

        if (response.images && response.images.length > 0) {
          allImages.push(...response.images);
          hasMore = page < response.pagination.pages;
          page++;
        } else {
          hasMore = false;
        }
      }

      if (allImages.length > 0) {
        const dailyImages = getDailyRandomImages(allImages, imageCount);
        setImages(dailyImages);
      }
    } catch (error) {
      console.error("Error fetching images:", error);
      setImages([]);
    } finally {
      setLoading(false);
    }
  };

  fetchImages();
}, []);
```

**What this does:**
- Fetches images in batches (API limit: 100)
- Fetches up to maxPages
- Combines all images
- Selects random daily images
- Handles errors gracefully

### Autoplay with Progress

```typescript
useEffect(() => {
  if (images.length === 0) return;

  if (isHovered) {
    // Pause - save current progress
    if (progressStartTimeRef.current !== null) {
      const elapsed = Date.now() - progressStartTimeRef.current;
      pausedProgressRef.current = Math.min((elapsed / intervalMs) * 100, 100);
    }
    // Clear intervals
    if (autoPlayIntervalRef.current) {
      clearInterval(autoPlayIntervalRef.current);
      autoPlayIntervalRef.current = null;
    }
    return;
  }

  // Resume/Start
  const startProgress = pausedProgressRef.current;
  const startTime = Date.now() - (startProgress / 100) * intervalMs;
  progressStartTimeRef.current = startTime;

  // Progress bar animation (60fps)
  progressIntervalRef.current = setInterval(() => {
    const elapsed = Date.now() - progressStartTimeRef.current;
    const progress = Math.min((elapsed / intervalMs) * 100, 100);
    setAutoPlayProgress(progress);
  }, progressUpdateIntervalMs);

  // Auto-play interval
  const remainingTime = intervalMs - (startProgress / 100) * intervalMs;
  autoPlayIntervalRef.current = setTimeout(() => {
    setAutoPlayProgress(100);
    nextSlide();
    // Reset and continue
  }, remainingTime);
}, [images.length, isHovered, intervalMs, nextSlide]);
```

**What this does:**
- Pauses on hover
- Saves progress when paused
- Resumes from saved progress
- Updates progress bar at 60fps
- Auto-advances slides

### Touch Gestures

```typescript
const handleTouchStart = (e: React.TouchEvent) => {
  touchStartX.current = e.touches[0].clientX;
  touchStartY.current = e.touches[0].clientY;
};

const handleTouchEnd = (e: React.TouchEvent) => {
  if (touchStartX.current === null || touchStartY.current === null) return;
  
  const touchEndX = e.changedTouches[0].clientX;
  const touchEndY = e.changedTouches[0].clientY;
  const deltaX = touchEndX - touchStartX.current;
  const deltaY = touchEndY - touchStartY.current;
  
  // Only handle horizontal swipes
  if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
    if (deltaX > 0) {
      prevSlide();
    } else {
      nextSlide();
    }
  }
  
  touchStartX.current = null;
  touchStartY.current = null;
};
```

**What this does:**
- Tracks touch start position
- Calculates swipe distance
- Only handles horizontal swipes
- Requires 50px minimum swipe
- Navigates based on swipe direction

## Summary

**Slider** is the featured image carousel that:
1. ✅ Shows daily random images
2. ✅ Auto-plays with progress bar
3. ✅ Pauses on hover
4. ✅ Supports touch gestures
5. ✅ Keyboard navigation
6. ✅ Smooth transitions

It's the "featured showcase" - highlighting the best images daily!


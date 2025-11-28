# timingConfig Explanation

## What is timingConfig?

`timingConfig` is a **configuration file** that contains timing and delay settings for various UI and API operations. It includes refresh delays, cleanup delays, geolocation settings, and UI debounce settings.

## Key Features

### 1. **Timing Settings**
- Refresh delays
- Cleanup delays
- Geolocation timeouts
- Geocoding rate limits

### 2. **UI Settings**
- Debounce delays
- Initial check delays
- Location search delays

### 3. **Centralized Configuration**
- Easy to edit
- Single source of truth
- Type-safe

## Step-by-Step Breakdown

### Refresh Delays

```typescript
refresh: {
  // Delay after image upload before refreshing (to ensure backend processing)
  afterUploadMs: 500,
},
```

**What this does:**
- Delay after upload
- Ensures backend processing
- 500ms default

### Cleanup Delays

```typescript
cleanup: {
  // Delay before revoking blob URLs
  blobUrlRevokeMs: 100,
},
```

**What this does:**
- Delay before cleanup
- Blob URL revocation
- 100ms default

### Geolocation Settings

```typescript
geolocation: {
  // Timeout for getting current position
  timeoutMs: 10000, // 10 seconds
  
  // Accept cached location up to this age (5 minutes)
  maximumAgeMs: 300000,
},
```

**What this does:**
- Geolocation timeout
- Cached location age
- 10 seconds timeout
- 5 minutes cache

### Geocoding Settings

```typescript
geocoding: {
  // Delay between geocoding requests to respect rate limits (1 request per second)
  rateLimitDelayMs: 1100,
  
  // Small delay for batch geocoding operations
  batchDelayMs: 200,
},
```

**What this does:**
- Rate limit delay
- Batch delay
- Respects API limits
- 1.1 seconds between requests

### UI Settings

```typescript
ui: {
  // Resize event debounce delay
  resizeDebounceMs: 100,
  
  // Initial check delay for UI components
  initCheckDelayMs: 150,
  
  // Location search debounce delay
  locationSearchDebounceMs: 500,
  
  // Initial delay before location search (to respect API rate limits)
  locationSearchInitialDelayMs: 300,
},
```

**What this does:**
- Resize debounce
- Initial check delay
- Location search debounce
- Initial search delay

## Usage Examples

### Refresh Delay

```typescript
import { timingConfig } from '@/config/timingConfig';

setTimeout(() => {
  refreshImages();
}, timingConfig.refresh.afterUploadMs);
```

### Geolocation

```typescript
navigator.geolocation.getCurrentPosition(
  success,
  error,
  {
    timeout: timingConfig.geolocation.timeoutMs,
    maximumAge: timingConfig.geolocation.maximumAgeMs,
  }
);
```

### Debounce

```typescript
const debouncedSearch = debounce(() => {
  searchLocations(query);
}, timingConfig.ui.locationSearchDebounceMs);
```

## Summary

**timingConfig** is the timing configuration that:
1. ✅ Defines refresh delays
2. ✅ Cleanup delays
3. ✅ Geolocation settings
4. ✅ Geocoding settings
5. ✅ UI debounce settings

It's the "timing settings" - centralizing timing configuration!


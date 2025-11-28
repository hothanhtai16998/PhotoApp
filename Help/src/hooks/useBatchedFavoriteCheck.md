# useBatchedFavoriteCheck Hook Explanation

## What is useBatchedFavoriteCheck?

`useBatchedFavoriteCheck` is a **custom React hook** that batches favorite status checks for multiple images. It reduces API calls by checking all images in one request instead of individual requests.

## Key Features

### 1. **Request Batching**
- Collects multiple checks
- Sends one batch request
- Reduces API calls

### 2. **Caching**
- Caches favorite status
- Immediate updates
- Prevents duplicate requests

### 3. **Optimistic Updates**
- Updates cache immediately
- Custom events for real-time updates
- Better UX

## Step-by-Step Breakdown

### Global Batching State

```typescript
const pendingChecks = new Map<string, Set<(result: boolean) => void>>();
const checkTimeoutRef: { current: ReturnType<typeof setTimeout> | null } = { current: null };
const BATCH_DELAY = 100; // Wait 100ms to collect all requests
const favoriteCache = new Map<string, boolean>();
```

**What these do:**
- `pendingChecks`: Map of image IDs to callbacks
- `checkTimeoutRef`: Timeout for batch request
- `BATCH_DELAY`: Delay to collect requests (100ms)
- `favoriteCache`: Cache for favorite status

### Update Cache Function

```typescript
export function updateFavoriteCache(imageId: string, isFavorited: boolean) {
  const validImageId = String(imageId).trim();
  favoriteCache.set(validImageId, isFavorited);
  
  // Immediately notify all callbacks for this image
  const callbacks = pendingChecks.get(validImageId);
  if (callbacks && callbacks.size > 0) {
    const callbacksCopy = new Set(callbacks);
    callbacksCopy.forEach(cb => {
      try {
        cb(isFavorited);
      } catch (error) {
        console.error('Error in favorite callback:', error);
      }
    });
  }
  
  // Dispatch custom event for components
  window.dispatchEvent(new CustomEvent('favoriteCacheUpdated', {
    detail: { imageId: validImageId, isFavorited }
  }));
}
```

**What this does:**
- Updates cache immediately
- Notifies all callbacks
- Dispatches custom event
- Used after toggle favorite

### Hook Implementation

```typescript
export function useBatchedFavoriteCheck(imageId: string | undefined): boolean {
  const { accessToken } = useAuthStore();
  const [isFavorited, setIsFavorited] = useState<boolean>(() => {
    if (!imageId || !accessToken) return false;
    const validId = String(imageId).trim();
    return favoriteCache.get(validId) ?? false;
  });

  useEffect(() => {
    if (!accessToken || !imageId) {
      setIsFavorited(false);
      return;
    }

    const validImageId = String(imageId).trim();
    
    // Check cache first
    if (favoriteCache.has(validImageId)) {
      setIsFavorited(favoriteCache.get(validImageId)!);
    }

    // Create callback
    const callback = (result: boolean) => {
      setIsFavorited(result);
      favoriteCache.set(validImageId, result);
    };
    
    // Add to pending checks
    if (!pendingChecks.has(validImageId)) {
      pendingChecks.set(validImageId, new Set());
    }
    pendingChecks.get(validImageId)!.add(callback);

    // Schedule batch check
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
    }

    checkTimeoutRef.current = setTimeout(() => {
      const imageIds = Array.from(pendingChecks.keys());
      
      if (imageIds.length > 0) {
        favoriteService.checkFavorites(imageIds)
          .then((response) => {
            // Distribute results to all callbacks
            for (const id of imageIds) {
              const callbacks = pendingChecks.get(id);
              if (callbacks) {
                const isFavorited = response.favorites[id] === true;
                favoriteCache.set(id, isFavorited);
                callbacks.forEach(cb => cb(isFavorited));
                pendingChecks.delete(id);
              }
            }
          });
      }
    }, BATCH_DELAY);

    // Cleanup
    return () => {
      const callbacks = pendingChecks.get(validImageId);
      if (callbacks && callback) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          pendingChecks.delete(validImageId);
        }
      }
    };
  }, [imageId, accessToken]);

  // Listen for cache updates
  useEffect(() => {
    const handleCacheUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ imageId: string; isFavorited: boolean }>;
      if (customEvent.detail && customEvent.detail.imageId === imageId) {
        setIsFavorited(customEvent.detail.isFavorited);
      }
    };

    window.addEventListener('favoriteCacheUpdated', handleCacheUpdate);
    return () => {
      window.removeEventListener('favoriteCacheUpdated', handleCacheUpdate);
    };
  }, [imageId]);

  return isFavorited;
}
```

**What this does:**
- Initializes from cache
- Adds to pending checks
- Schedules batch request
- Listens for cache updates
- Cleans up callbacks

## Batching Flow

```
Component 1 calls useBatchedFavoriteCheck(imageId1)
    ↓
Adds to pendingChecks
    ↓
Component 2 calls useBatchedFavoriteCheck(imageId2)
    ↓
Adds to pendingChecks
    ↓
Wait 100ms (BATCH_DELAY)
    ↓
Send batch request: checkFavorites([imageId1, imageId2])
    ↓
Distribute results to all callbacks
    ↓
Update cache
```

## Summary

**useBatchedFavoriteCheck** is the batched favorite checking hook that:
1. ✅ Batches multiple checks
2. ✅ Reduces API calls
3. ✅ Caches results
4. ✅ Optimistic updates
5. ✅ Real-time updates via events

It's the "performance optimizer" - making favorite checks efficient!


# requestDeduplication Explanation

## What is requestDeduplication?

`requestDeduplication` is a **utility module** that prevents duplicate API requests from being made simultaneously. It caches pending requests and returns the same promise for duplicate requests within a time window.

## Key Features

### 1. **Request Deduplication**
- Prevents duplicate requests
- Caches pending promises
- 1 second window

### 2. **Performance**
- Reduces network requests
- Improves performance
- Automatic cleanup

### 3. **Smart Caching**
- Key-based caching
- Method + URL + data
- Time-based expiration

## Step-by-Step Breakdown

### Generate Request Key

```typescript
function generateRequestKey(method: string, url: string, data?: unknown): string {
  const dataStr = data ? JSON.stringify(data) : '';
  return `${method}:${url}:${dataStr}`;
}
```

**What this does:**
- Generates unique key
- Includes method, URL, data
- Used for caching
- String-based key

### Deduplicate Request

```typescript
export async function deduplicateRequest<T>(
  method: string,
  url: string,
  requestFn: () => Promise<T>,
  data?: unknown
): Promise<T> {
  const key = generateRequestKey(method, url, data);
  const now = Date.now();

  // Check if there's a pending request for this key
  const pending = pendingRequests.get(key);

  if (pending && (now - pending.timestamp) < DEDUPLICATION_WINDOW) {
    // Duplicate request detected - return the existing promise
    return pending.promise as Promise<T>;
  }

  // Create new request promise
  const requestPromise = requestFn()
    .then((result) => {
      // Clean up after a delay
      setTimeout(() => {
        pendingRequests.delete(key);
      }, DEDUPLICATION_WINDOW);
      return result;
    })
    .catch((error) => {
      // Remove from pending on error
      pendingRequests.delete(key);
      throw error;
    });

  // Store the promise
  pendingRequests.set(key, {
    promise: requestPromise,
    timestamp: now,
  });

  return requestPromise;
}
```

**What this does:**
- Checks for pending request
- Returns cached promise if found
- Creates new request if not
- Cleans up after delay
- Handles errors

### Cleanup

```typescript
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of pendingRequests.entries()) {
    if (now - value.timestamp > DEDUPLICATION_WINDOW * 2) {
      pendingRequests.delete(key);
    }
  }
}, 5000); // Cleanup every 5 seconds
```

**What this does:**
- Periodic cleanup
- Removes old entries
- Prevents memory leaks
- Runs every 5 seconds

## Configuration

```typescript
const DEDUPLICATION_WINDOW = 1000; // 1 second window
```

**What this does:**
- Defines deduplication window
- 1 second default
- Configurable

## Usage Examples

### Deduplicate Request

```typescript
import { deduplicateRequest } from '@/utils/requestDeduplication';

const result = await deduplicateRequest(
  'GET',
  '/api/images',
  () => api.get('/api/images')
);
```

### With Data

```typescript
const result = await deduplicateRequest(
  'POST',
  '/api/images',
  () => api.post('/api/images', data),
  data
);
```

## Benefits

1. **Reduces Network Traffic** - Prevents duplicate requests
2. **Improves Performance** - Faster responses
3. **Saves Bandwidth** - Less data transfer
4. **Better UX** - Faster loading

## Summary

**requestDeduplication** is the request deduplication utility that:
1. ✅ Prevents duplicate requests
2. ✅ Caches pending promises
3. ✅ Automatic cleanup
4. ✅ Performance optimized
5. ✅ Easy to use

It's the "request optimizer" - preventing duplicate API calls!


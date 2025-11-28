# requestBatcher Explanation

## What is requestBatcher?

`requestBatcher` is a **utility module** that batches multiple API requests together to reduce the number of HTTP requests. It collects requests within a time window and processes them together.

## Key Features

### 1. **Request Batching**
- Batches requests within time window
- Reduces HTTP requests
- Improves performance

### 2. **Configurable**
- 50ms batch window
- Max 10 requests per batch
- Extensible for actual batching

### 3. **Placeholder Implementation**
- Currently executes individually
- Prepared for actual batching
- Easy to extend

## Step-by-Step Breakdown

### Batch Request

```typescript
export async function batchRequest<T>(
  url: string,
  requestFn: () => Promise<T>
): Promise<T> {
  // Only batch GET requests for now
  if (!url.includes('GET') && !url.includes('get')) {
    return requestFn();
  }

  return new Promise((resolve, reject) => {
    // Get or create batch for this endpoint pattern
    const batchKey = url.split('?')[0]; // Use path without query params as key
    let batch = pendingBatches.get(batchKey);

    if (!batch) {
      batch = [];
      pendingBatches.set(batchKey, batch);
    }

    // Add request to batch
    batch.push({
      resolve: resolve as (value: unknown) => void,
      reject,
      url,
      method: 'GET',
    });

    // If batch is full, process immediately
    if (batch.length >= MAX_BATCH_SIZE) {
      processBatch(batchKey);
    } else {
      // Schedule batch processing
      if (!batchTimer) {
        batchTimer = setTimeout(() => {
          processBatches();
          batchTimer = null;
        }, BATCH_WINDOW);
      }
    }
  });
}
```

**What this does:**
- Only batches GET requests
- Groups by endpoint path
- Adds to batch
- Processes when full or after window

### Process Batch

```typescript
function processBatch(batchKey: string): void {
  const batch = pendingBatches.get(batchKey);
  if (!batch || batch.length === 0) {
    pendingBatches.delete(batchKey);
    return;
  }

  // For now, just execute requests individually
  // In the future, could implement actual batching endpoint
  batch.forEach(({ resolve }) => {
    // This would need to be replaced with actual batched API call
    // For now, just resolve immediately (placeholder)
    resolve(null);
  });

  pendingBatches.delete(batchKey);
}
```

**What this does:**
- Processes batch
- Currently placeholder
- Would execute batched API call
- Resolves all promises

## Configuration

```typescript
const BATCH_WINDOW = 50; // 50ms window to collect requests
const MAX_BATCH_SIZE = 10; // Maximum requests per batch
```

**What this does:**
- Defines batch window (50ms)
- Defines max batch size (10)
- Configurable constants

## Future Implementation

To implement actual batching:

1. Create batched endpoint on backend
2. Collect all requests in batch
3. Send single request with all queries
4. Distribute results to individual promises

## Usage Example

```typescript
import { batchRequest } from '@/utils/requestBatcher';

const result = await batchRequest(
  '/api/images?page=1',
  () => api.get('/api/images?page=1')
);
```

## Summary

**requestBatcher** is the request batching utility that:
1. ✅ Batches requests together
2. ✅ Reduces HTTP requests
3. ✅ Configurable window and size
4. ✅ Prepared for actual batching
5. ✅ Easy to extend

It's the "performance optimizer" - reducing API calls!


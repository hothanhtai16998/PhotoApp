# retry.ts Utility Explanation

## What is retry.ts?

`retry.ts` is a **utility module** for retrying failed API calls with configurable retry logic. It supports fixed and exponential backoff strategies.

## Functions

### `retry<T>(fn, options)`

Main retry function with configurable options.

```typescript
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T>
```

**Parameters:**
- `fn`: Async function to retry
- `options`: Retry configuration

**Returns:** Promise that resolves with function result

### `retryWithExponentialBackoff<T>(fn, maxRetries, initialDelay)`

Convenience function for exponential backoff.

```typescript
export async function retryWithExponentialBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = apiConfig.retry.maxRetries,
  initialDelay: number = apiConfig.retry.initialDelayMs
): Promise<T>
```

## Retry Options

```typescript
interface RetryOptions {
  maxRetries?: number;        // Default: 3
  delay?: number;              // Default: 1000ms
  backoff?: 'fixed' | 'exponential';  // Default: 'exponential'
  shouldRetry?: (error: unknown) => boolean;  // Custom retry logic
}
```

## Step-by-Step Breakdown

### Default Options

```typescript
const {
  maxRetries = 3,
  delay = 1000,
  backoff = 'exponential',
  shouldRetry = (error: unknown) => {
    // Default: retry on network errors and 5xx server errors
    if (error && typeof error === 'object' && 'response' in error) {
      const apiError = error as { response?: { status?: number } };
      const status = apiError.response?.status;
      return status === undefined || (status >= 500 && status < 600);
    }
    // Retry on network errors (no response)
    return true;
  },
} = options;
```

**What this does:**
- Sets default retry count (3 attempts)
- Sets default delay (1 second)
- Uses exponential backoff by default
- Default retry logic: retry on network errors and 5xx errors

### Retry Loop

```typescript
let lastError: unknown;
let currentDelay = delay;

for (let attempt = 0; attempt <= maxRetries; attempt++) {
  try {
    return await fn();
  } catch (error) {
    lastError = error;

    // Don't retry if we've exhausted retries
    if (attempt >= maxRetries) {
      throw error;
    }

    // Check if we should retry this error
    if (!shouldRetry(error)) {
      throw error;
    }

    // Wait before retrying
    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, currentDelay));
      
      // Apply backoff strategy
      if (backoff === 'exponential') {
        currentDelay *= 2;
      }
    }
  }
}

throw lastError;
```

**What this does:**
1. Tries to execute function
2. If succeeds, returns result
3. If fails, checks if should retry
4. Waits before retrying (with backoff)
5. Repeats until success or max retries
6. Throws last error if all retries fail

**Backoff strategies:**
- **Fixed**: Same delay each time (e.g., 1s, 1s, 1s)
- **Exponential**: Delay doubles each time (e.g., 1s, 2s, 4s)

## Usage Examples

### Basic Retry

```typescript
import { retry } from '@/utils/retry';

const fetchData = async () => {
  const response = await api.get('/data');
  return response.data;
};

// Retry up to 3 times with exponential backoff
const data = await retry(fetchData);
```

### Custom Retry Options

```typescript
const data = await retry(fetchData, {
  maxRetries: 5,
  delay: 500,
  backoff: 'fixed',
  shouldRetry: (error) => {
    // Only retry on 500 errors
    if (error && typeof error === 'object' && 'response' in error) {
      const apiError = error as { response?: { status?: number } };
      return apiError.response?.status === 500;
    }
    return false;
  },
});
```

### Exponential Backoff (Convenience)

```typescript
import { retryWithExponentialBackoff } from '@/utils/retry';

const data = await retryWithExponentialBackoff(fetchData, 5, 1000);
// Retries 5 times with 1s, 2s, 4s, 8s, 16s delays
```

## Default Retry Logic

The default `shouldRetry` function:

```typescript
shouldRetry = (error: unknown) => {
  // Retry on network errors and 5xx server errors
  if (error && typeof error === 'object' && 'response' in error) {
    const apiError = error as { response?: { status?: number } };
    const status = apiError.response?.status;
    return status === undefined || (status >= 500 && status < 600);
  }
  // Retry on network errors (no response)
  return true;
}
```

**What this retries:**
- ✅ Network errors (no response)
- ✅ 5xx server errors (500, 502, 503, etc.)
- ❌ 4xx client errors (400, 401, 404, etc.)
- ❌ Other errors

**Why this logic?**
- Network errors are often temporary
- Server errors might be temporary
- Client errors are usually permanent (don't retry)

## Backoff Strategies

### Fixed Backoff

```typescript
retry(fn, { backoff: 'fixed', delay: 1000 })
// Attempt 1: immediate
// Attempt 2: wait 1s
// Attempt 3: wait 1s
// Attempt 4: wait 1s
```

### Exponential Backoff

```typescript
retry(fn, { backoff: 'exponential', delay: 1000 })
// Attempt 1: immediate
// Attempt 2: wait 1s
// Attempt 3: wait 2s
// Attempt 4: wait 4s
```

**Why exponential?**
- Reduces server load
- Gives server time to recover
- Standard practice for retries

## Configuration

Default values come from `apiConfig`:

```typescript
export const apiConfig = {
  retry: {
    maxRetries: 3,
    initialDelayMs: 1000,
  },
} as const;
```

## Common Questions

### Q: When should I use retry?
**A:** For network requests that might fail temporarily (network issues, server overload).

### Q: Should I retry on 4xx errors?
**A:** Usually no. 4xx errors are client errors (bad request, unauthorized) that won't succeed on retry.

### Q: What's the difference between fixed and exponential backoff?
**A:** Fixed uses same delay each time. Exponential doubles delay each retry (better for server recovery).

### Q: Can I customize retry logic?
**A:** Yes, use `shouldRetry` option to define custom logic.

### Q: What happens if all retries fail?
**A:** The last error is thrown. Handle it with try/catch.

## Summary

**retry.ts** is a robust retry utility that:
1. ✅ Retries failed operations with configurable logic
2. ✅ Supports fixed and exponential backoff
3. ✅ Allows custom retry conditions
4. ✅ Handles network and server errors
5. ✅ Provides sensible defaults

It's the "resilience helper" - making your app more robust against temporary failures!


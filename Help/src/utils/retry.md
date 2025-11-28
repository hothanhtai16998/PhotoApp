# retry Explanation

## What is retry?

`retry` is a **utility module** that provides retry logic for failed API calls. It supports configurable retry strategies including exponential backoff.

## Key Features

### 1. **Retry Logic**
- Configurable max retries
- Exponential or fixed backoff
- Custom retry conditions
- Error handling

### 2. **Smart Retry**
- Only retries on network errors
- Retries on 5xx server errors
- Skips retry on client errors (4xx)
- Configurable shouldRetry function

### 3. **Backoff Strategies**
- Exponential backoff (default)
- Fixed delay
- Configurable initial delay

## Step-by-Step Breakdown

### Retry Function

```typescript
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
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
}
```

**What this does:**
- Retries function up to maxRetries times
- Checks shouldRetry before retrying
- Applies backoff strategy
- Throws last error if all retries fail

**Default Behavior:**
- Retries 3 times
- 1 second initial delay
- Exponential backoff
- Retries on network errors and 5xx

### Exponential Backoff Convenience

```typescript
export async function retryWithExponentialBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = apiConfig.retry.maxRetries,
  initialDelay: number = apiConfig.retry.initialDelayMs
): Promise<T> {
  return retry(fn, {
    maxRetries,
    delay: initialDelay,
    backoff: 'exponential',
  });
}
```

**What this does:**
- Convenience function for exponential backoff
- Uses config values
- Simplified API

## Usage Examples

### Basic Usage

```typescript
import { retry } from '@/utils/retry';

const result = await retry(async () => {
  return await api.get('/images');
});
```

### Custom Options

```typescript
const result = await retry(async () => {
  return await api.get('/images');
}, {
  maxRetries: 5,
  delay: 2000,
  backoff: 'fixed',
  shouldRetry: (error) => {
    // Only retry on timeout
    return error?.code === 'ECONNABORTED';
  },
});
```

### Exponential Backoff

```typescript
import { retryWithExponentialBackoff } from '@/utils/retry';

const result = await retryWithExponentialBackoff(async () => {
  return await api.get('/images');
});
```

## Backoff Examples

**Exponential (default):**
- Attempt 1: 1s delay
- Attempt 2: 2s delay
- Attempt 3: 4s delay

**Fixed:**
- Attempt 1: 1s delay
- Attempt 2: 1s delay
- Attempt 3: 1s delay

## Summary

**retry** is the retry utility that:
1. ✅ Retries failed API calls
2. ✅ Supports exponential backoff
3. ✅ Configurable retry conditions
4. ✅ Smart error handling
5. ✅ Easy to use

It's the "resilience helper" - making API calls more reliable!

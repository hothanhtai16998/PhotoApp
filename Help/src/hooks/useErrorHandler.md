# useErrorHandler Hook Explanation

## What is useErrorHandler?

`useErrorHandler` is a **custom React hook** that provides centralized error handling. It handles API errors, validation errors, rate limits, and provides consistent error messages.

## Hook Structure

```typescript
export function useErrorHandler(options: ErrorHandlerOptions = {}): {
  handleError: (error: unknown, customMessage?: string) => string;
  handleAsyncError: <T,>(asyncFn: () => Promise<T>, options?: ErrorHandlerOptions) => Promise<[T | null, Error | null]>;
}
```

## Key Features

### 1. **Comprehensive Error Handling**
- API errors (Axios)
- Validation errors
- Rate limit errors
- Network errors
- Generic errors

### 2. **User-Friendly Messages**
- Localized error messages
- Specific messages per error type
- Fallback messages

### 3. **Rate Limit Handling**
- Parses rate limit headers
- Shows time until retry
- User-friendly messages

## Step-by-Step Breakdown

### Options

```typescript
interface ErrorHandlerOptions {
  showToast?: boolean;      // Default: true
  fallbackMessage?: string;  // Default: 'Đã xảy ra lỗi...'
  logError?: boolean;        // Default: true
}
```

**What these do:**
- `showToast`: Whether to show toast notification
- `fallbackMessage`: Default error message
- `logError`: Whether to log to console

### Handle Error

```typescript
const handleError = useCallback(
  (error: unknown, customMessage?: string) => {
    if (logError) {
      console.error('Error:', error);
    }

    let message = customMessage ?? fallbackMessage;

    // Handle Axios errors
    if (error && typeof error === 'object' && 'response' in error) {
      const apiError = error as ApiError;

      // Handle validation errors
      if (apiError.response?.data?.errors && Array.isArray(...)) {
        const validationErrors = apiError.response.data.errors
          .map(err => err.msg ?? err.message ?? 'Validation failed')
          .join(', ');
        message = `Lỗi xác thực: ${validationErrors}`;
      } else if (apiError.response?.data?.message) {
        message = apiError.response.data.message;
      }

      // Handle specific error codes
      if (apiError.code === 'ECONNABORTED') {
        message = 'Yêu cầu hết thời gian. Vui lòng thử lại.';
      } else if (apiError.response?.status === 429) {
        // Rate limit - parse headers
        const rateLimitInfo = parseRateLimitHeaders(headers);
        message = getRateLimitMessage(rateLimitInfo);
      } else if (apiError.response?.status === 401 || apiError.response?.status === 403) {
        message = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
      } else if (apiError.response?.status === 404) {
        message = 'Không tìm thấy tài nguyên.';
      } else if (apiError.response?.status === 500) {
        message = 'Lỗi máy chủ. Vui lòng thử lại sau.';
      }
    } else if (error instanceof Error) {
      message = error.message ?? message;
    }

    if (showToast) {
      toast.error(message);
    }

    return message;
  },
  [showToast, fallbackMessage, logError]
);
```

**What this does:**
- Handles different error types
- Extracts user-friendly messages
- Shows toast notification
- Returns error message

### Handle Async Error

```typescript
const handleAsyncError = useCallback(
  async <T,>(
    asyncFn: () => Promise<T>,
    options?: ErrorHandlerOptions
  ): Promise<[T | null, Error | null]> => {
    try {
      const result = await asyncFn();
      return [result, null];
    } catch (error) {
      handleError(error, options?.fallbackMessage);
      return [null, error as Error];
    }
  },
  [handleError]
);
```

**What this does:**
- Wraps async function
- Catches errors automatically
- Returns tuple [result, error]
- Handles errors with hook

## Usage Examples

### Basic Usage

```typescript
const { handleError } = useErrorHandler();

try {
  await someAsyncOperation();
} catch (error) {
  handleError(error);
}
```

### With Custom Message

```typescript
const { handleError } = useErrorHandler();

try {
  await uploadImage();
} catch (error) {
  handleError(error, 'Failed to upload image');
}
```

### Async Wrapper

```typescript
const { handleAsyncError } = useErrorHandler();

const [result, error] = await handleAsyncError(async () => {
  return await fetchData();
});

if (error) {
  // Error already handled, just check result
  return;
}

// Use result
```

## Summary

**useErrorHandler** is the centralized error handling hook that:
1. ✅ Handles all error types
2. ✅ Provides user-friendly messages
3. ✅ Shows toast notifications
4. ✅ Handles rate limits
5. ✅ Supports async operations

It's the "error handler" - making error handling consistent across the app!


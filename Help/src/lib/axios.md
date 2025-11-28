# axios.ts Explanation

## What is axios.ts?

`axios.ts` is the **configured Axios instance** for making HTTP requests to the backend API. It includes interceptors for authentication, CSRF protection, token refresh, and error handling.

## Axios Instance Creation

```typescript
const api = axios.create({
  baseURL: import.meta.env.MODE === 'development'
    ? 'http://localhost:3000/api'
    : '/api',
  withCredentials: true,
  timeout: appConfig.apiTimeout, // 2 minutes
});
```

**Configuration:**
- **baseURL**: API endpoint (localhost in dev, relative in prod)
- **withCredentials**: Sends cookies (for refresh token)
- **timeout**: Request timeout (2 minutes for file uploads)

## Request Interceptors

### 1. Request Cancellation Check

```typescript
api.interceptors.request.use(
  (config) => {
    // If signal is provided and already aborted, reject immediately
    if (config.signal?.aborted) {
      return Promise.reject(new axios.Cancel('Request was cancelled'));
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
```

**What this does:**
- Checks if request was already cancelled
- Rejects immediately if aborted
- Prevents unnecessary network requests

**Why first?**
- Fastest check, fails early
- Saves network bandwidth
- Better performance

### 2. Authentication & CSRF Headers

```typescript
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const { accessToken } = useAuthStore.getState();

    // Add Authorization header
    if (accessToken && config.headers) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    // Add CSRF token for state-changing requests
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(config.method?.toUpperCase() ?? '')) {
      const csrfToken = getCsrfTokenFromCookie();
      if (csrfToken && config.headers) {
        config.headers['X-XSRF-TOKEN'] = csrfToken;
      }
    }

    // Set Content-Type for JSON requests
    if (config.data && typeof config.data === 'object' && 
        !config.headers?.['Content-Type'] && !config.headers?.['content-type']) {
      if (config.headers) {
        config.headers['Content-Type'] = 'application/json';
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
```

**What this does:**
1. **Authorization Header**: Adds Bearer token if user is logged in
2. **CSRF Token**: Adds CSRF token for POST/PUT/DELETE/PATCH requests
3. **Content-Type**: Sets JSON content type if not already set

**Why CSRF token?**
- Protects against Cross-Site Request Forgery attacks
- Required for state-changing requests
- Token is in cookie, sent in header

**CSRF Token Helper:**

```typescript
const getCsrfTokenFromCookie = (): string | null => {
  if (typeof document === 'undefined') return null;
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'XSRF-TOKEN' && value) {
      return decodeURIComponent(value);
    }
  }
  return null;
};
```

**What this does:**
- Reads `XSRF-TOKEN` cookie
- Returns decoded token value
- Returns `null` if not found or in SSR

## Response Interceptor

### Token Refresh on 401/403

```typescript
api.interceptors.response.use(
  (res) => res, // Pass through successful responses
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retryCount?: number;
    };

    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Handle rate limit errors (429) - don't retry
    if (error.response?.status === 429) {
      return Promise.reject(error);
    }

    // Skip token refresh for auth endpoints
    const authEndpoints = ['/auth/signin', '/auth/signup', '/auth/refresh'];
    if (originalRequest.url && authEndpoints.some(endpoint => 
        originalRequest.url?.includes(endpoint))) {
      return Promise.reject(error);
    }

    originalRequest._retryCount = originalRequest._retryCount ?? 0;

    // Retry on 403 (token expired) or 401 (unauthorized)
    if ((error.response?.status === 403 || error.response?.status === 401) &&
        originalRequest._retryCount < 3) {
      originalRequest._retryCount += 1;

      try {
        // Try to refresh token
        const res = await api.post('/auth/refresh', {}, { withCredentials: true });
        const newAccessToken = res.data.accessToken;

        // Update token in store
        useAuthStore.getState().setAccessToken(newAccessToken);

        // Retry original request with new token
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }

        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - clear auth and reject
        useAuthStore.getState().clearAuth();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
```

**What this does:**
1. **Passes through successful responses**: No modification needed
2. **Handles rate limit (429)**: Doesn't retry, just rejects
3. **Skips auth endpoints**: Prevents infinite loops
4. **Retries on 401/403**: Tries to refresh token and retry request
5. **Limits retries**: Max 3 retries to prevent infinite loops
6. **Clears auth on refresh failure**: User must sign in again

**Flow Diagram:**

```
Request fails with 401/403
    ↓
Check if auth endpoint? → Yes → Reject (no refresh)
    ↓ No
Check retry count < 3? → No → Reject
    ↓ Yes
Call /auth/refresh
    ↓
├─ Success → Update token → Retry original request
└─ Failure → Clear auth → Reject
```

## Why This Architecture?

### 1. **Automatic Token Refresh**
- User doesn't need to manually sign in again
- Seamless experience
- Tokens refresh in background

### 2. **CSRF Protection**
- All state-changing requests protected
- Token from cookie, sent in header
- Prevents CSRF attacks

### 3. **Request Cancellation**
- Supports AbortController
- Prevents unnecessary requests
- Better performance

### 4. **Error Handling**
- Rate limits handled gracefully
- Auth errors trigger refresh
- Prevents infinite loops

## Usage Examples

### Basic GET Request

```typescript
import api from '@/lib/axios';

const response = await api.get('/images');
const images = response.data;
```

### POST Request with Data

```typescript
const response = await api.post('/images', {
  title: 'My Image',
  description: 'Description'
});
```

### Request with Cancellation

```typescript
const controller = new AbortController();

api.get('/images', { signal: controller.signal })
  .then(response => {
    // Handle response
  })
  .catch(error => {
    if (axios.isCancel(error)) {
      console.log('Request cancelled');
    }
  });

// Cancel request
controller.abort();
```

### Request with Custom Timeout

```typescript
const response = await api.post('/upload', formData, {
  timeout: 300000, // 5 minutes for large uploads
});
```

## Common Questions

### Q: Why use interceptors instead of manual headers?
**A:** Interceptors automatically add headers to all requests. No need to remember in each request.

### Q: What happens if refresh token expires?
**A:** Refresh fails, auth is cleared, user must sign in again.

### Q: Why limit retries to 3?
**A:** Prevents infinite loops if refresh keeps failing. 3 is usually enough.

### Q: Can I disable automatic token refresh?
**A:** Not easily. It's built into the interceptor. You'd need to modify the code.

### Q: Why skip auth endpoints?
**A:** Prevents infinite loops. If `/auth/refresh` fails, we shouldn't try to refresh again.

### Q: What's the difference between 401 and 403?
**A:** 
- 401: Unauthorized (no/invalid token)
- 403: Forbidden (token expired, needs refresh)

## Summary

**axios.ts** is the configured HTTP client that:
1. ✅ Sets up base URL and credentials
2. ✅ Adds authentication headers automatically
3. ✅ Adds CSRF protection for state-changing requests
4. ✅ Refreshes tokens automatically on 401/403
5. ✅ Handles request cancellation
6. ✅ Prevents infinite retry loops
7. ✅ Provides seamless token management

It's the "communication hub" for your app - handling all API requests with automatic authentication and error recovery!


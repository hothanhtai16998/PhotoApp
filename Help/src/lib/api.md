# api.ts Explanation

## What is api.ts?

`api.ts` is an **enhanced API wrapper** that wraps the axios instance with request deduplication. It provides GET, POST, PUT, DELETE, and PATCH methods with automatic deduplication for GET requests.

## Why Request Deduplication?

**Problem:**
- Multiple components might request the same data simultaneously
- Without deduplication, multiple identical requests are sent
- Wastes bandwidth and server resources
- Can cause race conditions

**Solution:**
- Deduplicate identical GET requests
- Only send one request, share the result
- Reduces server load
- Prevents race conditions

## API Methods

### GET Request (with Deduplication)

```typescript
export async function get<T = unknown>(
  url: string,
  config?: AxiosRequestConfig
): Promise<AxiosResponse<T>> {
  return deduplicateRequest(
    'GET',
    url,
    () => api.get<T>(url, config),
    config?.params
  );
}
```

**What this does:**
- Wraps `api.get()` with deduplication
- Passes method, URL, request function, and params
- Returns same promise for identical requests
- Only GET requests are deduplicated

**Example:**
```typescript
// Component A
const response1 = await get('/images');

// Component B (same request)
const response2 = await get('/images');

// Only ONE request is sent!
// Both components get the same response
```

### POST Request (no Deduplication)

```typescript
export async function post<T = unknown>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<AxiosResponse<T>> {
  return api.post<T>(url, data, config);
}
```

**Why no deduplication?**
- POST requests are mutations (create/update)
- Each request should be executed
- Deduplication could cause data loss
- User expects action to happen

### PUT Request (no Deduplication)

```typescript
export async function put<T = unknown>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<AxiosResponse<T>> {
  return api.put<T>(url, data, config);
}
```

**Same reasoning as POST:**
- Mutations should always execute
- No deduplication needed

### DELETE Request (no Deduplication)

```typescript
export async function del<T = unknown>(
  url: string,
  config?: AxiosRequestConfig
): Promise<AxiosResponse<T>> {
  return api.delete<T>(url, config);
}
```

**Same reasoning:**
- Deletions should always execute
- No deduplication

### PATCH Request (no Deduplication)

```typescript
export async function patch<T = unknown>(
  url: string,
  data?: unknown,
  config?: AxiosRequestConfig
): Promise<AxiosResponse<T>> {
  return api.patch<T>(url, data, config);
}
```

**Same reasoning:**
- Updates should always execute
- No deduplication

## How Deduplication Works

The `deduplicateRequest` function (from `@/utils/requestDeduplication`) works like this:

1. **Creates a unique key** from method, URL, and params
2. **Checks if request is in progress** using the key
3. **If in progress**: Returns the existing promise
4. **If not in progress**: Sends request and stores promise
5. **When complete**: Removes promise from cache

**Example Flow:**

```
Request 1: get('/images?page=1')
  → Key: "GET:/images?page=1"
  → No existing request
  → Send request
  → Store promise

Request 2: get('/images?page=1') (same request)
  → Key: "GET:/images?page=1"
  → Existing request found!
  → Return existing promise
  → No new request sent

Request 1 completes
  → Remove promise from cache
  → Both requests resolve with same data
```

## Usage Examples

### Using GET (Deduplicated)

```typescript
import { get } from '@/lib/api';

// Multiple components can call this simultaneously
const fetchImages = async () => {
  const response = await get('/images');
  return response.data;
};

// Component A
const images1 = await fetchImages();

// Component B (same request)
const images2 = await fetchImages();

// Only ONE request sent!
```

### Using POST (Not Deduplicated)

```typescript
import { post } from '@/lib/api';

// Each call sends a request
const createImage = async (data) => {
  const response = await post('/images', data);
  return response.data;
};

// These are separate requests
await createImage({ title: 'Image 1' });
await createImage({ title: 'Image 2' });
```

### Using PUT

```typescript
import { put } from '@/lib/api';

const updateImage = async (id, data) => {
  const response = await put(`/images/${id}`, data);
  return response.data;
};
```

### Using DELETE

```typescript
import { del } from '@/lib/api';

const deleteImage = async (id) => {
  const response = await del(`/images/${id}`);
  return response.data;
};
```

## When to Use Which Method

### Use `get()` for:
- ✅ Fetching data
- ✅ Reading resources
- ✅ Search queries
- ✅ Any read operation

### Use `post()`, `put()`, `patch()`, `del()` for:
- ✅ Creating resources
- ✅ Updating resources
- ✅ Deleting resources
- ✅ Any mutation operation

## Benefits

### 1. **Performance**
- Reduces duplicate requests
- Saves bandwidth
- Faster response times

### 2. **Consistency**
- Multiple components get same data
- Prevents race conditions
- Ensures data consistency

### 3. **Server Load**
- Fewer requests to server
- Less database queries
- Better scalability

## Common Questions

### Q: Why only deduplicate GET requests?
**A:** GET requests are idempotent (safe to repeat). POST/PUT/DELETE are mutations that should always execute.

### Q: What if I want to force a new request?
**A:** Add a unique query parameter: `get('/images?t=' + Date.now())`

### Q: How long are requests cached?
**A:** Only while request is in progress. Once complete, cache is cleared.

### Q: Can I disable deduplication?
**A:** Use `api.get()` directly instead of `get()` from this file.

### Q: What about request cancellation?
**A:** Still works! AbortController signals are passed through.

## Summary

**api.ts** is an enhanced API wrapper that:
1. ✅ Provides typed HTTP methods
2. ✅ Deduplicates GET requests automatically
3. ✅ Keeps mutations (POST/PUT/DELETE) separate
4. ✅ Reduces server load
5. ✅ Prevents race conditions
6. ✅ Maintains type safety

It's the "smart request manager" - automatically optimizing your API calls while keeping mutations safe!


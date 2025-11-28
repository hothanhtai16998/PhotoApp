# imageFetchService Explanation

## What is imageFetchService?

`imageFetchService` is a **service module** that provides image fetching-related API methods. It handles fetching images, user images, and locations with caching and request cancellation.

## Key Features

### 1. **Image Fetching**
- Fetch images with filters
- Fetch user images
- Request cancellation support
- Cache-busting

### 2. **Location Fetching**
- Fetch all locations
- SessionStorage caching
- 5-minute cache duration

### 3. **Filtering Support**
- Search, category, location
- Color, tag filters
- Pagination

## Step-by-Step Breakdown

### Fetch Images

```typescript
fetchImages: async (
  params?: FetchImagesParams,
  signal?: AbortSignal
): Promise<FetchImagesResponse> => {
  const queryParams = new URLSearchParams();

  if (params?.page) {
    queryParams.append('page', params.page.toString());
  }
  if (params?.limit) {
    queryParams.append('limit', params.limit.toString());
  }
  if (params?.search) {
    queryParams.append('search', params.search);
  }
  if (params?.category) {
    queryParams.append('category', params.category);
  }
  if (params?.location) {
    queryParams.append('location', params.location);
  }
  if (params?.color) {
    queryParams.append('color', params.color);
  }
  if (params?.tag) {
    queryParams.append('tag', params.tag);
  }

  // Add cache-busting timestamp if refresh is requested
  if (params?._refresh) {
    queryParams.append('_t', Date.now().toString());
  }

  const queryString = queryParams.toString();
  const url = queryString ? `/images?${queryString}` : '/images';

  const res = await get(url, {
    withCredentials: true,
    signal, // Pass abort signal for request cancellation
  });

  // Handle both old format (array) and new format (with pagination)
  const data = res.data as FetchImagesResponse | Image[];
  if (Array.isArray(data)) {
    return { images: data };
  }
  if (data.images) {
    return data;
  }
  return { images: [] };
},
```

**What this does:**
- Builds query string from params
- Adds cache-busting timestamp
- Supports request cancellation
- Handles both response formats
- Returns normalized response

### Fetch User Images

```typescript
fetchUserImages: async (
  userId: string,
  params?: FetchImagesParams,
  signal?: AbortSignal
): Promise<FetchImagesResponse> => {
  const queryParams = new URLSearchParams();

  if (params?.page) {
    queryParams.append('page', params.page.toString());
  }
  if (params?.limit) {
    queryParams.append('limit', params.limit.toString());
  }

  if (params?._refresh) {
    queryParams.append('_t', Date.now().toString());
  }

  const queryString = queryParams.toString();
  const url = queryString
    ? `/images/user/${userId}?${queryString}`
    : `/images/user/${userId}`;

  const res = await get(url, {
    withCredentials: true,
    signal,
  });

  // Similar response handling...
},
```

**What this does:**
- Fetches images for specific user
- Supports pagination
- Cache-busting support
- Request cancellation

### Fetch Locations

```typescript
fetchLocations: async (forceRefresh = false): Promise<string[]> => {
  // Simple cache to prevent duplicate requests
  const cacheKey = 'imageLocationsCache';
  if (!forceRefresh) {
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        const now = Date.now();
        if (now - timestamp < 5 * 60 * 1000) {
          // 5 minutes cache
          return data;
        }
      } catch {
        // Invalid cache, continue to fetch
      }
    }
  }

  const res = await get<FetchLocationsResponse>('/images/locations', {
    withCredentials: true,
  });

  const locations = res.data.locations || [];

  // Update cache
  sessionStorage.setItem(
    cacheKey,
    JSON.stringify({
      data: locations,
      timestamp: Date.now(),
    })
  );

  return locations;
},
```

**What this does:**
- Fetches all image locations
- Uses sessionStorage cache
- 5-minute cache duration
- Force refresh option

## Usage Examples

### Fetch Images

```typescript
const signal = useRequestCancellation();
const response = await imageFetchService.fetchImages({
  page: 1,
  limit: 20,
  category: 'Nature',
  search: 'sunset',
}, signal);
```

### Fetch User Images

```typescript
const response = await imageFetchService.fetchUserImages(userId, {
  page: 1,
  limit: 30,
});
```

### Fetch Locations

```typescript
const locations = await imageFetchService.fetchLocations();
// Returns cached if available, otherwise fetches
```

## Summary

**imageFetchService** is the image fetching service that:
1. ✅ Fetches images with filters
2. ✅ Fetches user images
3. ✅ Fetches locations with caching
4. ✅ Request cancellation
5. ✅ Cache-busting

It's the "image fetcher" - retrieving images from the API!


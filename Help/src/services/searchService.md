# searchService Explanation

## What is searchService?

`searchService` is a **service module** that provides search-related API methods. It handles search suggestions and popular searches.

## Key Features

### 1. **Search Suggestions**
- Get suggestions based on query
- Request cancellation support
- Error handling

### 2. **Popular Searches**
- Get popular searches
- No query needed
- Cached results

### 3. **Error Handling**
- Handles cancelled requests
- Returns empty array on error
- Silent failures

## Step-by-Step Breakdown

### Get Suggestions

```typescript
getSuggestions: async (
  query: string,
  limit: number = 10,
  signal?: AbortSignal
): Promise<SearchSuggestion[]> => {
  if (!query || query.trim().length < 1) {
    return [];
  }

  try {
    const res = await get(`/search/suggestions?q=${encodeURIComponent(query.trim())}&limit=${limit}`, {
      withCredentials: true,
      signal, // Pass abort signal for request cancellation
    });

    return (res.data as SearchSuggestionsResponse).suggestions || [];
  } catch (error) {
    // Ignore cancelled requests
    if ((error as { code?: string })?.code === 'ERR_CANCELED' || 
        (error as { name?: string })?.name === 'CanceledError') {
      return [];
    }
    console.error('Failed to fetch search suggestions:', error);
    return [];
  }
},
```

**What this does:**
- Validates query (min 1 character)
- Fetches suggestions from API
- Supports request cancellation
- Handles cancelled requests
- Returns empty array on error

### Get Popular Searches

```typescript
getPopularSearches: async (): Promise<SearchSuggestion[]> => {
  try {
    const res = await get('/search/popular', {
      withCredentials: true,
    });

    return (res.data as PopularSearchesResponse).popular || [];
  } catch (error) {
    console.error('Failed to fetch popular searches:', error);
    return [];
  }
},
```

**What this does:**
- Fetches popular searches
- No query needed
- Returns empty array on error
- Used for search bar suggestions

## Usage Examples

### Get Suggestions

```typescript
const signal = useRequestCancellation();
const suggestions = await searchService.getSuggestions('sunset', 10, signal);
```

### Get Popular Searches

```typescript
const popular = await searchService.getPopularSearches();
```

## Summary

**searchService** is the search service that:
1. ✅ Provides search suggestions
2. ✅ Popular searches
3. ✅ Request cancellation
4. ✅ Error handling
5. ✅ Easy to use

It's the "search API" - providing search functionality!


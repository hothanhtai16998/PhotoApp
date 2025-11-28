# search Types Explanation

## What is search Types?

`search` types is a **TypeScript type definitions file** that defines all search-related types and interfaces. It provides type safety for search suggestions and popular searches.

## Key Features

### 1. **Search Suggestion Types**
- Suggestion interface
- Multiple suggestion types
- Query and text

### 2. **Response Types**
- Search suggestions response
- Popular searches response

### 3. **Type Safety**
- TypeScript interfaces
- Union types for suggestion types
- Consistent structure

## Step-by-Step Breakdown

### Search Suggestion

```typescript
export interface SearchSuggestion {
  type: 'title' | 'tag' | 'location' | 'category';
  text: string;
  query: string;
}
```

**What this does:**
- Defines search suggestion structure
- Suggestion type (title, tag, location, category)
- Display text
- Search query
- Used in search bar

### Suggestion Types

**Title:**
- Matches image titles
- Direct search query

**Tag:**
- Matches image tags
- Tag-based search

**Location:**
- Matches image locations
- Location-based search

**Category:**
- Matches categories
- Category-based search

### Search Suggestions Response

```typescript
export interface SearchSuggestionsResponse {
  suggestions: SearchSuggestion[];
  query?: string;
}
```

**What this does:**
- Defines suggestions response
- Array of suggestions
- Optional query
- Used for autocomplete

### Popular Searches Response

```typescript
export interface PopularSearchesResponse {
  popular: SearchSuggestion[];
}
```

**What this does:**
- Defines popular searches response
- Array of popular suggestions
- Used for search bar suggestions

## Usage Examples

### Search Suggestion

```typescript
import type { SearchSuggestion } from '@/types/search';

const suggestion: SearchSuggestion = {
  type: 'title',
  text: 'Beautiful Sunset',
  query: 'sunset',
};
```

### Get Suggestions

```typescript
import type { SearchSuggestionsResponse } from '@/types/search';

const response: SearchSuggestionsResponse = await searchService.getSuggestions('sunset');
response.suggestions.forEach(suggestion => {
  console.log(suggestion.type, suggestion.text);
});
```

### Popular Searches

```typescript
import type { PopularSearchesResponse } from '@/types/search';

const response: PopularSearchesResponse = await searchService.getPopularSearches();
response.popular.forEach(suggestion => {
  console.log(suggestion.text);
});
```

## Summary

**search types** is the search type definitions file that:
1. ✅ Defines SearchSuggestion interface
2. ✅ Multiple suggestion types
3. ✅ Response types
4. ✅ Type safety
5. ✅ Consistent structure

It's the "search types" - ensuring type safety for search!


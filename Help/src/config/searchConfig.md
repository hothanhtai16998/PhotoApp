# searchConfig Explanation

## What is searchConfig?

`searchConfig` is a **configuration file** that contains search-related settings. It defines search history limits, debounce delays, and storage keys.

## Key Features

### 1. **Search Settings**
- Maximum history items
- Search debounce delay
- Suggestions debounce delay
- Storage key

### 2. **Performance Optimization**
- Debounced search
- Faster suggestions
- Limited history

### 3. **Centralized Configuration**
- Easy to edit
- Single source of truth
- Type-safe

## Step-by-Step Breakdown

### Search Configuration

```typescript
export const searchConfig = {
    // Maximum number of search history items to store
    maxHistoryItems: 5,
    
    // Debounce delay for search input in milliseconds
    searchDebounceMs: 300,
    
    // Debounce delay for search suggestions (faster than main search)
    suggestionsDebounceMs: 200,
    
    // LocalStorage key for search filters
    filtersStorageKey: 'photoApp_searchFilters',
} as const;
```

**What this does:**
- Defines search settings
- 5 history items max
- 300ms search debounce
- 200ms suggestions debounce (faster)
- Storage key for filters

**Why these values?**
- 5 history: Good balance, not too many
- 300ms search: Prevents excessive API calls
- 200ms suggestions: Faster for better UX
- Storage key: Persistent filter state

## Usage Examples

### Search Debounce

```typescript
import { searchConfig } from '@/config/searchConfig';

const debouncedSearch = debounce(() => {
  performSearch(query);
}, searchConfig.searchDebounceMs);
```

### Suggestions Debounce

```typescript
const debouncedSuggestions = debounce(() => {
  fetchSuggestions(query);
}, searchConfig.suggestionsDebounceMs);
```

### History Limit

```typescript
import { searchConfig } from '@/config/searchConfig';

const history = getSearchHistory();
if (history.length >= searchConfig.maxHistoryItems) {
  history.shift(); // Remove oldest
}
history.push(newSearch);
```

### Storage Key

```typescript
import { searchConfig } from '@/config/searchConfig';

localStorage.setItem(searchConfig.filtersStorageKey, JSON.stringify(filters));
```

## Summary

**searchConfig** is the search configuration that:
1. ✅ Defines history limits
2. ✅ Debounce delays
3. ✅ Storage keys
4. ✅ Centralized settings
5. ✅ Easy to edit

It's the "search settings" - centralizing search configuration!


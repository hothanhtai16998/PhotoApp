# SearchBar Component Explanation

## What is SearchBar?

`SearchBar` is the **main search component** that provides search functionality with autocomplete, suggestions, search history, filters, and location search. It's used in the header and supports keyboard shortcuts.

## Key Features

### 1. **Multiple Suggestion Sources**
- Category suggestions
- Location suggestions
- API suggestions (from backend)
- Popular searches
- Search history

### 2. **Search Filters**
- Orientation filter
- Color filter
- Date range filter
- Persisted in localStorage

### 3. **Search History**
- Stores recent searches
- Shows in dropdown
- Limited to 5 items
- Persisted in localStorage

### 4. **Debounced Search**
- Reduces API calls
- Separate debounce for search vs suggestions
- Request cancellation on query change

## Step-by-Step Breakdown

### Component Setup

```typescript
export const SearchBar = forwardRef<SearchBarRef>((_props, ref) => {
  const { fetchImages, currentSearch } = useImageStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  // ... more state
});
```

**What this does:**
- Uses `forwardRef` to expose focus method
- Gets search state from store
- Manages local search query
- Tracks focus state

### Expose Focus Method

```typescript
useImperativeHandle(ref, () => ({
  focus: () => {
    inputRef.current?.focus();
  },
}));
```

**What this does:**
- Allows parent to focus search bar
- Used for keyboard shortcuts
- Programmatic control

### Load Search History

```typescript
useEffect(() => {
  try {
    const stored = localStorage.getItem(appConfig.storage.searchHistoryKey);
    if (stored) {
      const history = JSON.parse(stored) as SearchHistoryItem[];
      setSearchHistory(history.slice(0, searchConfig.maxHistoryItems));
    }
  } catch (error) {
    console.error('Failed to load search history:', error);
  }
}, []);
```

**What this does:**
- Loads search history from localStorage
- Limits to max items (5)
- Handles parse errors gracefully

### Load Suggestions

```typescript
useEffect(() => {
  const loadSuggestions = async () => {
    try {
      const [categories, locationsData, popular] = await Promise.all([
        categoryService.fetchCategories(),
        imageService.fetchLocations(),
        searchService.getPopularSearches()
      ]);
      setSuggestions(categoryNames);
      setLocations(locationsData);
      setPopularSearches(popular);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    }
  };
  loadSuggestions();
}, []);
```

**What this does:**
- Fetches categories, locations, and popular searches
- Loads in parallel with `Promise.all`
- Sets up suggestion data
- Handles errors

### API Suggestions (Debounced)

```typescript
useEffect(() => {
  if (suggestionsDebounceRef.current) {
    clearTimeout(suggestionsDebounceRef.current);
  }

  const query = searchQuery.trim();
  
  if (query.length >= 1) {
    setLoadingSuggestions(true);
    suggestionsDebounceRef.current = setTimeout(async () => {
      try {
        const apiResults = await searchService.getSuggestions(query, 10, cancelSignal);
        setApiSuggestions(apiResults);
      } catch (error) {
        if (axios.isCancel(error) || error.code === 'ERR_CANCELED') {
          return; // Ignore cancelled requests
        }
        setApiSuggestions([]);
      } finally {
        setLoadingSuggestions(false);
      }
    }, searchConfig.suggestionsDebounceMs);
  } else {
    setApiSuggestions([]);
    setLoadingSuggestions(false);
  }

  return () => {
    if (suggestionsDebounceRef.current) {
      clearTimeout(suggestionsDebounceRef.current);
    }
  };
}, [searchQuery, cancelSignal]);
```

**What this does:**
- Debounces API suggestion requests
- Cancels previous requests on query change
- Only searches if query is 1+ characters
- Handles cancelled requests gracefully

### Debounced Search

```typescript
useEffect(() => {
  if (debounceTimerRef.current) {
    clearTimeout(debounceTimerRef.current);
  }

  debounceTimerRef.current = setTimeout(() => {
    if (location.pathname === '/') {
      if (searchQuery.trim()) {
        fetchImages({ search: searchQuery.trim() });
        saveToHistory(searchQuery.trim());
      } else {
        fetchImages({ search: undefined });
      }
    }
  }, searchConfig.searchDebounceMs);

  return () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  };
}, [searchQuery, location.pathname, fetchImages, saveToHistory]);
```

**What this does:**
- Debounces actual search execution
- Only searches on homepage
- Saves to history on search
- Clears search if query is empty

### Save to History

```typescript
const saveToHistory = useCallback((query: string) => {
  if (!query.trim()) return;

  try {
    const stored = localStorage.getItem(appConfig.storage.searchHistoryKey);
    let history: SearchHistoryItem[] = stored ? JSON.parse(stored) : [];
    
    // Remove duplicates and add to beginning
    history = history.filter(item => item.query.toLowerCase() !== query.toLowerCase());
    history.unshift({ query: query.trim(), timestamp: Date.now() });
    
    // Keep only max history items
    history = history.slice(0, searchConfig.maxHistoryItems);
    
    localStorage.setItem(appConfig.storage.searchHistoryKey, JSON.stringify(history));
    setSearchHistory(history);
  } catch (error) {
    console.error('Failed to save search history:', error);
  }
}, []);
```

**What this does:**
- Saves search query to history
- Removes duplicates (case-insensitive)
- Adds to beginning (most recent first)
- Limits to max items
- Persists to localStorage

### Filters Management

```typescript
const loadFiltersFromStorage = (): SearchFiltersType => {
  try {
    const stored = localStorage.getItem(searchConfig.filtersStorageKey);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load filters:', error);
  }
  return {
    orientation: 'all',
    color: 'all',
    dateFrom: '',
    dateTo: '',
  };
};

const [filters, setFilters] = useState<SearchFiltersType>(loadFiltersFromStorage());
```

**What this does:**
- Loads filters from localStorage
- Provides default values
- Persists filter preferences

## Suggestion Dropdown

The dropdown shows:
1. **Search History** (if query is empty)
2. **Popular Searches** (if query is empty)
3. **Category Suggestions** (if matches)
4. **Location Suggestions** (if matches)
5. **API Suggestions** (as user types)

## Summary

**SearchBar** is the comprehensive search component that:
1. ✅ Provides autocomplete suggestions
2. ✅ Supports search filters
3. ✅ Maintains search history
4. ✅ Debounces API calls
5. ✅ Cancels outdated requests
6. ✅ Exposes focus method
7. ✅ Handles keyboard navigation

It's the "search engine" - making it easy for users to find what they're looking for!


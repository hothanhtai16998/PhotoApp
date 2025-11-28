# useCollectionsListStore Explanation

## What is useCollectionsListStore?

`useCollectionsListStore` is a **Zustand store** that manages the collections list page. It handles fetching, filtering, sorting, and managing collections with search, tag filtering, and sorting options.

## Key Features

### 1. **Collection Management**
- Fetch collections
- Delete collection
- Update collection
- Refresh collections

### 2. **Filtering & Sorting**
- Search query
- Public only filter
- Tag filter
- Sort by (newest, oldest, name, images)

### 3. **State Management**
- Collections array
- Filtered collections
- Loading states
- Deleting state

## Step-by-Step Breakdown

### Fetch Collections

```typescript
fetchCollections: async () => {
  set((state) => {
    state.loading = true;
  });

  try {
    const data = await collectionService.getUserCollections();
    set((state) => {
      state.collections = data;
      // Apply current filters
      get().applyFilters(data);
      state.loading = false;
    });
  } catch (error) {
    // Handle error...
  }
},
```

**What this does:**
- Fetches user collections
- Applies filters automatically
- Updates loading state
- Handles errors

### Apply Filters

```typescript
applyFilters: (collectionsToFilter: Collection[]) => {
  set((state) => {
    let filtered = [...collectionsToFilter];

    // Search filter
    if (state.searchQuery.trim()) {
      const query = state.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(
        (collection) =>
          collection.name.toLowerCase().includes(query) ||
          collection.description?.toLowerCase().includes(query) ||
          collection.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Tag filter
    if (state.selectedTag) {
      filtered = filtered.filter((collection) =>
        collection.tags?.includes(state.selectedTag!)
      );
    }

    // Public only filter
    if (state.showPublicOnly) {
      filtered = filtered.filter((collection) => collection.isPublic);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (state.sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'name':
          return a.name.localeCompare(b.name);
        case 'images':
          return (b.imageCount || 0) - (a.imageCount || 0);
        default:
          return 0;
      }
    });

    state.filteredCollections = filtered;
  });
},
```

**What this does:**
- Applies all filters
- Search by name, description, tags
- Filters by tag
- Filters by public/private
- Sorts by selected option

### Set Filters

```typescript
setSearchQuery: (query: string) => {
  set((state) => {
    state.searchQuery = query;
    get().applyFilters(state.collections);
  });
},

setShowPublicOnly: (show: boolean) => {
  set((state) => {
    state.showPublicOnly = show;
    get().applyFilters(state.collections);
  });
},

setSortBy: (sortBy: 'newest' | 'oldest' | 'name' | 'images') => {
  set((state) => {
    state.sortBy = sortBy;
    get().applyFilters(state.collections);
  });
},
```

**What this does:**
- Updates filter state
- Reapplies filters automatically
- Real-time filtering

## Usage Examples

### Fetch Collections

```typescript
const { collections, fetchCollections } = useCollectionsListStore();

useEffect(() => {
  fetchCollections();
}, []);
```

### Apply Filters

```typescript
const { setSearchQuery, setSortBy } = useCollectionsListStore();

const handleSearch = (query: string) => {
  setSearchQuery(query);
};

const handleSort = (sortBy: 'newest' | 'oldest' | 'name' | 'images') => {
  setSortBy(sortBy);
};
```

## Summary

**useCollectionsListStore** is the collections list store that:
1. ✅ Manages collections list
2. ✅ Filtering and sorting
3. ✅ Search functionality
4. ✅ Tag filtering
5. ✅ Real-time updates

It's the "collections list manager" - handling all collections list operations!


# SearchFilters Component Explanation

## What is SearchFilters?

`SearchFilters` is a **component** that provides advanced search filters for images. It includes orientation, color, and date range filters.

## Key Features

### 1. **Filter Types**
- Orientation (all, portrait, landscape, square)
- Color (all, red, orange, yellow, etc.)
- Date range (from/to dates)

### 2. **Filter UI**
- Collapsible filter panel
- Full-screen overlay on mobile
- Body scroll lock
- Reset filters option

### 3. **Filter State**
- Local filter state
- Syncs with parent
- Active filter indicator
- Reset functionality

## Step-by-Step Breakdown

### Component Props

```typescript
interface SearchFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  onReset: () => void;
}

export interface SearchFilters {
  orientation: Orientation;
  color: ColorFilter;
  dateFrom: string;
  dateTo: string;
}
```

**What this does:**
- Receives current filters
- Change handler
- Reset handler

### Body Scroll Lock

```typescript
useEffect(() => {
  if (isOpen) {
    // Calculate scrollbar width to prevent layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const scrollY = window.scrollY;
    const originalPaddingRight = document.body.style.paddingRight;
    
    // Lock body scroll
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.width = '100%';
    document.body.style.overflow = 'hidden';
    
    // Add padding to compensate for scrollbar
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    
    return () => {
      // Restore body scroll
      const savedScrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      document.body.style.paddingRight = originalPaddingRight || '';
      if (savedScrollY) {
        window.scrollTo(0, parseInt(savedScrollY || '0') * -1);
      }
    };
  }
}, [isOpen]);
```

**What this does:**
- Locks body scroll when open
- Prevents layout shift
- Restores on close
- Saves scroll position

### Filter Change Handler

```typescript
const handleFilterChange = useCallback((key: keyof SearchFilters, value: string) => {
  const newFilters = { ...localFilters, [key]: value };
  setLocalFilters(newFilters);
  onFiltersChange(newFilters);
}, [localFilters, onFiltersChange]);
```

**What this does:**
- Updates local state
- Syncs with parent
- Memoized callback

### Reset Filters

```typescript
const handleReset = useCallback(() => {
  const defaultFilters: SearchFilters = {
    orientation: 'all',
    color: 'all',
    dateFrom: '',
    dateTo: '',
  };
  setLocalFilters(defaultFilters);
  onFiltersChange(defaultFilters);
  onReset();
}, [onFiltersChange, onReset]);
```

**What this does:**
- Resets to defaults
- Updates local state
- Calls parent reset

### Active Filters Check

```typescript
const hasActiveFilters = filters.orientation !== 'all' || 
  filters.color !== 'all' || 
  filters.dateFrom || 
  filters.dateTo;
```

**What this does:**
- Checks if any filters active
- Used for indicator
- Reset button visibility

## Usage Examples

### In SearchBar

```typescript
<SearchFilters
  filters={filters}
  onFiltersChange={handleFiltersChange}
  onReset={handleResetFilters}
/>
```

## Summary

**SearchFilters** is the search filters component that:
1. ✅ Orientation and color filters
2. ✅ Date range filter
3. ✅ Body scroll lock
4. ✅ Reset functionality
5. ✅ Active filter indicator

It's the "search filters" - providing advanced search options!


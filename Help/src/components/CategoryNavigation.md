# CategoryNavigation Component Explanation

## What is CategoryNavigation?

`CategoryNavigation` is a **sticky navigation bar** that displays image categories. It sticks to the header when scrolling and allows users to filter images by category.

## Key Features

### 1. **Sticky Navigation**
- Sticks to header when scrolling
- Smooth transitions
- Preserves layout (spacer element)

### 2. **Dynamic Categories**
- Fetches categories from backend
- Adds "Tất cả" (All) option
- Updates automatically

### 3. **Scroll Detection**
- Detects when to stick
- Calculates header height
- Handles resize events

### 4. **Modal State Preservation**
- Preserves sticky state when modal opens
- Doesn't interfere with modal scrolling
- Better UX

## Step-by-Step Breakdown

### Header Height Calculation

```typescript
useEffect(() => {
  const updateHeaderHeight = () => {
    const header = document.querySelector('.unsplash-header') as HTMLElement;
    if (header) {
      const height = header.offsetHeight;
      setHeaderHeight(height);
      document.documentElement.style.setProperty('--header-height', `${height}px`);
    }
  };

  updateHeaderHeight();

  // Debounced resize handler
  let resizeTimer: number | null = null;
  const handleResize = () => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(updateHeaderHeight, timingConfig.ui.resizeDebounceMs);
  };
  window.addEventListener('resize', handleResize);

  // ResizeObserver for header size changes
  const header = document.querySelector('.unsplash-header');
  const resizeObserver = new ResizeObserver(() => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(updateHeaderHeight, timingConfig.ui.resizeDebounceMs);
  });
  resizeObserver.observe(header);

  return () => {
    window.removeEventListener('resize', handleResize);
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeObserver.disconnect();
  };
}, []);
```

**What this does:**
- Calculates header height
- Sets CSS variable for styling
- Updates on window resize
- Uses ResizeObserver for header changes
- Debounced to prevent excessive updates

### Sticky Logic

```typescript
useEffect(() => {
  const handleScroll = () => {
    // Don't update when modal is open
    if (document.body.classList.contains('image-modal-open')) {
      return;
    }
    
    const scrollY = window.scrollY || window.pageYOffset;
    
    // Store initial position
    if (initialNavTopRef.current === null) {
      const rect = nav.getBoundingClientRect();
      initialNavTopRef.current = rect.top + scrollY;
    }
    
    // Calculate when header reaches nav position
    const scrollPositionWhereHeaderReachesNav = initialNavTopRef.current - headerHeight;
    const shouldStick = scrollY >= scrollPositionWhereHeaderReachesNav;
    
    if (shouldStick !== lastStickyState) {
      setIsSticky(shouldStick);
      lastStickyState = shouldStick;
    }
  };
  
  // Throttled scroll handler
  let rafId: number | null = null;
  const throttledScroll = () => {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      handleScroll();
      rafId = null;
    });
  };
  
  window.addEventListener('scroll', throttledScroll, { passive: true });
}, [headerHeight, isSticky]);
```

**What this does:**
- Calculates when nav should stick
- Compares scroll position with nav position
- Uses `requestAnimationFrame` for smooth updates
- Skips updates when modal is open
- Passive scroll listener for performance

### Category Click Handler

```typescript
const handleCategoryClick = (category: string) => {
  if (location.pathname !== '/') {
    navigate('/');
  }
  
  // Dispatch event to save images before category change
  window.dispatchEvent(new CustomEvent('beforeCategoryChange', {
    detail: { category: category !== 'Tất cả' ? category : undefined }
  }));
  
  // Small delay to ensure event is processed
  setTimeout(() => {
    fetchImages({
      category: category !== 'Tất cả' ? category : undefined,
    });
  }, 10);
};
```

**What this does:**
- Navigates to home if not already there
- Dispatches event before category change
- Allows ImageGrid to save current images
- Fetches images for selected category
- Small delay ensures event processing

### Spacer Element

```typescript
{isSticky && navHeight > 0 && (
  <div 
    style={{ 
      height: `${navHeight}px`,
      flexShrink: 0,
      pointerEvents: 'none'
    }} 
    aria-hidden="true"
  />
)}
```

**What this does:**
- Prevents layout shift when nav becomes sticky
- Maintains space where nav was
- Same height as nav
- Invisible to screen readers

## Summary

**CategoryNavigation** is the category filter navigation that:
1. ✅ Sticks to header when scrolling
2. ✅ Fetches categories dynamically
3. ✅ Filters images by category
4. ✅ Preserves layout (spacer)
5. ✅ Handles modal state
6. ✅ Responsive design

It's the "category filter" - making it easy to browse images by category!


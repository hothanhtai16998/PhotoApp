# useVirtualScroll Hook Explanation

## What is useVirtualScroll?

`useVirtualScroll` is a **custom React hook** that implements virtual scrolling. It calculates which items should be visible based on scroll position, rendering only visible items for better performance.

## Key Features

### 1. **Performance Optimization**
- Renders only visible items
- Reduces DOM nodes
- Better for large lists

### 2. **Overscan Support**
- Renders items outside viewport
- Prevents blank space
- Smooth scrolling

### 3. **Dynamic Calculation**
- Updates on scroll
- Updates on resize
- Responsive to container size

## Step-by-Step Breakdown

### Hook Structure

```typescript
export const useVirtualScroll = <T>(
  items: T[],
  options: UseVirtualScrollOptions = {}
) => {
  const { itemHeight = 300, overscan = 3 } = options;
  const [visibleRange, setVisibleRange] = useState({ 
    start: 0, 
    end: Math.min(items.length, 20) 
  });
  // ...
};
```

**What this does:**
- Accepts array of items
- Configurable item height
- Overscan for smooth scrolling
- Initial visible range

### Update Visible Range

```typescript
const updateVisibleRange = useCallback(() => {
  if (!options.containerRef?.current) return;

  const container = options.containerRef.current;
  const scrollTop = container.scrollTop;
  const containerHeight = container.clientHeight;

  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const end = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  setVisibleRange({ start, end });
}, [itemHeight, overscan, items.length, options.containerRef]);
```

**What this does:**
- Calculates visible range from scroll position
- Accounts for overscan
- Updates state
- Memoized for performance

### Scroll Listener

```typescript
useEffect(() => {
  const container = options.containerRef?.current;
  if (!container) return;

  updateVisibleRange();

  container.addEventListener('scroll', updateVisibleRange, { passive: true });
  window.addEventListener('resize', updateVisibleRange);

  return () => {
    container.removeEventListener('scroll', updateVisibleRange);
    window.removeEventListener('resize', updateVisibleRange);
  };
}, [updateVisibleRange, options.containerRef]);
```

**What this does:**
- Sets up scroll listener
- Updates on resize
- Passive listener for performance
- Cleans up on unmount

### Visible Items

```typescript
const visibleItems = items.slice(visibleRange.start, visibleRange.end);

return {
  visibleItems,
  startIndex: visibleRange.start,
  endIndex: visibleRange.end,
  totalItems: items.length,
};
```

**What this does:**
- Slices items to visible range
- Returns visible items
- Returns indices for positioning
- Returns total count

## Usage Example

```typescript
const containerRef = useRef<HTMLDivElement>(null);
const { visibleItems, startIndex, endIndex } = useVirtualScroll(images, {
  itemHeight: 300,
  overscan: 3,
  containerRef,
});

return (
  <div ref={containerRef} style={{ height: '600px', overflow: 'auto' }}>
    <div style={{ height: `${images.length * 300}px`, position: 'relative' }}>
      {visibleItems.map((image, index) => (
        <div
          key={image.id}
          style={{
            position: 'absolute',
            top: `${(startIndex + index) * 300}px`,
            height: '300px',
          }}
        >
          {/* Render image */}
        </div>
      ))}
    </div>
  </div>
);
```

## Summary

**useVirtualScroll** is the virtual scrolling hook that:
1. ✅ Renders only visible items
2. ✅ Improves performance
3. ✅ Supports overscan
4. ✅ Updates on scroll/resize
5. ✅ Easy to use

It's the "performance booster" - making large lists fast!


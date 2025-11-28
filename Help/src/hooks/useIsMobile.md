# useIsMobile Hook Explanation

## What is useIsMobile?

`useIsMobile` is a **custom React hook** that detects if the current viewport is mobile-sized. It returns `true` if the window width is less than or equal to the mobile breakpoint.

## Hook Structure

```typescript
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= appConfig.mobileBreakpoint;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= appConfig.mobileBreakpoint);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
}
```

## Step-by-Step Breakdown

### Initial State

```typescript
const [isMobile, setIsMobile] = useState(() => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= appConfig.mobileBreakpoint;
});
```

**What this does:**
- Uses lazy initialization (function in `useState`)
- Checks if `window` exists (SSR safety)
- Returns `false` if `window` is undefined (server-side)
- Returns `true` if window width <= breakpoint (default: 768px)
- Only runs once on mount

**Why lazy initialization?**
- Prevents checking `window.innerWidth` on every render
- Only checks once when hook is first used
- Better performance

### Resize Listener

```typescript
useEffect(() => {
  const handleResize = () => {
    setIsMobile(window.innerWidth <= appConfig.mobileBreakpoint);
  };

  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

**What this does:**
- Adds resize event listener on mount
- Updates `isMobile` state when window is resized
- Removes listener on unmount (cleanup)
- Empty dependency array (runs once)

**Why resize listener?**
- Window can be resized (desktop browser, tablet rotation)
- Need to update state when size changes
- Provides responsive behavior

## Usage Examples

### Basic Usage

```typescript
function MyComponent() {
  const isMobile = useIsMobile();
  
  return (
    <div>
      {isMobile ? (
        <MobileLayout />
      ) : (
        <DesktopLayout />
      )}
    </div>
  );
}
```

### Conditional Rendering

```typescript
function Header() {
  const isMobile = useIsMobile();
  
  return (
    <header>
      {isMobile ? (
        <HamburgerMenu />
      ) : (
        <FullNavigation />
      )}
    </header>
  );
}
```

### Conditional Styles

```typescript
function ImageGrid() {
  const isMobile = useIsMobile();
  
  return (
    <div className={isMobile ? 'grid-mobile' : 'grid-desktop'}>
      {/* Images */}
    </div>
  );
}
```

## Configuration

The mobile breakpoint is defined in `appConfig.mobileBreakpoint`:

```typescript
export const appConfig = {
  mobileBreakpoint: 768, // pixels
  // ...
} as const;
```

**Default:** 768px (standard tablet/phone breakpoint)

**To change:** Update `appConfig.mobileBreakpoint` in `frontend/src/config/appConfig.ts`

## SSR Safety

The hook is SSR-safe:

```typescript
if (typeof window === 'undefined') return false;
```

**What this does:**
- Returns `false` during server-side rendering
- Prevents errors when `window` doesn't exist
- Assumes desktop by default (safe assumption)

## Performance Considerations

### 1. **Lazy Initialization**
- Only checks window size once on mount
- Doesn't check on every render
- Better performance

### 2. **Event Listener Cleanup**
- Removes listener on unmount
- Prevents memory leaks
- Follows React best practices

### 3. **Debouncing**
- No debouncing (updates immediately)
- If needed, can add debouncing for performance
- Usually fine for resize events

## Common Questions

### Q: Why not use CSS media queries?
**A:** Sometimes you need JavaScript logic based on screen size. This hook provides that.

### Q: Can I change the breakpoint?
**A:** Yes, update `appConfig.mobileBreakpoint` in the config file.

### Q: Does it work with SSR?
**A:** Yes, returns `false` during SSR (assumes desktop).

### Q: Is it debounced?
**A:** No, updates immediately on resize. Add debouncing if needed.

### Q: Can I use it multiple times?
**A:** Yes, but each call creates its own state and listener. Consider using a context if needed frequently.

## Summary

**useIsMobile** is a simple but useful hook that:
1. ✅ Detects mobile viewport size
2. ✅ Updates on window resize
3. ✅ SSR-safe
4. ✅ Configurable breakpoint
5. ✅ Clean event listener management

It's the "screen size detector" - helping you build responsive UIs!


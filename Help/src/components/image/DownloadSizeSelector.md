# DownloadSizeSelector Component Explanation

## What is DownloadSizeSelector?

`DownloadSizeSelector` is a **memoized component** that provides a dropdown menu for selecting download sizes. It allows users to choose between small, medium, large, and original sizes.

## Key Features

### 1. **Size Options**
- Small (640px)
- Medium (1920px)
- Large (2400px)
- Original (full size)

### 2. **Dropdown Menu**
- Button with chevron
- Dropdown menu
- Dynamic positioning
- Click outside to close

### 3. **Size Selection**
- Click to select
- Calls onDownload callback
- Closes menu
- Visual feedback

## Step-by-Step Breakdown

### Component Props

```typescript
interface DownloadSizeSelectorProps {
  image: Image;
  onDownload: (size: DownloadSize) => void;
}

export type DownloadSize = 'small' | 'medium' | 'large' | 'original';
```

**What this does:**
- Receives image and callback
- DownloadSize type
- Simple interface

### Size Options

```typescript
const SIZE_OPTIONS: SizeOption[] = [
  { value: 'small', label: 'Small', dimension: '640px' },
  { value: 'medium', label: 'Medium', dimension: '1920px' },
  { value: 'large', label: 'Large', dimension: '2400px' },
  { value: 'original', label: 'Original', dimension: 'Full size' },
];
```

**What this does:**
- Defines size options
- Labels and dimensions
- Used for menu display

### Position Detection

```typescript
useEffect(() => {
  if (!showMenu || !buttonRef.current) return;

  const checkPosition = () => {
    const buttonRect = buttonRef.current?.getBoundingClientRect();
    if (buttonRect) {
      const spaceAbove = buttonRect.top;
      const spaceBelow = window.innerHeight - buttonRect.bottom;
      const estimatedMenuHeight = 200;
      const requiredSpace = estimatedMenuHeight + 20;

      if (spaceAbove < requiredSpace && spaceBelow >= requiredSpace) {
        setPositionBelow(true);
      } else {
        setPositionBelow(false);
      }
    }
  };

  checkPosition();
  window.addEventListener('scroll', checkPosition, true);
  window.addEventListener('resize', checkPosition);
  
  // ResizeObserver for accuracy
  if (menuRef.current) {
    const resizeObserver = new ResizeObserver(checkPosition);
    resizeObserver.observe(menuRef.current);
  }
}, [showMenu]);
```

**What this does:**
- Detects available space
- Positions menu above or below
- Updates on scroll/resize

### Size Selection Handler

```typescript
const handleSizeSelect = useCallback((size: DownloadSize, e: React.MouseEvent) => {
  e.stopPropagation();
  setShowMenu(false);
  onDownload(size);
}, [onDownload]);
```

**What this does:**
- Stops event propagation
- Closes menu
- Calls download callback

### Menu Display

```typescript
{showMenu && (
  <div
    ref={menuRef}
    className={`download-size-menu ${positionBelow ? 'below' : 'above'}`}
  >
    {SIZE_OPTIONS.map((option) => (
      <button
        key={option.value}
        onClick={(e) => handleSizeSelect(option.value, e)}
        className="download-size-option"
      >
        <div className="size-label">{option.label}</div>
        <div className="size-dimension">{option.dimension}</div>
      </button>
    ))}
  </div>
)}
```

**What this does:**
- Shows menu with options
- Maps size options
- Click handlers
- Positioned dynamically

## Usage Examples

### In ImageModalHeader

```typescript
<DownloadSizeSelector
  image={image}
  onDownload={(size) => {
    handleDownloadWithSize(size);
  }}
/>
```

## Summary

**DownloadSizeSelector** is the download size selector component that:
1. ✅ Size options dropdown
2. ✅ Dynamic positioning
3. ✅ Size selection
4. ✅ Memoized for performance
5. ✅ Click outside to close

It's the "size selector" - choosing download sizes!


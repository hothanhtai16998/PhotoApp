# ImageModalInfo Component Explanation

## What is ImageModalInfo?

`ImageModalInfo` is a **memoized component** that displays image information and analytics charts in a modal. It shows image details and view/download statistics.

## Key Features

### 1. **Info Button**
- Info icon button
- Opens info modal
- Positioned dynamically

### 2. **Info Modal**
- Image details
- Analytics charts
- Tabs for views/downloads
- Positioned above or below

### 3. **Analytics Charts**
- Views over time
- Downloads over time
- 14-day chart
- Interactive tooltips

### 4. **Image Details**
- Upload date
- Days ago calculation
- Image metadata

## Step-by-Step Breakdown

### Component Props

```typescript
interface ImageModalInfoProps {
  image: Image;
}
```

**What this does:**
- Receives image
- Simple interface

### Position Detection

```typescript
useEffect(() => {
  if (!showInfoModal || !infoButtonRef.current) return;

  const checkPosition = () => {
    const buttonRect = infoButtonRef.current?.getBoundingClientRect();
    if (buttonRect) {
      const spaceAbove = buttonRect.top;
      const spaceBelow = window.innerHeight - buttonRect.bottom;
      const estimatedModalHeight = Math.min(500, window.innerHeight * 0.6);
      const requiredSpace = estimatedModalHeight + 20;

      if (spaceAbove < requiredSpace && spaceBelow >= requiredSpace) {
        setPositionBelow(true);
      } else {
        setPositionBelow(false);
      }
    }
  };

  checkPosition();
  // Check on scroll/resize
  window.addEventListener('scroll', checkPosition, true);
  window.addEventListener('resize', checkPosition);
  
  // ResizeObserver for accuracy
  if (infoModalRef.current) {
    const resizeObserver = new ResizeObserver(checkPosition);
    resizeObserver.observe(infoModalRef.current);
  }
}, [showInfoModal]);
```

**What this does:**
- Detects available space
- Positions modal above or below
- Updates on scroll/resize
- Uses ResizeObserver

### Days Ago Calculation

```typescript
const daysAgoText = useMemo(() => {
  const now = new Date().getTime();
  const daysAgo = Math.floor((now - new Date(image.createdAt).getTime()) / (1000 * 60 * 60 * 24));
  if (daysAgo === 0) return 'hôm nay';
  if (daysAgo === 1) return '1 ngày trước';
  return `${daysAgo} ngày trước`;
}, [image.createdAt]);
```

**What this does:**
- Calculates days since upload
- Vietnamese text
- Memoized for performance

### Click Outside Handler

```typescript
useEffect(() => {
  if (!showInfoModal) return;

  const handleClickOutside = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      infoButtonRef.current &&
      !infoButtonRef.current.contains(target) &&
      !target.closest('.info-modal')
    ) {
      setShowInfoModal(false);
    }
  };

  document.addEventListener('mousedown', handleClickOutside);
  return () => {
    document.removeEventListener('mousedown', handleClickOutside);
  };
}, [showInfoModal]);
```

**What this does:**
- Closes modal on outside click
- Excludes button and modal
- Cleanup on unmount

### Info Modal Content

```typescript
{showInfoModal && (
  <div
    ref={infoModalRef}
    className={`info-modal ${positionBelow ? 'below' : 'above'}`}
  >
    <div className="info-modal-header">
      <button onClick={() => setActiveTab('views')}>
        Lượt xem
      </button>
      <button onClick={() => setActiveTab('downloads')}>
        Lượt tải
      </button>
    </div>
    <div className="info-modal-content">
      <ImageModalChart image={image} activeTab={activeTab} />
      <div className="info-modal-details">
        <div>Đã tải lên {daysAgoText}</div>
        {/* More details */}
      </div>
    </div>
  </div>
)}
```

**What this does:**
- Shows modal with tabs
- Chart component
- Image details
- Positioned dynamically

## Usage Examples

### In ImageModalSidebar

```typescript
<ImageModalInfo image={image} />
```

## Summary

**ImageModalInfo** is the image info component that:
1. ✅ Info button and modal
2. ✅ Analytics charts
3. ✅ Image details
4. ✅ Dynamic positioning
5. ✅ Memoized for performance

It's the "info modal" - showing image analytics and details!


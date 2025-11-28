# CollectionShare Component Explanation

## What is CollectionShare?

`CollectionShare` is a **memoized component** that provides sharing functionality for collections. It includes share menu, copy link, and social media sharing.

## Key Features

### 1. **Share Menu**
- Share button
- Dropdown menu
- Dynamic positioning
- Click outside to close

### 2. **Sharing Options**
- Copy link
- Share to social media
- Email share
- Collection URL

### 3. **Position Detection**
- Above or below button
- ResizeObserver for accuracy
- Scroll/resize updates

## Step-by-Step Breakdown

### Component Props

```typescript
interface CollectionShareProps {
  collection: Collection;
}
```

**What this does:**
- Receives collection
- Simple interface

### Share Data Generation

```typescript
const getShareData = useCallback(() => {
  const shareUrl = `${window.location.origin}/collections/${collection._id}`;
  const shareText = `Check out this collection: ${collection.name}`;
  return { shareUrl, shareText };
}, [collection._id, collection.name]);
```

**What this does:**
- Generates collection URL
- Share text with name
- Memoized callback

### Position Detection

```typescript
useEffect(() => {
  if (!showShareMenu || !shareButtonRef.current) return;

  const checkPosition = () => {
    const buttonRect = shareButtonRef.current?.getBoundingClientRect();
    if (buttonRect) {
      const spaceAbove = buttonRect.top;
      const spaceBelow = window.innerHeight - buttonRect.bottom;
      const estimatedMenuHeight = 350;
      const requiredSpace = estimatedMenuHeight + 20;

      // Calculate menu position
      const menuWidth = 200;
      const left = buttonRect.right - menuWidth;
      const top = buttonRect.bottom + 12;

      setMenuPosition({
        top: top,
        left: Math.max(12, left) // Ensure menu doesn't go off-screen
      });

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
  if (shareMenuRef.current) {
    const resizeObserver = new ResizeObserver(checkPosition);
    resizeObserver.observe(shareMenuRef.current);
  }
}, [showShareMenu]);
```

**What this does:**
- Detects available space
- Calculates menu position
- Updates on scroll/resize
- Uses ResizeObserver

### Copy Link

```typescript
const handleCopyLink = useCallback(async () => {
  const { shareUrl } = getShareData();
  try {
    await navigator.clipboard.writeText(shareUrl);
    toast.success('Đã sao chép liên kết');
    setShowShareMenu(false);
  } catch (error) {
    toast.error('Không thể sao chép liên kết');
  }
}, [getShareData]);
```

**What this does:**
- Copies URL to clipboard
- Shows success/error message
- Closes menu

### Social Media Share

```typescript
const handleShareToSocial = useCallback((platform: string) => {
  const { shareUrl, shareText } = getShareData();
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(shareText);
  
  let shareUrl_platform = '';
  switch (platform) {
    case 'facebook':
      shareUrl_platform = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
      break;
    case 'twitter':
      shareUrl_platform = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`;
      break;
    // ... more platforms
  }
  
  window.open(shareUrl_platform, '_blank', 'width=600,height=400');
  setShowShareMenu(false);
}, [getShareData]);
```

**What this does:**
- Opens social media share dialog
- Encodes URL and text
- New window
- Closes menu

## Usage Examples

### In CollectionHeader

```typescript
<CollectionShare collection={collection} />
```

## Summary

**CollectionShare** is the collection share component that:
1. ✅ Share menu with options
2. ✅ Copy link
3. ✅ Social media sharing
4. ✅ Dynamic positioning
5. ✅ Memoized for performance

It's the "collection share" - enabling collection sharing!


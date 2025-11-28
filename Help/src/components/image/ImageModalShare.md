# ImageModalShare Component Explanation

## What is ImageModalShare?

`ImageModalShare` is a **memoized component** that provides sharing functionality for images. It includes share menu, embed code, and various sharing options.

## Key Features

### 1. **Share Menu**
- Share button
- Dropdown menu
- Dynamic positioning
- Multiple share options

### 2. **Sharing Options**
- Copy link
- Share to social media
- Email share
- Embed code

### 3. **Embed Code**
- Customizable dimensions
- Responsive embed
- Copy to clipboard
- Preview

### 4. **Share URL Generation**
- SEO-friendly slugs
- Full URL
- Share text

## Step-by-Step Breakdown

### Component Props

```typescript
interface ImageModalShareProps {
  image: Image;
}
```

**What this does:**
- Receives image
- Simple interface

### Share Data Generation

```typescript
const getShareData = useCallback(() => {
  const slug = generateImageSlug(image.imageTitle, image._id);
  // Use /photos/:slug for better SEO and sharing
  const shareUrl = `${window.location.origin}/photos/${slug}`;
  const shareText = `Check out this photo: ${image.imageTitle || 'Untitled'}`;
  return { shareUrl, shareText };
}, [image._id, image.imageTitle]);
```

**What this does:**
- Generates SEO-friendly slug
- Creates full URL
- Share text with title

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

### Embed Code

```typescript
const embedCode = useMemo(() => {
  const { shareUrl } = getShareData();
  const height = embedHeight === 'auto' ? 'auto' : `${embedHeight}px`;
  return `<iframe src="${shareUrl}" width="${embedWidth}" height="${height}" frameborder="0"></iframe>`;
}, [getShareData, embedWidth, embedHeight]);

const handleCopyEmbed = useCallback(async () => {
  try {
    await navigator.clipboard.writeText(embedCode);
    toast.success('Đã sao chép mã nhúng');
    setShowEmbedModal(false);
  } catch (error) {
    toast.error('Không thể sao chép mã nhúng');
  }
}, [embedCode]);
```

**What this does:**
- Generates embed code
- Customizable dimensions
- Copies to clipboard
- Shows success message

## Usage Examples

### In ImageModalSidebar

```typescript
<ImageModalShare image={image} />
```

## Summary

**ImageModalShare** is the share component that:
1. ✅ Share menu with options
2. ✅ Copy link
3. ✅ Social media sharing
4. ✅ Embed code
5. ✅ Dynamic positioning

It's the "share component" - enabling image sharing!


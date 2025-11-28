# shareService Explanation

## What is shareService?

`shareService` is a **utility module** that provides sharing functionality for images. It generates share URLs for different platforms and embed codes.

## Key Features

### 1. **Social Sharing**
- Facebook share
- Twitter share
- Pinterest share
- Email share

### 2. **Embed Code**
- Generates HTML embed code
- Optional link wrapper
- Configurable dimensions

### 3. **Clipboard**
- Copy to clipboard
- Fallback for older browsers
- Promise-based

## Step-by-Step Breakdown

### Share Data Interface

```typescript
export interface ShareData {
  url: string;
  title: string;
  imageUrl: string;
}
```

**What this does:**
- Defines share data structure
- URL, title, and image URL
- Used for all share functions

### Facebook Share

```typescript
generateFacebookShareUrl: (shareData: ShareData): string => {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareData.url)}`;
},
```

**What this does:**
- Generates Facebook share URL
- URL-encodes the share URL
- Opens Facebook share dialog

### Twitter Share

```typescript
generateTwitterShareUrl: (shareData: ShareData): string => {
  const text = shareData.title || 'Check out this photo';
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareData.url)}`;
},
```

**What this does:**
- Generates Twitter share URL
- Includes text and URL
- Opens Twitter share dialog

### Pinterest Share

```typescript
generatePinterestShareUrl: (shareData: ShareData): string => {
  return `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(shareData.url)}&media=${encodeURIComponent(shareData.imageUrl)}&description=${encodeURIComponent(shareData.title || 'Photo')}`;
},
```

**What this does:**
- Generates Pinterest share URL
- Includes image URL
- Includes description
- Opens Pinterest pin dialog

### Email Share

```typescript
generateEmailShareUrl: (shareData: ShareData): string => {
  const subject = shareData.title || 'Photo';
  const body = `${shareData.title || 'Check out this photo'}\n\n${shareData.url}`;
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
},
```

**What this does:**
- Generates email share URL
- Includes subject and body
- Opens email client

### Generate Embed Code

```typescript
generateEmbedCode: (
  imageUrl: string,
  options?: {
    width?: number;
    height?: number;
    alt?: string;
    linkUrl?: string;
  }
): string => {
  const width = options?.width || 800;
  const height = options?.height || 'auto';
  const alt = options?.alt || 'Photo';
  const linkUrl = options?.linkUrl;

  if (linkUrl) {
    // Embed with link
    return `<a href="${linkUrl}" target="_blank" rel="noopener noreferrer">
  <img src="${imageUrl}" alt="${alt}" width="${width}" ${height !== 'auto' ? `height="${height}"` : ''} />
</a>`;
  } else {
    // Simple image embed
    return `<img src="${imageUrl}" alt="${alt}" width="${width}" ${height !== 'auto' ? `height="${height}"` : ''} />`;
  }
},
```

**What this does:**
- Generates HTML embed code
- Optional link wrapper
- Configurable dimensions
- Includes alt text

### Copy to Clipboard

```typescript
copyToClipboard: async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        return successful;
      } catch (_err) {
        document.body.removeChild(textArea);
        return false;
      }
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
},
```

**What this does:**
- Uses modern Clipboard API
- Fallback for older browsers
- Returns success status
- Error handling

## Usage Examples

### Facebook Share

```typescript
const url = shareService.generateFacebookShareUrl({
  url: 'https://photoapp.com/image/123',
  title: 'Beautiful Photo',
  imageUrl: 'https://photoapp.com/image/123.jpg',
});
window.open(url, '_blank');
```

### Twitter Share

```typescript
const url = shareService.generateTwitterShareUrl({
  url: 'https://photoapp.com/image/123',
  title: 'Check out this photo!',
  imageUrl: 'https://photoapp.com/image/123.jpg',
});
window.open(url, '_blank');
```

### Generate Embed Code

```typescript
const embedCode = shareService.generateEmbedCode(imageUrl, {
  width: 800,
  height: 600,
  alt: 'Beautiful landscape',
  linkUrl: 'https://photoapp.com/image/123',
});
```

### Copy to Clipboard

```typescript
const success = await shareService.copyToClipboard(embedCode);
if (success) {
  toast.success('Copied to clipboard!');
}
```

## Summary

**shareService** is the sharing utility that:
1. ✅ Generates share URLs
2. ✅ Creates embed codes
3. ✅ Copies to clipboard
4. ✅ Supports multiple platforms
5. ✅ Fallback support

It's the "share helper" - making content shareable!


# lib/utils Explanation

## What is lib/utils?

`lib/utils` is a **utility library** that provides common utility functions used across the application. It includes class name merging, Vietnamese text processing, slug generation, and error message extraction.

## Key Features

### 1. **Class Name Utilities**
- Merges Tailwind classes
- Handles conflicts
- Uses `clsx` and `tailwind-merge`

### 2. **Text Processing**
- Vietnamese to ASCII conversion
- Slug generation
- Image slug utilities

### 3. **Error Handling**
- Extracts error messages
- Handles multiple error types
- Fallback messages

## Step-by-Step Breakdown

### Class Name Merger

```typescript
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
```

**What this does:**
- Merges class names
- Resolves Tailwind conflicts
- Handles conditional classes
- Used throughout the app

### Vietnamese to ASCII

```typescript
function vietnameseToASCII(str: string): string {
  const vietnameseMap: { [key: string]: string } = {
    'à': 'a', 'á': 'a', 'ạ': 'a', 'ả': 'a', 'ã': 'a',
    'â': 'a', 'ầ': 'a', 'ấ': 'a', 'ậ': 'a', 'ẩ': 'a', 'ẫ': 'a',
    'ă': 'a', 'ằ': 'a', 'ắ': 'a', 'ặ': 'a', 'ẳ': 'a', 'ẵ': 'a',
    // ... more mappings
    'đ': 'd',
  };

  return str.replace(/[àáạảã...]/g, (char) => vietnameseMap[char] ?? char);
}
```

**What this does:**
- Converts Vietnamese characters to ASCII
- Handles all Vietnamese diacritics
- Used for slug generation
- Preserves non-Vietnamese characters

### Slugify

```typescript
export function slugify(text: string): string {
  return vietnameseToASCII(text)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
}
```

**What this does:**
- Converts text to URL-friendly slug
- Handles Vietnamese characters
- Removes special characters
- Limits to 100 characters
- Similar to Unsplash format

### Generate Image Slug

```typescript
export function generateImageSlug(imageTitle: string, imageId: string): string {
  const slug = slugify(imageTitle);
  // Use last 12 characters of ID as short identifier
  const shortId = imageId.slice(-12);
  return `${slug}-${shortId}`;
}
```

**What this does:**
- Generates image slug with ID
- Format: "title-slug-{shortId}"
- Uses last 12 characters of MongoDB ObjectId
- Similar to Unsplash format

### Extract ID from Slug

```typescript
export function extractIdFromSlug(slug: string): string {
  const parts = slug.split('-');
  return parts[parts.length - 1] ?? '';
}
```

**What this does:**
- Extracts ID from slug
- Gets last part after hyphens
- Used for routing

### Get Error Message

```typescript
export function getErrorMessage(error: unknown, defaultMessage: string = 'An error occurred'): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null) {
    const axiosError = error as { response?: { data?: { message?: string } }; message?: string };
    return axiosError.response?.data?.message ?? axiosError.message ?? defaultMessage;
  }
  return defaultMessage;
}
```

**What this does:**
- Extracts error message from unknown error
- Handles Error objects
- Handles Axios errors
- Provides fallback message

## Usage Examples

### Class Names

```typescript
import { cn } from '@/lib/utils';

<div className={cn('base-class', isActive && 'active-class', className)} />
```

### Slugify

```typescript
import { slugify } from '@/lib/utils';

const slug = slugify('Beautiful Sunset Photo');
// "beautiful-sunset-photo"
```

### Generate Image Slug

```typescript
import { generateImageSlug } from '@/lib/utils';

const slug = generateImageSlug('Sunset at Beach', '507f1f77bcf86cd799439011');
// "sunset-at-beach-799439011"
```

### Get Error Message

```typescript
import { getErrorMessage } from '@/lib/utils';

try {
  // Some code
} catch (error) {
  const message = getErrorMessage(error, 'Default error message');
  toast.error(message);
}
```

## Summary

**lib/utils** is the utility library that:
1. ✅ Merges class names
2. ✅ Converts Vietnamese to ASCII
3. ✅ Generates slugs
4. ✅ Extracts error messages
5. ✅ Common utilities

It's the "utility toolbox" - providing common functions!


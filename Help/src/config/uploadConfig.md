# uploadConfig Explanation

## What is uploadConfig?

`uploadConfig` is a **configuration file** that contains upload page settings. It defines image categories, category display limits, and upload page behavior.

## Key Features

### 1. **Category Settings**
- Default categories
- Images per category
- Maximum categories
- Minimum images per category

### 2. **Display Settings**
- Category display limits
- Image counts
- Filtering thresholds

### 3. **Centralized Configuration**
- Easy to edit
- Single source of truth
- Type-safe

## Step-by-Step Breakdown

### Upload Configuration

```typescript
export const uploadConfig = {
    // Categories to display on upload page
    categories: ['Nature', 'Portrait', 'Architecture', 'Travel', 'Street', 'Abstract'] as const,
    
    // Number of images to show per category
    imagesPerCategory: 4,
    
    // Number of categories to display
    maxCategories: 3,
    
    // Minimum images required to show a category
    minImagesPerCategory: 2,
} as const;
```

**What this does:**
- Defines default categories
- 4 images per category
- Max 3 categories displayed
- Min 2 images to show category

**Why these values?**
- 6 categories: Good variety
- 4 images: Enough to show category style
- Max 3: Not overwhelming
- Min 2: Ensures quality

## Usage Examples

### Categories

```typescript
import { uploadConfig } from '@/config/uploadConfig';

uploadConfig.categories.forEach(category => {
  // Display category
});
```

### Category Display

```typescript
const categoriesToShow = uploadConfig.categories
  .filter(category => {
    const imageCount = getCategoryImageCount(category);
    return imageCount >= uploadConfig.minImagesPerCategory;
  })
  .slice(0, uploadConfig.maxCategories);
```

## Summary

**uploadConfig** is the upload configuration that:
1. ✅ Defines categories
2. ✅ Display limits
3. ✅ Filtering thresholds
4. ✅ Centralized settings
5. ✅ Easy to edit

It's the "upload settings" - centralizing upload configuration!


# slide Types Explanation

## What is slide Types?

`slide` types is a **TypeScript type definitions file** that defines the Slide interface. It provides type safety for slider/carousel images.

## Key Features

### 1. **Slide Interface**
- Complete slide structure
- User information
- Image data
- Metadata

### 2. **Simple Structure**
- ID, title, background image
- Uploader info
- Optional metadata

## Step-by-Step Breakdown

### Slide Interface

```typescript
export interface Slide {
  id: string;
  title: string;
  uploadedBy: User;
  backgroundImage: string;
  location?: string;
  cameraModel?: string;
  category?: string | { name: string };
  createdAt?: string;
  isPortrait?: boolean;
  isFirstSlide?: boolean;
}
```

**What this does:**
- Defines slide structure
- Required: id, title, uploadedBy, backgroundImage
- Optional: location, cameraModel, category
- Flags: isPortrait, isFirstSlide

**Fields:**
- `id`: Slide/image ID
- `title`: Image title
- `uploadedBy`: User who uploaded
- `backgroundImage`: Image URL for slide
- `location`: Optional location
- `cameraModel`: Optional camera info
- `category`: Optional category
- `isPortrait`: Orientation flag
- `isFirstSlide`: First slide flag

## Usage Examples

### Slide Type

```typescript
import type { Slide } from '@/types/slide';

const slide: Slide = {
  id: '123',
  title: 'Beautiful Sunset',
  uploadedBy: user,
  backgroundImage: 'https://...',
  location: 'Ho Chi Minh City',
  isPortrait: false,
};
```

### Slide Array

```typescript
const slides: Slide[] = await fetchSlides();
slides.forEach(slide => {
  console.log(slide.title, slide.uploadedBy.username);
});
```

## Summary

**slide types** is the slide type definitions file that:
1. ✅ Defines Slide interface
2. ✅ Type safety
3. ✅ Simple structure
4. ✅ Easy to use

It's the "slide types" - ensuring type safety for slides!


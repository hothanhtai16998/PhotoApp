# image Types Explanation

## What is image Types?

`image` types is a **TypeScript type definitions file** that defines all image-related types and interfaces. It provides type safety for image data, API requests, and responses.

## Key Features

### 1. **Image Interface**
- Complete image structure
- Multiple image sizes
- AVIF support
- Metadata fields

### 2. **API Types**
- Request parameters
- Response types
- Upload types
- Stats types

### 3. **Type Safety**
- TypeScript interfaces
- Optional fields
- Union types

## Step-by-Step Breakdown

### Image Interface

```typescript
export interface Image {
  _id: string;
  publicId: string;
  imageTitle: string;
  imageUrl: string;
  // Multiple image sizes for progressive loading
  thumbnailUrl?: string; // Small thumbnail for blur-up effect - WebP
  smallUrl?: string; // Small size for grid view - WebP
  regularUrl?: string; // Regular size for detail view - WebP
  // AVIF versions for better compression
  thumbnailAvifUrl?: string; // Small thumbnail - AVIF
  smallAvifUrl?: string; // Small size - AVIF
  regularAvifUrl?: string; // Regular size - AVIF
  imageAvifUrl?: string; // Original - AVIF
  imageCategory: string | Category;
  uploadedBy: User;
  location?: string;
  coordinates?: Coordinates;
  cameraModel?: string;
  // EXIF metadata
  cameraMake?: string;
  focalLength?: number;
  aperture?: number;
  shutterSpeed?: string;
  iso?: number;
  dominantColors?: string[];
  tags?: string[];
  views?: number;
  downloads?: number;
  // Daily tracking
  dailyViews?: Record<string, number>;
  dailyDownloads?: Record<string, number>;
  // Moderation
  isModerated?: boolean;
  moderationStatus?: 'pending' | 'approved' | 'rejected' | 'flagged';
  moderatedAt?: string;
  moderationNotes?: string;
  createdAt: string;
  updatedAt: string;
}
```

**What this does:**
- Defines complete image structure
- Multiple image sizes (thumbnail, small, regular)
- AVIF versions for modern browsers
- EXIF metadata fields
- Moderation status
- Daily tracking

### Fetch Images Params

```typescript
export interface FetchImagesParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  location?: string;
  color?: string;
  tag?: string;
  _refresh?: boolean;
}
```

**What this does:**
- Defines fetch parameters
- Pagination support
- Filtering options
- Cache-busting flag

### Fetch Images Response

```typescript
export interface FetchImagesResponse {
  images: Image[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
```

**What this does:**
- Defines response structure
- Images array
- Optional pagination
- Type-safe

### Pre-Upload Response

```typescript
export interface PreUploadResponse {
  message: string;
  uploadId: string;
  publicId: string;
  imageUrl: string;
  thumbnailUrl: string;
  smallUrl: string;
  regularUrl: string;
  imageAvifUrl: string;
  thumbnailAvifUrl: string;
  smallAvifUrl: string;
  regularAvifUrl: string;
}
```

**What this does:**
- Defines pre-upload response
- All image URLs
- AVIF versions
- Upload ID

### Finalize Image Data

```typescript
export interface FinalizeImageData {
  uploadId: string;
  publicId: string;
  imageUrl: string;
  thumbnailUrl: string;
  smallUrl: string;
  regularUrl: string;
  imageAvifUrl: string;
  thumbnailAvifUrl: string;
  smallAvifUrl: string;
  regularAvifUrl: string;
  imageTitle: string;
  imageCategory: string;
  location?: string;
  coordinates?: Coordinates;
  cameraModel?: string;
  tags?: string[];
}
```

**What this does:**
- Defines finalize data
- All required fields
- Optional metadata
- Used for finalizing upload

### Stats Responses

```typescript
export interface IncrementViewResponse {
  views: number;
  dailyViews: Record<string, number>;
}

export interface IncrementDownloadResponse {
  downloads: number;
  dailyDownloads: Record<string, number>;
}
```

**What this does:**
- Defines stats responses
- Total counts
- Daily tracking
- Type-safe

## Usage Examples

### Image Type

```typescript
const image: Image = {
  _id: '123',
  publicId: 'abc',
  imageTitle: 'Sunset',
  imageUrl: 'https://...',
  // ... other fields
};
```

### Fetch Params

```typescript
const params: FetchImagesParams = {
  page: 1,
  limit: 20,
  category: 'Nature',
  search: 'sunset',
};
```

### Response Type

```typescript
const response: FetchImagesResponse = await fetchImages(params);
console.log(response.images);
console.log(response.pagination);
```

## Summary

**image types** is the type definitions file that:
1. ✅ Defines Image interface
2. ✅ API request/response types
3. ✅ Upload types
4. ✅ Stats types
5. ✅ Type safety

It's the "type definitions" - ensuring type safety for images!


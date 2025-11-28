# imageCompression Explanation

## What is imageCompression?

`imageCompression` is a **utility module** that compresses image files before upload. It uses the `browser-image-compression` library to reduce file size while maintaining quality.

## Key Features

### 1. **Image Compression**
- Compresses images before upload
- Reduces file size
- Maintains quality

### 2. **Smart Compression**
- Only compresses large files (>2MB)
- Preserves quality for small files
- Configurable options

### 3. **Performance**
- Uses web worker
- Non-blocking
- Fast processing

## Step-by-Step Breakdown

### Compression Options

```typescript
export interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
  fileType?: string;
}
```

**What this does:**
- Defines compression options
- Configurable parameters
- Type-safe interface

### Compress Image

```typescript
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const defaultOptions: CompressionOptions = {
    maxSizeMB: 4, // Maximum file size in MB (4MB for better quality in photo apps)
    maxWidthOrHeight: 2560, // Maximum width or height (2K resolution for high-DPI displays)
    useWebWorker: true, // Use web worker for better performance
    fileType: file.type, // Preserve original file type
  };

  const compressionOptions = { ...defaultOptions, ...options };

  try {
    // Only compress if file is larger than 2MB (preserve quality for smaller files)
    if (file.size > 2 * 1024 * 1024) {
      const compressedFile = await imageCompression(
        file,
        compressionOptions
      );
      console.warn(
        `Image compressed: ${(file.size / 1024 / 1024).toFixed(2)}MB -> ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`
      );
      return compressedFile;
    }
    return file;
  } catch (error) {
    console.error('Image compression failed:', error);
    // Return original file if compression fails
    return file;
  }
}
```

**What this does:**
- Sets default options
- Merges with custom options
- Only compresses files >2MB
- Uses web worker
- Logs compression results
- Returns original on error

**Default Options:**
- `maxSizeMB: 4` - Maximum 4MB file size
- `maxWidthOrHeight: 2560` - 2K resolution
- `useWebWorker: true` - Non-blocking
- `fileType: file.type` - Preserves format

## Usage Examples

### Basic Usage

```typescript
import { compressImage } from '@/utils/imageCompression';

const compressedFile = await compressImage(file);
```

### Custom Options

```typescript
const compressedFile = await compressImage(file, {
  maxSizeMB: 2,
  maxWidthOrHeight: 1920,
});
```

### In Upload Form

```typescript
const handleFileSelect = async (file: File) => {
  const compressed = await compressImage(file);
  // Upload compressed file
};
```

## Why Compress?

1. **Faster Uploads** - Smaller files upload faster
2. **Bandwidth Savings** - Reduces data usage
3. **Storage Savings** - Less server storage
4. **Better UX** - Faster page loads

## Summary

**imageCompression** is the image compression utility that:
1. ✅ Compresses images before upload
2. ✅ Only compresses large files
3. ✅ Maintains quality
4. ✅ Uses web worker
5. ✅ Error handling

It's the "size optimizer" - making uploads faster!


# Additional Import Optimizations

## 🔍 Found Optimization Opportunities

### 1. ✅ browser-image-compression - ~50-80KB
**Current**: Loaded on every page that imports UploadPage
**Optimization**: Lazy load only when user uploads

### 2. ✅ react-blurhash - ~10-15KB  
**Current**: Loaded for every image with blurhash
**Optimization**: Lazy load BlurhashPlaceholder component

### 3. ✅ react-hook-form - Already Optimized
**Status**: Tree-shakeable, only imports what's used

## 📊 Impact Analysis

| Library | Current | Optimized | Savings |
|---------|---------|-----------|---------|
| browser-image-compression | ~50-80KB | 0KB (until upload) | ~50-80KB |
| react-blurhash | ~10-15KB | 0KB (until image loads) | ~10-15KB |
| **Total Potential Savings** | **~60-95KB** | **0KB initial** | **~60-95KB** |


# UploadPreview Component Explanation

## What is UploadPreview?

`UploadPreview` is a **component** that displays a preview of an image being uploaded. It shows the image, upload progress overlay, success indicator, and error messages.

## Key Features

### 1. **Image Preview**
- Displays image from file
- Object URL for preview
- Responsive sizing
- Rounded corners

### 2. **Upload States**
- Uploading overlay
- Success indicator
- Error display
- Loading animation

### 3. **Visual Feedback**
- Dark overlay during upload
- Animated loader
- Success badge
- Error message

### 4. **Remove Button**
- X button to remove
- Only when not uploading
- Confirmation (optional)

## Step-by-Step Breakdown

### Component Props

```typescript
interface UploadPreviewProps {
  imageData: ImageData;
  index: number;
  totalImages: number;
  onRemove: () => void;
}
```

**What this does:**
- Receives image data
- Index and total count
- Remove handler

### Upload State Detection

```typescript
const isUploading = imageData.isUploading === true;
const uploadError = imageData.uploadError;
const hasPreUploadData = !!imageData.preUploadData;
const isUploaded = hasPreUploadData && !uploadError && !isUploading;

const showOverlay = isUploading || (!hasPreUploadData && !uploadError);
```

**What this does:**
- Determines upload state
- Checks for errors
- Shows overlay when needed

### Image Preview

```typescript
<img
  src={URL.createObjectURL(imageData.file)}
  alt={`Preview ${index + 1}`}
  style={{
    width: '100%',
    height: 'auto',
    maxHeight: '500px',
    objectFit: 'contain',
    borderRadius: '8px',
    border: '1px solid #e5e5e5',
  }}
/>
```

**What this does:**
- Creates object URL from file
- Responsive image
- Contained fit
- Styled border

### Upload Overlay

```typescript
{showOverlay && (
  <>
    <div 
      className="image-upload-overlay"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
        borderRadius: '8px',
        zIndex: 10,
      }}
    />
    <div className="upload-loader-container">
      <div className="loader">
        {/* Animated loading text */}
      </div>
    </div>
  </>
)}
```

**What this does:**
- Dark overlay during upload
- Blur effect
- Animated loader
- Centered position

### Success Indicator

```typescript
{isUploaded && !isUploading && (
  <div style={{
    position: 'absolute',
    top: '8px',
    left: '8px',
    background: '#10b981',
    color: 'white',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '600',
    zIndex: 100,
  }}>
    ✓ Đã tải lên
  </div>
)}
```

**What this does:**
- Shows success badge
- Green background
- Checkmark icon
- Top-left position

### Error Display

```typescript
{uploadError && (
  <div className="upload-error-message">
    <span>Lỗi: {uploadError}</span>
    <button onClick={onRemove}>Xóa</button>
  </div>
)}
```

**What this does:**
- Displays error message
- Remove button
- Red styling

## Usage Examples

### In UploadModal

```typescript
{imageDataList.map((imageData, index) => (
  <UploadPreview
    key={imageData.id}
    imageData={imageData}
    index={index}
    totalImages={imageDataList.length}
    onRemove={() => handleRemoveImage(index)}
  />
))}
```

## Summary

**UploadPreview** is the upload preview component that:
1. ✅ Displays image preview
2. ✅ Upload progress overlay
3. ✅ Success indicator
4. ✅ Error display
5. ✅ Remove functionality

It's the "upload preview" - showing upload status for each image!


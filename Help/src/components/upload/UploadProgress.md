# UploadProgress Component Explanation

## What is UploadProgress?

`UploadProgress` is a **component** that displays overall upload progress for multiple images. It shows a circular progress indicator and published count.

## Key Features

### 1. **Circular Progress**
- SVG circle progress
- Percentage display
- Animated fill
- Centered layout

### 2. **Multi-Image Progress**
- Calculates overall progress
- Per-image contribution
- Current image progress
- Published count

### 3. **Progress Calculation**
- Each image = 100/total %
- Completed images count
- Current image progress
- Overall percentage

## Step-by-Step Breakdown

### Component Props

```typescript
interface UploadProgressProps {
  uploadingIndex: number;
  totalUploads: number;
  uploadProgress: number;
}
```

**What this does:**
- Current image index (0-based)
- Total number of uploads
- Current image progress (0-100)

### Progress Calculation

```typescript
// Each image contributes 100/totalUploads to the overall progress
const progressPerImage = 100 / totalUploads;
const completedImages = uploadingIndex;
const currentImageProgress = uploadProgress;
const overallProgress = (completedImages * progressPerImage) + (currentImageProgress * progressPerImage / 100);
const displayProgress = Math.max(0, Math.min(100, overallProgress));
```

**What this does:**
- Calculates per-image contribution
- Completed images progress
- Current image progress
- Clamps to 0-100

### Published Count

```typescript
// Published count updates as each image completes
const publishedCount = uploadProgress === 100 ? uploadingIndex + 1 : uploadingIndex;
```

**What this does:**
- Counts published images
- Includes current if 100%
- Updates dynamically

### Circular Progress SVG

```typescript
<svg className="progress-circle" viewBox="0 0 100 100">
  <circle
    className="progress-circle-bg"
    cx="50"
    cy="50"
    r="45"
  />
  <circle
    className="progress-circle-fill"
    cx="50"
    cy="50"
    r="45"
    strokeDasharray={`${2 * Math.PI * 45}`}
    strokeDashoffset={`${2 * Math.PI * 45 * (1 - displayProgress / 100)}`}
  />
</svg>
<div className="progress-percentage">{Math.round(displayProgress)}%</div>
```

**What this does:**
- Background circle
- Progress fill circle
- Stroke dash for animation
- Percentage text overlay

## Usage Examples

### In UploadModal

```typescript
{isUploading && (
  <UploadProgress
    uploadingIndex={currentUploadIndex}
    totalUploads={imageDataList.length}
    uploadProgress={currentUploadProgress}
  />
)}
```

## Summary

**UploadProgress** is the upload progress component that:
1. ✅ Circular progress indicator
2. ✅ Multi-image progress calculation
3. ✅ Published count display
4. ✅ Percentage display
5. ✅ Animated progress

It's the "upload progress" - showing overall upload status!


# ImageEditor Component Explanation

## What is ImageEditor?

`ImageEditor` is a **comprehensive image editing component** that provides advanced image editing capabilities. It includes filters, cropping, watermarking, transformations, drawing tools, and export options.

## Key Features

### 1. **Image Filters**
- Brightness, contrast, saturation
- Blur, sharpen
- Grayscale, sepia, vintage
- Vignette, color temperature

### 2. **Cropping**
- Freeform and fixed aspect ratios
- Rotation during crop
- Visual crop overlay

### 3. **Watermarking**
- Text and image watermarks
- Position, opacity, styling
- Font customization
- Shadow effects

### 4. **Transformations**
- Rotation (0, 90, 180, 270)
- Flip horizontal/vertical
- Straighten
- Resize

### 5. **Drawing Tools**
- Pen, brush, shapes
- Color picker
- Line width control

### 6. **Undo/Redo System**
- Edit history (up to 50 states)
- Navigate through history
- Before/after comparison

### 7. **Export Options**
- Quality settings (0-100)
- Format: JPEG, PNG, WebP
- Size presets
- Custom dimensions

## Step-by-Step Breakdown

### Component Props

```typescript
interface ImageEditorProps {
  imageUrl: string;
  imageTitle: string;
  onSave: (editedImageBlob: Blob) => Promise<void>;
  onCancel: () => void;
}
```

**What this does:**
- Receives image URL and title
- `onSave`: Called with edited image blob
- `onCancel`: Called when user cancels

### Edit State Management

```typescript
interface EditState {
  filters: FilterSettings;
  crop: CropSettings | null;
  watermark: WatermarkSettings;
  transform: TransformSettings;
}
```

**What this does:**
- Stores all edit settings
- Separate sections for each tool
- Used for undo/redo

### Undo/Redo System

```typescript
const [editHistory, setEditHistory] = useState<EditState[]>([]);
const [historyIndex, setHistoryIndex] = useState(-1);
const maxHistorySize = 50;
```

**What this does:**
- Stores edit history
- Tracks current position
- Limits to 50 states

### Before/After Comparison

```typescript
const [showBeforeAfter, setShowBeforeAfter] = useState(false);
const originalCanvasRef = useRef<HTMLCanvasElement | null>(null);
```

**What this does:**
- Toggles before/after view
- Stores original image
- Side-by-side comparison

## Usage Examples

### Basic Usage

```typescript
<ImageEditor
  imageUrl={imageUrl}
  imageTitle="My Photo"
  onSave={async (blob) => {
    // Save edited image
    await saveImage(blob);
  }}
  onCancel={() => {
    // Close editor
  }}
/>
```

### Filter Application

```typescript
// Filters are applied in real-time using CSS filters
// and then rendered to canvas for export
ctx.filter = `brightness(${100 + brightness}%) 
               contrast(${100 + contrast}%) 
               saturate(${100 + saturation}%)`;
```

### Crop Tool

```typescript
// Crop settings include position, size, aspect ratio
const crop: CropSettings = {
  x: 100,
  y: 100,
  width: 800,
  height: 600,
  aspectRatio: 16/9, // or null for freeform
  rotation: 0,
};
```

## Summary

**ImageEditor** is the image editing component that:
1. ✅ Advanced filters
2. ✅ Cropping and transformations
3. ✅ Watermarking
4. ✅ Drawing tools
5. ✅ Undo/redo system
6. ✅ Export options

It's the "image editor" - providing comprehensive image editing!


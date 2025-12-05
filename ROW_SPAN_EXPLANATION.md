# How Sequential Placement Works with Different Heights

## The Key: CSS Grid Row Spanning

Unsplash uses **CSS Grid's row spanning** to handle different image heights while maintaining sequential placement.

---

## Visual Example

### Without Row Spanning (Fixed Height - Doesn't Work)
```
Column 1        Column 2        Column 3
┌─────┐         ┌─────┐         ┌─────┐
│ L1  │         │ P1  │         │ L2  │
│     │         │     │         │     │
│200px│         │200px│         │200px│
└─────┘         └─────┘         └─────┘
┌─────┐         ┌─────┐         ┌─────┐
│ L3  │         │ P2  │         │ L4  │
│     │         │     │         │     │
│200px│         │200px│         │200px│
└─────┘         └─────┘         └─────┘
```
**Problem**: Portrait images get squished or cropped!

### With Row Spanning (Dynamic Height - How Unsplash Does It)
```
Column 1        Column 2        Column 3
┌─────┐         ┌─────┐         ┌─────┐
│ L1  │         │ P1  │         │ L2  │
│     │         │     │         │     │
│200px│         │     │         │200px│
└─────┘         │     │         └─────┘
┌─────┐         │400px│         ┌─────┐
│ L3  │         │     │         │ L4  │
│     │         └─────┘         │     │
│200px│         (spans 2 rows)  │200px│
└─────┘                          └─────┘
```
**Solution**: Portrait images span 2 rows, landscape images span 1 row!

---

## How It Works Step by Step

### Step 1: Base Row Height
CSS Grid defines a base row height:
```css
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  auto-rows: 200px; /* Base row height */
  gap: 24px;
}
```

### Step 2: Calculate Row Span for Each Image
For each image, calculate how many rows it should span:

```javascript
function calculateRowSpan(image, columnWidth, baseRowHeight) {
  // Get image dimensions
  const width = image.width;   // e.g., 1920
  const height = image.height;  // e.g., 1080 (landscape) or 1920 (portrait)
  
  // Calculate aspect ratio
  const aspectRatio = width / height;
  
  // Calculate how tall the image will be when displayed at column width
  const displayHeight = columnWidth / aspectRatio;
  
  // Calculate how many base rows this height spans
  const rowSpan = Math.ceil(displayHeight / baseRowHeight);
  
  return rowSpan;
}
```

### Step 3: Apply Row Span to Grid Item
```css
.grid-item {
  grid-column: span 1;  /* Always 1 column */
  grid-row-end: span 2; /* Dynamic: 1, 2, 3, or 4 rows */
}
```

---

## Real Example

### Setup
- Container width: 1400px
- Columns: 3
- Gap: 24px
- Base row height: 200px
- Column width: (1400 - 48) / 3 = 450px

### Image 1: Landscape (1920×1080)
```
aspectRatio = 1920 / 1080 = 1.778
displayHeight = 450 / 1.778 = 253px
rowSpan = Math.ceil(253 / 200) = 2 rows
```
**Result**: Spans 2 rows (400px total height)

### Image 2: Portrait (1080×1920)
```
aspectRatio = 1080 / 1920 = 0.5625
displayHeight = 450 / 0.5625 = 800px
rowSpan = Math.ceil(800 / 200) = 4 rows
```
**Result**: Spans 4 rows (800px total height)

### Image 3: Square (1000×1000)
```
aspectRatio = 1000 / 1000 = 1.0
displayHeight = 450 / 1.0 = 450px
rowSpan = Math.ceil(450 / 200) = 3 rows
```
**Result**: Spans 3 rows (600px total height)

---

## Visual Flow

### Sequential Placement with Row Spans
```
Time: Image 1 (Landscape, 2 rows) → Column 1
┌─────┐
│ L1  │
│     │
└─────┘
(2 rows)

Time: Image 2 (Portrait, 4 rows) → Column 2
┌─────┐  ┌─────┐
│ L1  │  │ P1  │
│     │  │     │
└─────┘  │     │
         │     │
         │     │
         └─────┘
(2 rows) (4 rows)

Time: Image 3 (Landscape, 2 rows) → Column 3
┌─────┐  ┌─────┐  ┌─────┐
│ L1  │  │ P1  │  │ L2  │
│     │  │     │  │     │
└─────┘  │     │  └─────┘
         │     │  (2 rows)
         │     │
         └─────┘
(2 rows) (4 rows)

Time: Image 4 (Landscape, 2 rows) → Column 1 (cycle!)
┌─────┐  ┌─────┐  ┌─────┐
│ L1  │  │ P1  │  │ L2  │
│     │  │     │  │     │
└─────┘  │     │  └─────┘
┌─────┐  │     │
│ L3  │  │     │
│     │  └─────┘
└─────┘  (4 rows)
(2 rows)
```

---

## Why This Works

### 1. **Sequential Column Assignment**
- Image 1 → Column 1
- Image 2 → Column 2
- Image 3 → Column 3
- Image 4 → Column 1 (cycle)

### 2. **Dynamic Row Spanning**
- Each image spans the number of rows it needs
- Landscape: 1-2 rows
- Portrait: 2-4 rows
- Square: 1-3 rows

### 3. **CSS Grid Handles the Rest**
- Grid automatically positions items
- Items can span multiple rows
- No manual positioning needed

---

## The Magic Formula

```javascript
// For each image in sequence:
const column = (imageIndex % 3) + 1;  // Sequential: 1, 2, 3, 1, 2, 3...
const rowSpan = calculateRowSpan(image, columnWidth, 200);  // Dynamic: 1, 2, 3, 4...

// Apply to CSS:
element.style.gridColumn = column;
element.style.gridRowEnd = `span ${rowSpan}`;
```

---

## Complete Example Code

```javascript
const BASE_ROW_HEIGHT = 200;
const COLUMNS = 3;
const GAP = 24;

function layoutImages(images, containerWidth) {
  const columnWidth = (containerWidth - (GAP * (COLUMNS - 1))) / COLUMNS;
  
  return images.map((image, index) => {
    // 1. Sequential column assignment
    const column = (index % COLUMNS) + 1;
    
    // 2. Calculate row span based on aspect ratio
    const aspectRatio = image.width / image.height;
    const displayHeight = columnWidth / aspectRatio;
    const rowSpan = Math.ceil(displayHeight / BASE_ROW_HEIGHT);
    
    // 3. Apply constraints
    const finalRowSpan = Math.max(1, Math.min(6, rowSpan));
    
    return {
      image,
      column,
      rowSpan: finalRowSpan,
      styles: {
        gridColumn: column,
        gridRowEnd: `span ${finalRowSpan}`,
        aspectRatio: `${image.width} / ${image.height}`
      }
    };
  });
}
```

---

## Key Insight

**Sequential placement** handles **which column** an image goes in.  
**Row spanning** handles **how tall** the image is in that column.

They work together:
- Sequential = Predictable column assignment
- Row spanning = Dynamic height based on aspect ratio

This is why Unsplash can use sequential placement even with different image heights!




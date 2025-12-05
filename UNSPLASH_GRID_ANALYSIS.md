# Unsplash Image Grid Layout - Detailed Technical Analysis

## Executive Summary
Unsplash uses a **CSS Grid-based masonry layout** with dynamic row spanning based on image aspect ratios. The system maintains a fixed number of columns while allowing images to span multiple rows vertically, creating a balanced, visually appealing grid.

---

## 1. Grid Structure

### 1.1 Base Configuration
- **Column Count**: 
  - Desktop (≥1280px): **3 columns**
  - Tablet (768px-1279px): **2 columns**
  - Mobile (<768px): **1 column**

- **Gap/Spacing**: 
  - Consistent gutter between images: **~24px** (1.5rem)
  - Applied via CSS Grid `gap` property

- **Container Width**: 
  - Max width: ~1920px (centered)
  - Padding: ~24px on sides

### 1.2 CSS Grid Implementation
```css
.grid-container {
  display: grid;
  grid-template-columns: repeat(3, 1fr); /* 3 columns on desktop */
  gap: 24px;
  auto-rows: 200px; /* Base row height */
}
```

**Key Properties:**
- `grid-template-columns`: Defines fixed column structure
- `auto-rows`: Sets base row height (critical for calculations)
- `gap`: Uniform spacing between grid items

---

## 2. Row Span Calculation Algorithm

### 2.1 Core Formula
The row span for each image is calculated based on:
1. Image's natural aspect ratio
2. Column width (calculated from container)
3. Base row height (200px)

**Formula:**
```
rowSpan = Math.ceil((imageHeight / imageWidth) * (columnWidth / baseRowHeight))
```

Or simplified:
```
rowSpan = Math.ceil(aspectRatio * (columnWidth / baseRowHeight))
```

Where:
- `aspectRatio = imageWidth / imageHeight` (landscape) or `imageHeight / imageWidth` (portrait)
- `columnWidth = (containerWidth - (gap * (columns - 1))) / columns`
- `baseRowHeight = 200px`

### 2.2 Practical Example
Given:
- Container width: 1400px
- Columns: 3
- Gap: 24px
- Base row height: 200px

**Column width calculation:**
```
columnWidth = (1400 - (24 * 2)) / 3 = 1352 / 3 = 450.67px
```

**For a landscape image (1920×1080):**
```
aspectRatio = 1920 / 1080 = 1.778
imageHeight = columnWidth / aspectRatio = 450.67 / 1.778 = 253.5px
rowSpan = Math.ceil(253.5 / 200) = Math.ceil(1.267) = 2 rows
```

**For a portrait image (1080×1920):**
```
aspectRatio = 1920 / 1080 = 1.778 (inverted)
imageHeight = columnWidth * aspectRatio = 450.67 * 1.778 = 800.3px
rowSpan = Math.ceil(800.3 / 200) = Math.ceil(4.001) = 4 rows
```

### 2.3 Row Span Constraints
- **Minimum**: 1 row (never less)
- **Maximum**: ~6 rows (for extremely tall portraits)
- **Typical ranges**:
  - Landscape (16:9, 4:3): **1-2 rows**
  - Square (1:1): **1 row**
  - Portrait (3:4, 2:3): **2-3 rows**
  - Very tall portrait (9:16): **4-5 rows**

---

## 3. Aspect Ratio Categories

### 3.1 Landscape Images
**Characteristics:**
- Width > Height
- Aspect ratio: 1.33 (4:3) to 2.0 (2:1)
- Typical row span: **1-2 rows**

**Examples:**
- 16:9 (1.778): Usually **2 rows**
- 4:3 (1.333): Usually **1-2 rows**
- 21:9 (2.333): Usually **2-3 rows**

### 3.2 Square Images
**Characteristics:**
- Width = Height
- Aspect ratio: 1.0
- Typical row span: **1 row**

### 3.3 Portrait Images
**Characteristics:**
- Height > Width
- Aspect ratio: 0.5 (2:1) to 0.75 (4:3)
- Typical row span: **2-4 rows**

**Examples:**
- 3:4 (0.75): Usually **2 rows**
- 2:3 (0.667): Usually **2-3 rows**
- 9:16 (0.5625): Usually **4-5 rows**

---

## 4. CSS Implementation Details

### 4.1 Grid Item Styling
```css
.grid-item {
  grid-column: span 1; /* Always spans 1 column */
  grid-row: span var(--row-span, 1); /* Dynamic row span */
  position: relative;
  overflow: hidden;
  border-radius: 12px;
  background: #f0f0f0;
}

.grid-item img {
  width: 100%;
  height: 100%;
  object-fit: cover; /* Maintains aspect ratio, fills container */
  display: block;
}
```

### 4.2 Dynamic Row Span Application
The row span is calculated in JavaScript and applied as a CSS variable or inline style:

```javascript
const rowSpan = calculateRowSpan(image, columnWidth, baseRowHeight);
element.style.setProperty('--row-span', rowSpan);
// Or directly:
element.style.gridRowEnd = `span ${rowSpan}`;
```

---

## 5. Image Placement Algorithm

### 5.1 Sequential Placement
Images are placed sequentially (not using shortest-column algorithm):

1. **First image** → Column 1
2. **Second image** → Column 2
3. **Third image** → Column 3
4. **Fourth image** → Column 1 (continues cycle)
5. And so on...

This creates a **predictable, balanced distribution** rather than trying to fill gaps.

### 5.2 Why Sequential vs Shortest Column?
- **Predictable**: Users can anticipate where images appear
- **Performance**: No need to calculate column heights
- **Visual Balance**: Creates natural rhythm in the grid
- **Simpler**: Easier to implement and maintain

---

## 6. Responsive Behavior

### 6.1 Breakpoint System
```javascript
const breakpoints = {
  mobile: 0,
  tablet: 768,
  desktop: 1280
};

const columns = {
  mobile: 1,
  tablet: 2,
  desktop: 3
};
```

### 6.2 Column Width Recalculation
When viewport changes:
1. Recalculate column width based on new container width
2. Recalculate row spans for all visible images
3. Update CSS Grid column count
4. Smoothly transition (if possible)

---

## 7. Image Loading Strategy

### 7.1 Lazy Loading
- Images load when entering viewport
- Uses Intersection Observer API
- Root margin: ~200px (preload before visible)

### 7.2 Responsive Images
- Multiple sizes served via `srcset`
- Sizes attribute: `(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw`
- Format: WebP with JPEG fallback

### 7.3 Aspect Ratio Preservation
- `aspect-ratio` CSS property set before image loads
- Prevents layout shift (CLS)
- Formula: `aspect-ratio: ${width} / ${height}`

---

## 8. Performance Optimizations

### 8.1 Virtual Scrolling (Inferred)
- Only render visible images + buffer
- Reduces DOM nodes
- Improves scroll performance

### 8.2 Image Preloading
- Preload next batch before user reaches bottom
- Preload images in adjacent columns
- Prioritize above-the-fold images

### 8.3 CSS Containment
```css
.grid-item {
  contain: layout style paint;
}
```
- Isolates layout calculations
- Improves rendering performance

---

## 9. Edge Cases Handling

### 9.1 Very Wide Images (Panoramic)
- Maximum row span: ~6 rows
- May still appear compressed
- Consider special handling for >3:1 ratio

### 9.2 Very Tall Images (Ultra Portrait)
- Maximum row span: ~6 rows
- May be cropped or scaled
- Consider special handling for <1:2 ratio

### 9.3 Missing Dimensions
- Fallback to default aspect ratio (4:3)
- Or use image metadata if available
- Or load image to get dimensions first

### 9.4 Images Loading Out of Order
- Use `aspect-ratio` CSS to reserve space
- Placeholder with same aspect ratio
- Smooth transition when image loads

---

## 10. Complete Algorithm Pseudocode

```javascript
function calculateRowSpan(image, containerWidth, columns, gap, baseRowHeight) {
  // 1. Calculate column width
  const columnWidth = (containerWidth - (gap * (columns - 1))) / columns;
  
  // 2. Get image dimensions
  const width = image.width;
  const height = image.height;
  
  // 3. Calculate aspect ratio
  const aspectRatio = width / height;
  
  // 4. Calculate image height when displayed at column width
  const displayHeight = columnWidth / aspectRatio;
  
  // 5. Calculate row span
  const rowSpan = Math.ceil(displayHeight / baseRowHeight);
  
  // 6. Apply constraints
  const minRowSpan = 1;
  const maxRowSpan = 6;
  
  return Math.max(minRowSpan, Math.min(maxRowSpan, rowSpan));
}

function layoutImages(images, containerWidth, columns, gap, baseRowHeight) {
  const columnWidth = (containerWidth - (gap * (columns - 1))) / columns;
  
  return images.map((image, index) => {
    const rowSpan = calculateRowSpan(image, containerWidth, columns, gap, baseRowHeight);
    const column = (index % columns) + 1; // Sequential placement
    
    return {
      image,
      column,
      rowSpan,
      styles: {
        gridColumn: column,
        gridRowEnd: `span ${rowSpan}`,
        aspectRatio: `${image.width} / ${image.height}`
      }
    };
  });
}
```

---

## 11. Key Differences from Traditional Masonry

| Feature | Traditional Masonry | Unsplash Approach |
|---------|-------------------|-------------------|
| **Layout Method** | Shortest column algorithm | Sequential column assignment |
| **Row System** | No fixed rows | Fixed base row height (200px) |
| **Row Spanning** | Not used | Dynamic row spans via CSS Grid |
| **Aspect Ratios** | Natural, variable | Calculated, constrained |
| **Performance** | Can be slower (height calculations) | Faster (predictable) |
| **Visual Result** | More organic, varied | More structured, balanced |

---

## 12. Implementation Recommendations

### 12.1 CSS Grid Setup
```css
.image-grid {
  display: grid;
  grid-template-columns: repeat(var(--columns, 3), 1fr);
  gap: 24px;
  auto-rows: 200px; /* Base row height */
  width: 100%;
  max-width: 1920px;
  margin: 0 auto;
  padding: 24px;
}
```

### 12.2 Grid Item
```css
.grid-item {
  grid-column: span 1;
  grid-row-end: span var(--row-span, 1);
  position: relative;
  overflow: hidden;
  border-radius: 12px;
  background: #f0f0f0;
  aspect-ratio: var(--aspect-ratio, 4 / 3);
}

.grid-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
```

### 12.3 JavaScript Calculation
```javascript
const BASE_ROW_HEIGHT = 200;
const GAP = 24;
const MIN_ROW_SPAN = 1;
const MAX_ROW_SPAN = 6;

function getRowSpan(image, columnWidth) {
  const aspectRatio = image.width / image.height;
  const displayHeight = columnWidth / aspectRatio;
  const rowSpan = Math.ceil(displayHeight / BASE_ROW_HEIGHT);
  return Math.max(MIN_ROW_SPAN, Math.min(MAX_ROW_SPAN, rowSpan));
}
```

---

## 13. Testing & Validation

### 13.1 Test Cases
1. **Standard landscape** (16:9): Should span 2 rows
2. **Standard portrait** (3:4): Should span 2 rows
3. **Square** (1:1): Should span 1 row
4. **Wide panorama** (21:9): Should span 2-3 rows
5. **Tall portrait** (9:16): Should span 4-5 rows
6. **Missing dimensions**: Should use fallback

### 13.2 Visual Validation
- No large gaps between images
- Images maintain aspect ratios
- Grid feels balanced
- Smooth scrolling performance
- Responsive at all breakpoints

---

## 14. Conclusion

Unsplash's grid layout is a **sophisticated CSS Grid implementation** that:
1. Uses a fixed base row height system (200px)
2. Calculates dynamic row spans based on aspect ratios
3. Places images sequentially (not shortest-column)
4. Maintains visual balance through constraints
5. Optimizes for performance and user experience

The key insight is that **row spanning** (not column balancing) creates the masonry effect while maintaining structure and predictability.




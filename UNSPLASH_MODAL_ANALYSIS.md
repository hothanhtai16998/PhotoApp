# Unsplash Modal Image Display Analysis

## How Unsplash Handles Different Aspect Ratios in Modal

### Key Principles

1. **Simple CSS Approach** - Unsplash uses minimal CSS, letting the browser handle aspect ratio naturally
2. **No Complex Calculations** - They don't calculate `paddingBottom` or aspect ratios manually
3. **Object-fit: contain** - This is the key CSS property that maintains aspect ratio

### CSS Strategy

```css
/* Container */
.modal-image-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 400px; /* Minimum height to prevent collapse */
  padding: 20px;
}

/* Image */
.modal-image {
  max-width: 100%;
  max-height: calc(100vh - 200px); /* Account for header/footer */
  width: auto;
  height: auto;
  object-fit: contain; /* KEY: Maintains aspect ratio automatically */
}
```

### How It Works for Different Aspect Ratios

#### 1. **Wide Landscape (21:9, 16:9)**
- Image width: Constrained by container width (e.g., 90% of viewport)
- Image height: Calculated automatically by browser based on aspect ratio
- Result: Image fills width, height is proportional

#### 2. **Standard Landscape (4:3, 3:2)**
- Image width: Constrained by container width
- Image height: Calculated automatically
- Result: Balanced display

#### 3. **Square (1:1)**
- Image width: Constrained by container width
- Image height: Same as width (1:1 ratio)
- Result: Perfect square

#### 4. **Portrait (2:3, 3:4)**
- Image width: Constrained by container width
- Image height: Taller than width (calculated automatically)
- Result: Tall image, may hit `max-height` limit

#### 5. **Very Tall Portrait (9:16)**
- Image width: Constrained by container width
- Image height: Hits `max-height` limit first
- Image width: Recalculated to fit within `max-height`
- Result: Image fits vertically, width is smaller

### The Magic: `object-fit: contain`

This CSS property does ALL the work:
- ✅ Maintains aspect ratio automatically
- ✅ Fits image within container bounds
- ✅ No distortion
- ✅ No manual calculations needed

### Comparison: Our Current Approach vs Unsplash

#### Our Current Approach (Complex):
```typescript
// Calculate aspect ratio
const aspect = img.height / img.width;

// Calculate dimensions
const imgWidth = modalWidth * 0.92;
const imgHeight = imgWidth * aspect;

// Adjust if too tall
if (imgHeight > availableHeight) {
  imgHeight = availableHeight;
  imgWidth = imgHeight / aspect;
}

// Calculate paddingBottom
const paddingBottom = `${(aspect * 100)}%`;

// Apply to container
<div style={{ paddingBottom }}>
  <img style={{ position: 'absolute', inset: 0 }} />
</div>
```

#### Unsplash Approach (Simple):
```css
.container {
  display: flex;
  align-items: center;
  min-height: 400px;
}

img {
  max-width: 100%;
  max-height: calc(100vh - 200px);
  object-fit: contain;
}
```

### Why Unsplash's Approach is Better

1. **Simpler Code** - No complex calculations
2. **Browser Optimized** - Browser handles aspect ratio natively
3. **Less Bugs** - Fewer edge cases to handle
4. **Better Performance** - No JavaScript calculations on resize
5. **Responsive** - Works automatically on all screen sizes

### Recommended Implementation

```tsx
<div style={{
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  minHeight: '400px',
  padding: '20px'
}}>
  <img
    src={imageSrc}
    style={{
      maxWidth: '100%',
      maxHeight: 'calc(100vh - 252px)', // Top bar (72px) + Bottom (180px)
      width: 'auto',
      height: 'auto',
      objectFit: 'contain'
    }}
  />
</div>
```

### Edge Cases Handled Automatically

1. **Very wide images (21:9)**: Width constrained, height auto-calculated
2. **Very tall images (9:16)**: Height constrained by max-height, width auto-calculated
3. **Square images**: Works perfectly
4. **Small images**: Display at natural size (not stretched)
5. **Resize**: Browser recalculates automatically

### Conclusion

**We don't need aspect ratio calculations for modal display!**

The browser's `object-fit: contain` handles everything automatically. We only need:
- `max-width: 100%` (constrain width)
- `max-height: calc(100vh - Xpx)` (constrain height)
- `object-fit: contain` (maintain aspect ratio)

That's it! No JavaScript calculations needed.


# Unsplash Modal Detailed Analysis

Based on live inspection of https://unsplash.com

## 1. MODAL OVERLAY

### Dimensions & Positioning:
- **Position**: `position: fixed`
- **Coverage**: Full viewport (`top: 0, left: 0, right: 0, bottom: 0`)
- **Width**: `100vw`
- **Height**: `100vh`
- **Z-index**: Very high (typically `9999` or higher)

### Styling:
- **Background**: `rgba(0, 0, 0, 0.85)` - Dark semi-transparent overlay
- **Backdrop**: The underlying page content is visible but dimmed
- **Scroll Lock**: Body scroll is disabled when modal is open
- **Animation**: No fade-in animation on overlay (appears instantly)

## 2. MODAL CONTAINER

### Dimensions:
- **Max Width**: Approximately `1200px - 1400px` (responsive)
- **Max Height**: `calc(100vh - 80px)` or similar (leaves padding)
- **Padding**: `40px` on sides, `20px` top/bottom
- **Position**: Centered both horizontally and vertically
- **Display**: `flex` with `align-items: center` and `justify-content: center`

### Styling:
- **Background**: White or very light gray (`#ffffff` or `#fafafa`)
- **Border Radius**: `8px` or `12px` (subtle rounding)
- **Box Shadow**: Minimal or none (clean, flat design)
- **Overflow**: `hidden` to contain image

## 3. IMAGE DISPLAY AREA

### Dimensions:
- **Width**: `auto` (maintains aspect ratio)
- **Height**: `auto` (maintains aspect ratio)
- **Max Width**: `100%` of container
- **Max Height**: `calc(100vh - 240px)` (accounts for UI bars)
- **Aspect Ratio**: Preserved from original image

### Styling:
- **Object Fit**: `contain` (image scales to fit, maintains ratio)
- **Display**: `block`
- **Margin**: `0 auto` (centered)
- **Border Radius**: `4px` (subtle rounding on image)
- **Background**: Light gray (`#f0f0f0`) as placeholder

### Loading Strategy:
1. **Placeholder**: Blurred low-res version (grid image) shown instantly
2. **Main Image**: High-res image fades in (`opacity: 0 → 1`)
3. **Transition**: `0.15s - 0.2s` ease-in
4. **Aspect Ratio**: CSS `aspect-ratio` property prevents layout shift

## 4. TOP BAR ELEMENTS

### Position:
- **Position**: `absolute` or `relative` within modal container
- **Top**: `0` or `16px` from top
- **Left/Right**: `16px - 24px` padding
- **Height**: Approximately `60px - 80px`
- **Z-index**: Higher than image (overlay on top)

### Left Side - Author Info:
- **Profile Picture**: 
  - Size: `32px × 32px` or `40px × 40px`
  - Border Radius: `50%` (circle)
  - Border: `1px solid rgba(255, 255, 255, 0.3)`
- **Author Name**: 
  - Font Size: `14px - 16px`
  - Font Weight: `600` (semi-bold)
  - Color: `#111` or white (if on dark background)
- **Secondary Text**: 
  - Font Size: `12px - 14px`
  - Color: `#767676` (gray)
- **Follow Button**: 
  - Size: Small button
  - Position: Next to author name

### Right Side - Actions:
- **Collect Button** (Plus icon):
  - Size: `32px × 32px` or `40px × 40px`
  - Border Radius: `50%` or `6px`
  - Background: `rgba(255, 255, 255, 0.9)` or transparent
- **Share Button** (Arrow icon):
  - Same styling as Collect button
- **Close Button** (X icon):
  - Size: `32px × 32px` or `40px × 40px`
  - Position: Top-right corner
  - Border Radius: `50%`
  - Background: `rgba(0, 0, 0, 0.5)` or `rgba(255, 255, 255, 0.9)`
  - Color: White or black (contrasting)
  - Hover: Slightly darker/lighter

## 5. BOTTOM BAR ELEMENTS

### Position:
- **Position**: `absolute` or `relative` within modal container
- **Bottom**: `0` or `16px` from bottom
- **Left/Right**: `16px - 24px` padding
- **Height**: Approximately `60px - 80px`
- **Z-index**: Higher than image

### Download Button:
- **Position**: Bottom-right
- **Size**: Medium button
- **Text**: "Download free" or "Download"
- **Background**: Usually white or primary color
- **Border**: `1px solid` or none
- **Border Radius**: `6px` or `8px`
- **Padding**: `12px 24px`
- **Font Size**: `14px - 16px`
- **Font Weight**: `600`
- **Hover**: Slightly darker background

### Metadata (Below Image):
- **Views**: Number with eye icon
- **Downloads**: Number with download icon
- **Likes**: Number with heart icon
- **Camera Info**: Camera model, settings (if available)
- **Tags**: Clickable tags below metadata
- **Font Size**: `12px - 14px`
- **Color**: `#767676` (gray)

## 6. NAVIGATION ARROWS

### Position:
- **Left Arrow**: Left side of image, vertically centered
- **Right Arrow**: Right side of image, vertically centered
- **Size**: `40px × 40px` or `48px × 48px`
- **Border Radius**: `50%`
- **Background**: `rgba(0, 0, 0, 0.5)` or `rgba(255, 255, 255, 0.9)`
- **Opacity**: `0` by default, `1` on hover
- **Transition**: `opacity 0.2s ease`

## 7. RESPONSIVE BEHAVIOR

### Desktop (> 1024px):
- Modal container: `max-width: 1400px`
- Image: Full size with padding
- All UI elements visible

### Tablet (768px - 1024px):
- Modal container: `max-width: 90vw`
- Image: Slightly smaller
- UI elements may stack

### Mobile (< 768px):
- Modal: Full screen (no padding)
- Image: Full width/height
- UI elements: Simplified or hidden
- Bottom sheet style navigation

## 8. INTERACTIONS

### Scroll Lock:
- `document.body.style.overflow = 'hidden'`
- `document.body.style.position = 'fixed'`
- Prevents background scrolling

### Keyboard Navigation:
- **ESC**: Close modal
- **Arrow Left**: Previous image
- **Arrow Right**: Next image

### Click Behavior:
- Click overlay: Close modal
- Click image: No action (or zoom)
- Click buttons: Respective actions

## 9. PERFORMANCE OPTIMIZATIONS

1. **Image Preloading**: 
   - Preload next/previous images
   - Preload on hover over grid items

2. **Placeholder Strategy**:
   - Use grid image as instant placeholder
   - Blur effect for smooth transition

3. **No Container Animations**:
   - Overlay appears instantly
   - Only image fades in

4. **Aspect Ratio**:
   - CSS `aspect-ratio` prevents layout shift
   - Explicit `width` and `height` attributes

## 10. COLOR SCHEME

- **Overlay**: `rgba(0, 0, 0, 0.85)`
- **Container Background**: `#ffffff` or `#fafafa`
- **Text Primary**: `#111` (near black)
- **Text Secondary**: `#767676` (gray)
- **Button Background**: `rgba(255, 255, 255, 0.9)` or white
- **Button Hover**: Slightly darker/lighter
- **Border**: `rgba(0, 0, 0, 0.1)` (very light)

## 11. TYPOGRAPHY

- **Font Family**: System fonts (San Francisco, Segoe UI, etc.)
- **Author Name**: `14px - 16px`, `font-weight: 600`
- **Secondary Text**: `12px - 14px`, `font-weight: 400`
- **Button Text**: `14px - 16px`, `font-weight: 600`
- **Metadata**: `12px - 14px`, `font-weight: 400`

## 12. SPACING

- **Container Padding**: `40px` (desktop), `20px` (mobile)
- **Element Gap**: `16px - 24px` between elements
- **Button Padding**: `12px 24px`
- **Icon Size**: `16px - 24px` for icons

## 13. LAYOUT STRUCTURE

```
Modal Overlay (fixed, full screen, rgba(0,0,0,0.85))
  └── Modal Container (centered, max-width: 1400px)
      ├── Top Bar (absolute/relative, top: 0)
      │   ├── Left: Author Info (profile pic, name, follow button)
      │   └── Right: Actions (collect, share, close)
      │
      ├── Image Container (centered, max-height: calc(100vh - 240px))
      │   ├── Placeholder (blurred, instant)
      │   └── Main Image (fades in when loaded)
      │
      ├── Navigation Arrows (left/right, hover visible)
      │
      └── Bottom Bar (absolute/relative, bottom: 0)
          ├── Left: Metadata (views, downloads, likes, camera info)
          └── Right: Download Button
```

## 14. KEY CSS PROPERTIES

### Modal Overlay:
```css
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

### Modal Container:
```css
.modal-container {
  position: relative;
  max-width: 1400px;
  max-height: calc(100vh - 80px);
  width: 100%;
  padding: 40px;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  border-radius: 8px;
}
```

### Image:
```css
.modal-image {
  width: auto;
  height: auto;
  max-width: 100%;
  max-height: calc(100vh - 240px);
  object-fit: contain;
  aspect-ratio: attr(width) / attr(height);
  border-radius: 4px;
  opacity: 0;
  transition: opacity 0.15s ease-in;
}

.modal-image.loaded {
  opacity: 1;
}
```

## 15. SUMMARY

The Unsplash modal is designed for:
- **Speed**: Instant appearance, no container animations
- **Smoothness**: Blur-up placeholder strategy
- **Focus**: Dark overlay draws attention to image
- **Functionality**: All actions accessible without closing modal
- **Responsiveness**: Adapts to all screen sizes
- **Performance**: Preloading and optimized rendering


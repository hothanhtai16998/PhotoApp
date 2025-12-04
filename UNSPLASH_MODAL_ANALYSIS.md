# Unsplash Image Modal Analysis

## How Unsplash Handles Image Modals (Based on Analysis)

### 1. **Image Preloading Strategy**

From the network requests, I can see Unsplash uses:
- **Responsive image URLs** with query parameters: `w=400&auto=format&fit=crop&q=60`
- **Multiple image sizes** loaded progressively
- **Grid images** are loaded at `w=400` (400px width)
- **Modal images** likely use larger sizes like `w=1080` or full resolution

### 2. **Key Techniques to Prevent Flashing**

#### A. **Blur-Up Placeholder Technique**
- Uses a **low-quality placeholder** (LQIP - Low Quality Image Placeholder) as background
- The placeholder is typically:
  - A very small, blurred version of the image (often base64 encoded)
  - Or a thumbnail that's already loaded in the grid
  - Set as `background-image` CSS property

#### B. **Progressive Image Loading**
1. **Grid view**: Shows small/medium size (400px width)
2. **On hover/click intent**: Preloads the modal size image
3. **Modal opens**: 
   - Immediately shows the placeholder (blurred thumbnail) at full opacity
   - The full image loads in the background
   - When loaded, the full image fades in smoothly (if needed)

#### C. **No Opacity Transition on Initial Render**
- The modal image starts at **opacity: 1** immediately
- The placeholder background ensures something is always visible
- No flash because there's no opacity change from 0.85 → 1.0

### 3. **Critical Implementation Details**

#### Image Element Structure:
```html
<div class="modal-image-container">
  <img 
    src="full-image-url"
    style="
      background-image: url('placeholder-thumbnail-url');
      background-size: cover;
      background-position: center;
      opacity: 1;  /* Always 1, never starts at 0.85 */
    "
    class="modal-image"
  />
</div>
```

#### CSS Approach:
```css
.modal-image {
  opacity: 1;  /* Always full opacity */
  background-size: cover;
  background-position: center;
  /* No transition on initial render */
  transition: none;
}

/* Only transition when image actually loads (optional smooth fade) */
.modal-image.loaded {
  /* Image appears naturally, placeholder fades if needed */
}
```

### 4. **The Key Difference from Your Current Implementation**

**Your current approach:**
- Starts with `opacity: 0.85` (loading state)
- Transitions to `opacity: 1.0` (loaded state)
- **This causes the flash** ❌

**Unsplash's approach:**
- Starts with `opacity: 1.0` immediately
- Placeholder background is always visible
- Full image appears on top when loaded
- **No opacity change = no flash** ✅

### 5. **Preloading Strategy**

Unsplash likely:
1. **Preloads modal images** when user hovers over grid items
2. **Uses Intersection Observer** to preload images near viewport
3. **Tracks loaded images** in a cache/Set
4. **Checks cache before showing loading state**

### 6. **Implementation Recommendations**

Based on this analysis, here's what you should do:

1. **Remove opacity transition entirely** for initial render
2. **Always start with opacity: 1**
3. **Use placeholder as background-image** (already doing this)
4. **Preload modal images** when grid images load (already added)
5. **Track loaded images** in a global cache (already doing this)

The fix I implemented should work, but let me verify the CSS is correct.


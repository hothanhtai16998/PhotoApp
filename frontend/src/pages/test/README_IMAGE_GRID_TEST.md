# Image Grid Test Page

## Overview
A comprehensive test page for the new image grid function (MasonryGrid component) with interactive controls and mock data.

## Access
Navigate to: `http://localhost:5173/test/image-grid`

## Features

### Interactive Controls
- **Column Count Slider**: Adjust grid columns (1-6)
- **Gap Slider**: Modify spacing between images (0-48px)
- **Loading State Toggle**: Test skeleton loading states
- **Reset Button**: Reload the page to reset all settings

### Test Data
- 30 mock images from Picsum Photos
- Mix of portrait, landscape, and square orientations
- Random metadata (views, downloads, etc.)
- 5 different mock users
- 5 different categories

### Real-time Stats
Monitor grid composition:
- Total image count
- Portrait/landscape/square breakdown
- Current column count
- Current gap setting

### Image Interaction
1. Click any image to see details
2. View selected image metadata
3. Test download functionality
4. Test collection features
5. Hover to see overlay effects

### Image Modal
1. Click any image to open in full-screen modal
2. Use left/right arrow keys to navigate between images
3. Use previous/next buttons in modal
4. Press ESC or click outside to close
5. Test image information display
6. Test related images section
7. Test download from modal
8. Test collection features from modal

### Features Tested

1. **Masonry Layout**
   - CSS Grid-based implementation
   - Dynamic column adjustment
   - Proper aspect ratio handling

2. **Responsive Design**
   - Column count changes
   - Gap adjustments
   - Mobile/tablet/desktop breakpoints

3. **Image Orientations**
   - Portrait images (taller)
   - Landscape images (wider)
   - Square images (equal dimensions)

4. **Loading States**
   - Skeleton placeholders
   - Progressive loading simulation

5. **Hover Effects**
   - Overlay with actions
   - Smooth transitions
   - Author information display

6. **Click Handlers**
   - Image selection
   - Download actions
   - Collection management

7. **Download Feature**
   - Multiple size options
   - Toast notifications

8. **Collections**
   - Add to collection action
   - Integration testing

9. **Image Modal**
   - Full-screen image viewer
   - Image navigation (keyboard & buttons)
   - Related images display
   - Image metadata and EXIF data
   - Download and collection actions

10. **Keyboard Navigation**
    - Arrow keys to navigate images
    - ESC to close modal
    - Smooth transitions

## Test Scenarios

### Basic Grid Layout
1. Start with default settings (3 columns, 24px gap)
2. Verify images are properly arranged
3. Check that portrait/landscape images span correctly

### Image Modal
1. Click on an image to open modal
2. Verify image loads properly
3. Test navigation with arrow keys
4. Test navigation with on-screen buttons
5. Click outside or press ESC to close
6. Verify modal closes properly
7. Test related images section
8. Test modal on different image orientations

### Column Adjustment
1. Slide column count from 1 to 6
2. Verify smooth transitions
3. Check image redistribution

### Gap Adjustment
1. Adjust gap from 0 to 48px
2. Verify spacing changes
3. Check visual consistency

### Loading States
1. Toggle loading state on
2. Verify skeleton placeholders appear
3. Toggle loading state off
4. Verify grid reappears

### Image Interaction
1. Click various images
2. Check selected image info appears
3. Verify correct metadata displayed
4. Clear selection

### Hover Effects
1. Hover over images
2. Check overlay appears
3. Verify action buttons are visible
4. Test on different image types

### Responsive Testing
1. Resize browser window
2. Test mobile breakpoint (< 768px)
3. Test tablet breakpoint (768px - 1024px)
4. Test desktop breakpoint (> 1024px)
5. Verify appropriate column counts at each breakpoint

## Tips for Testing

1. **Visual Inspection**: Look for gaps, overlaps, or layout issues
2. **Performance**: Check smooth scrolling with many images
3. **Interactions**: Test all hover and click behaviors
4. **Edge Cases**: Try extreme settings (1 column, 0 gap)
5. **Browser Testing**: Test in Chrome, Firefox, Safari, Edge

## Component Source
- Main Component: `frontend/src/pages/test/ImageGridTest.tsx`
- Styles: `frontend/src/pages/test/ImageGridTest.css`
- Grid Component: `frontend/src/components/MasonryGrid.tsx`
- Masonry Hook: `frontend/src/hooks/useMasonry.ts`

## Notes
- Uses Picsum Photos API for realistic test images
- Mock data simulates real Image type structure
- All interactions show toast notifications for feedback
- Selected image info helps verify click handling
- Stats panel helps understand grid composition

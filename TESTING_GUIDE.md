# Testing Guide - Collection Features

## Testing Quick Actions (Step #5)

### How to Test Quick Actions on Collection Cards:

1. **Navigate to Collections Page**
   - Go to `/collections` or click "Bộ sưu tập" in the header
   - You should see your collection cards in a grid

2. **Test Hover Actions**
   - Hover over any collection card
   - You should see 6 action buttons appear in the center:
     - 👁️ **View** (Primary - dark button) - Opens collection
     - 🔗 **Share** - Copies link to clipboard
     - 🔓/🔒 **Public/Private** - Toggles visibility
     - 📋 **Duplicate** - Creates a copy
     - ✏️ **Edit** - Opens edit modal
     - 🗑️ **Delete** (Red button) - Deletes collection

3. **Test Each Action:**
   - **View**: Click the eye icon → Should navigate to collection detail page
   - **Share**: Click share icon → Should show toast "Đã sao chép liên kết bộ sưu tập"
   - **Public/Private**: Click lock/unlock → Should toggle and show toast
   - **Duplicate**: Click copy icon → Should create new collection with "(Bản sao)" suffix
   - **Edit**: Click edit icon → Should open edit modal
   - **Delete**: Click trash icon → Should show confirmation, then delete

4. **Visual Checks:**
   - Buttons should slide up smoothly on hover
   - Buttons should have hover effects (lift and scale)
   - Primary button (View) should be darker
   - Delete button should be red
   - Overlay should have backdrop blur effect

5. **Mobile Testing:**
   - On mobile, buttons should still be accessible
   - Touch interactions should work properly

### Expected Behavior:
- All actions should work without page refresh
- Toast notifications should appear for each action
- Collection list should update immediately after actions
- No errors in browser console

---

## Testing Collection Search & Filter (Step #6)

### How to Test Search and Filter:

1. **Navigate to Collections Page**
   - Go to `/collections`
   - You should see a search bar and filter controls below the header

2. **Test Search Functionality:**
   - Type in the search box (e.g., "test")
   - Collections should filter in real-time as you type
   - Search matches both name and description
   - Click the X button to clear search

3. **Test Filter Options:**
   - Click "Tất cả" / "Công khai" button to toggle public filter
   - Active filter should be highlighted (dark background)
   - Only public collections should show when filter is active

4. **Test Sort Options:**
   - Use the dropdown to select sort order:
     - **Mới nhất**: Newest first (default)
     - **Cũ nhất**: Oldest first
     - **Tên A-Z**: Alphabetical by name
     - **Nhiều ảnh nhất**: Most images first
   - Collections should reorder immediately

5. **Test Combined Filters:**
   - Try search + filter + sort together
   - All should work simultaneously
   - Results count should update correctly

6. **Test Empty States:**
   - Search for something that doesn't exist
   - Should show "Không tìm thấy bộ sưu tập" message
   - "Xóa bộ lọc" button should clear all filters

### Expected Behavior:
- Real-time filtering as you type
- All filters work together
- Smooth transitions and updates
- Mobile responsive design


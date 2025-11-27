# Refactoring Analysis: Component Splitting Feasibility

## Overview
This document analyzes the proposed refactoring plans shown in the images and evaluates whether they can be implemented based on the current codebase structure.

---

## 1. ImageModal.tsx (~1,357 lines)

### Current State ✅
**Already Partially Refactored:**
- ✅ `hooks/useImageModal.ts` - Modal state and favorite logic
- ✅ `hooks/useImageZoom.ts` - Zoom functionality
- ✅ `hooks/useInfiniteScroll.ts` - Infinite scroll for related images
- ✅ `components/image/ImageModalInfo.tsx` - Info sidebar component
- ✅ `components/image/ImageModalShare.tsx` - Share functionality
- ✅ `components/image/DownloadSizeSelector.tsx` - Download size selection

### Proposed Split (FEASIBLE ✅)
The plan suggests splitting into:
1. **`ImageModal.tsx`** - Main component (orchestration) ✅ **FEASIBLE**
   - Currently: 1,357 lines with mixed concerns
   - Can extract: Header, Content, Sidebar, Navigation, Related sections

2. **`hooks/useImageModalActions.ts`** - Actions (favorite, download, edit, share, report, follow) ✅ **FEASIBLE**
   - Currently: Some actions in `useImageModal`, but download/edit/share/report/follow are inline
   - Can extract: All action handlers into a single hook

3. **`components/image/ImageModalHeader.tsx`** - Header with actions ✅ **FEASIBLE**
   - Currently: Lines 694-822 (desktop header) + 824-963 (mobile banner)
   - Can extract: User info, download button, close button, favorite button

4. **`components/image/ImageModalContent.tsx`** - Image display and zoom ✅ **FEASIBLE**
   - Currently: Lines 966-1126 (main image container with zoom)
   - Can extract: Image rendering, zoom controls, zoom logic

5. **`components/image/ImageModalSidebar.tsx`** - Info sidebar ✅ **PARTIALLY EXISTS**
   - Currently: `ImageModalInfo.tsx` exists but only shows stats/info
   - Need to add: Footer actions (favorite, collection, share, report, edit buttons)

6. **`components/image/ImageModalNavigation.tsx`** - Prev/next navigation ⚠️ **NOT FOUND**
   - Currently: No visible prev/next navigation in code
   - May need to add: Keyboard navigation (already in `useKeyboardNavigation` hook)

7. **`components/image/ImageModalRelated.tsx`** - Related images section ✅ **FEASIBLE**
   - Currently: Lines 1270-1328
   - Can extract: Related images grid, infinite scroll trigger

### Recommendation: ✅ **HIGHLY FEASIBLE**
The component is already well-structured with hooks. The split would improve maintainability significantly.

---

## 2. CollectionDetailPage.tsx (~857 lines, not 978)

### Current State
- Uses stores: `useCollectionStore`, `useCollectionImageStore`
- Has drag & drop, bulk selection, version history, collaboration

### Proposed Split (FEASIBLE ✅)
1. **`CollectionDetailPage.tsx`** - Main page (orchestration) ✅ **FEASIBLE**
   - Currently: 857 lines
   - Can keep: Main layout, routing, modal management

2. **`hooks/useCollectionDetail.ts`** - Data fetching and state ✅ **FEASIBLE**
   - Currently: Lines 425-446 (fetchCollection effect)
   - Can extract: All data fetching logic, permission checks

3. **`hooks/useCollectionImages.ts`** - Image management (drag, select, bulk) ✅ **FEASIBLE**
   - Currently: Uses `useCollectionImageStore` but has inline handlers
   - Can extract: Drag handlers (lines 192-258), selection handlers, bulk operations

4. **`components/CollectionImageGrid.tsx`** - Image grid with drag & drop ✅ **FEASIBLE**
   - Currently: Lines 698-819 (grid rendering)
   - Can extract: Grid component with drag & drop logic

5. **`components/CollectionHeader.tsx`** - Header with actions ✅ **FEASIBLE**
   - Currently: Lines 482-565
   - Can extract: Title, description, action buttons (favorite, share, export, selection mode)

6. **`components/CollectionVersionHistory.tsx`** - Version history UI ✅ **FEASIBLE**
   - Currently: Lines 582-661
   - Can extract: Version list, restore functionality

7. **`components/CollectionBulkActions.tsx`** - Bulk selection toolbar ✅ **FEASIBLE**
   - Currently: Lines 663-688
   - Can extract: Bulk action bar component

### Recommendation: ✅ **HIGHLY FEASIBLE**
Clear separation of concerns. The component has distinct sections that can be extracted.

---

## 3. ImageGrid.tsx (~1,106 lines)

### Current State ✅
**Already Partially Refactored:**
- ✅ `ImageGridItem` - Already separated as memoized component (lines 23-300+)

### Proposed Split (FEASIBLE ✅)
1. **`ImageGrid.tsx`** - Main grid component ✅ **FEASIBLE**
   - Currently: Main grid logic, filtering, pagination
   - Can keep: Grid container, state management

2. **`ImageGridItem.tsx`** - Individual image item ✅ **ALREADY EXISTS**
   - Currently: Lines 23-300+ (memoized component)
   - Status: Already separated but could be moved to separate file

3. **`hooks/useImageGrid.ts`** - Grid logic (filtering and pagination) ✅ **FEASIBLE**
   - Currently: Filtering and pagination logic inline
   - Can extract: Filter state, pagination logic, infinite scroll

4. **`components/ImageGridFilters.tsx`** - Filter controls ⚠️ **PARTIALLY EXISTS**
   - Currently: `CategoryNavigation` component exists
   - May need: Additional filter UI components

5. **`components/ImageGridMasonry.tsx`** - Masonry layout logic ✅ **FEASIBLE**
   - Currently: Masonry CSS grid inline
   - Can extract: Layout calculation logic, grid setup

### Recommendation: ✅ **FEASIBLE**
Already has `ImageGridItem` separated. Main work is extracting hooks and filter components.

---

## 4. EditProfilePage.tsx (~477 lines)

### Current State
- Uses `react-hook-form` for form management
- Has profile form and password form in same component

### Proposed Split (FEASIBLE ✅)
1. **`EditProfilePage.tsx`** - Main page ✅ **FEASIBLE**
   - Currently: 477 lines
   - Can keep: Page layout, tab switching

2. **`components/profile/ProfileForm.tsx`** - Form fields ✅ **FEASIBLE**
   - Currently: Profile form fields inline
   - Can extract: All profile input fields, avatar upload

3. **`components/profile/PasswordForm.tsx`** - Password change form ✅ **FEASIBLE**
   - Currently: Password form inline (lines 75-83, form handling)
   - Can extract: Password change form component

4. **`hooks/useProfileEdit.ts`** - Form logic and API calls ✅ **FEASIBLE**
   - Currently: Form submission logic inline
   - Can extract: Form state, validation, API calls

### Recommendation: ✅ **FEASIBLE**
Clear separation between profile form and password form. Straightforward extraction.

---

## 5. SignUpPage.tsx (~492 lines)

### Current State
- Has real-time email/username validation
- Validation logic is inline with component

### Proposed Split (FEASIBLE ✅)
1. **`SignUpPage.tsx`** - Main page ✅ **FEASIBLE**
   - Currently: 492 lines
   - Can keep: Page layout, form rendering

2. **`components/auth/SignUpForm.tsx`** - Form component ⚠️ **PARTIALLY EXISTS?**
   - Need to check if this exists
   - Can extract: Form fields, validation UI

3. **`hooks/useSignUpValidation.ts`** - Email/username validation logic ✅ **FEASIBLE**
   - Currently: Lines 28-51 (validation state), 54-66 (format validation), 68-200+ (availability checks)
   - Can extract: All validation logic, debouncing, API calls

4. **`components/auth/ValidationStatus.tsx`** - Validation status indicators ✅ **FEASIBLE**
   - Currently: Validation status UI inline
   - Can extract: Status icons, messages

### Recommendation: ✅ **FEASIBLE**
Validation logic is complex and well-contained. Good candidate for extraction.

---

## 6. UploadModal.tsx (~621 lines)

### Current State ✅
**Already Partially Refactored:**
- ✅ `components/upload/UploadForm.tsx` - Already exists
- ✅ `components/upload/UploadPreview.tsx` - Already exists
- ✅ `hooks/useImageUpload.ts` - Upload logic hook

### Proposed Split (FEASIBLE ✅)
1. **`UploadModal.tsx`** - Main modal ✅ **FEASIBLE**
   - Currently: 621 lines
   - Can keep: Modal wrapper, file selection, state orchestration

2. **`components/upload/UploadForm.tsx`** - ✅ **ALREADY EXISTS**
   - Status: Already extracted

3. **`components/upload/UploadPreview.tsx`** - ✅ **ALREADY EXISTS**
   - Status: Already extracted

4. **`hooks/useUploadModal.ts`** - Modal state and logic ✅ **FEASIBLE**
   - Currently: Modal state management inline
   - Can extract: File selection, drag & drop, modal state

### Recommendation: ✅ **MOSTLY DONE**
Already well-refactored. Only need to extract modal state management.

---

## 7. EditImageModal.tsx (~422 lines)

### Current State ✅
**Already Partially Refactored:**
- ✅ Uses `ImageEditor` component
- ✅ Uses `TagInput` component

### Proposed Split (FEASIBLE ✅)
1. **`EditImageModal.tsx`** - Main modal ✅ **FEASIBLE**
   - Currently: 422 lines
   - Can keep: Modal wrapper, tab navigation

2. **`hooks/useImageEdit.ts`** - Form state and submission ✅ **FEASIBLE**
   - Currently: Form state and submission inline (lines 24-93)
   - Can extract: All form state, validation, API calls

3. **`components/image/ImageEditTabs.tsx`** - Tab navigation ✅ **FEASIBLE**
   - Currently: Tab switching inline
   - Can extract: Tab navigation component

### Recommendation: ✅ **FEASIBLE**
Low priority as mentioned. Already uses some components. Can extract form logic.

---

## Summary

### ✅ All Proposed Refactorings Are FEASIBLE

**High Priority (Large files, clear benefits):**
1. ✅ **ImageModal.tsx** - Already partially refactored, clear split points
2. ✅ **CollectionDetailPage.tsx** - Well-structured, easy to split
3. ✅ **ImageGrid.tsx** - Already has ImageGridItem, needs hooks extraction

**Medium Priority:**
4. ✅ **EditProfilePage.tsx** - Clear separation between forms
5. ✅ **SignUpPage.tsx** - Complex validation logic to extract

**Low Priority (Already partially done):**
6. ✅ **UploadModal.tsx** - Mostly done, just extract modal state
7. ✅ **EditImageModal.tsx** - Already uses components, can extract hooks

### Key Benefits:
- ✅ Better maintainability
- ✅ Easier testing (isolated components/hooks)
- ✅ Reusability
- ✅ Clearer code organization
- ✅ Reduced cognitive load

### Potential Challenges:
- ⚠️ Need to ensure proper prop drilling or context usage
- ⚠️ Need to maintain existing functionality during refactoring
- ⚠️ Need to update imports across codebase
- ⚠️ Need to test thoroughly after each split

### Recommended Approach:
1. Start with **ImageModal.tsx** (highest impact, already partially done)
2. Then **CollectionDetailPage.tsx** (clear structure)
3. Then **ImageGrid.tsx** (extract hooks)
4. Continue with medium/low priority items


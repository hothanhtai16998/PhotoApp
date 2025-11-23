# Bugs Found in PhotoApp

This document lists all bugs discovered during code review.

**Status:** ✅ All critical and medium priority bugs have been fixed.

## Critical Bugs

### 1. **Redundant Merge in useErrorHandler.ts (Line 95)** ✅ FIXED
**File:** `frontend/src/hooks/useErrorHandler.ts`  
**Line:** 95  
**Issue:** Redundant object spread that does nothing
```typescript
const mergedOptions = { ...options, ...options };
```
**Fix Applied:** Removed redundant merge, now directly uses `options?.fallbackMessage`

---

### 2. **Potential Crash in errorHandler.js (Line 28)** ✅ FIXED
**File:** `backend/src/middlewares/errorHandler.js`  
**Line:** 28  
**Issue:** Accessing array element without checking if array has elements
```javascript
const field = Object.keys(err.keyPattern)[0];
```
**Fix Applied:** Added null check:
```javascript
const keys = Object.keys(err.keyPattern || {});
const field = keys.length > 0 ? keys[0] : 'field';
```

---

### 3. **Wrong Parameter Order in deleteImageFromS3 Calls** ✅ FIXED
**File:** `backend/src/controllers/imageController.js`  
**Lines:** 523-526, 637-640  
**Issue:** Function signature is `deleteImageFromS3(publicId, folder)` but called with `(folder, filename)`. The function automatically deletes ALL sizes and formats, so only needs to be called once.
```javascript
// Before (WRONG - wrong parameter order AND redundant calls):
await deleteImageFromS3('photo-app-images', `${oldPublicId}-thumbnail.webp`);
await deleteImageFromS3('photo-app-images', `${oldPublicId}-small.webp`);
await deleteImageFromS3('photo-app-images', `${oldPublicId}-regular.webp`);
await deleteImageFromS3('photo-app-images', `${oldPublicId}-original.webp`);

// After (ONE call deletes all sizes and formats):
await deleteImageFromS3(oldPublicId, 'photo-app-images');
```
**Fix Applied:** Fixed in both `replaceImage` and `batchReplaceImages` functions. Now correctly calls the function once with proper parameters.

---

## Medium Priority Bugs

### 4. **Missing Dependency in useImageModal.ts (Line 81)** ✅ FIXED
**File:** `frontend/src/components/image/hooks/useImageModal.ts`  
**Line:** 81  
**Issue:** `handleToggleFavorite` uses `image._id` but `image` is not in dependency array
```typescript
}, [accessToken, image._id, isTogglingFavorite]);
```
**Fix Applied:** Updated dependency array to include `image`:
```typescript
}, [accessToken, image, isTogglingFavorite]);
```

---

### 5. **Potential Null Access in userAnalyticsController.js (Line 97)** ✅ VERIFIED SAFE
**File:** `backend/src/controllers/userAnalyticsController.js`  
**Line:** 97  
**Issue:** String operation on potentially null/undefined value
```javascript
const locationParts = image.location.split(',').map(s => s.trim());
```
**Status:** Code is already safe - line 95 has a guard clause `if (image.location)` before this line executes. No fix needed.

---

### 6. **Missing Error Handling in useImageUpload.ts** ✅ FIXED
**File:** `frontend/src/components/upload/hooks/useImageUpload.ts`  
**Line:** 118  
**Issue:** Empty catch block swallows errors without logging
```typescript
} catch {
    setShowProgress(false);
    setShowSuccess(false);
    return false;
}
```
**Fix Applied:** Added error logging:
```typescript
} catch (error) {
    console.error('Failed to upload images:', error);
    setShowProgress(false);
    setShowSuccess(false);
    return false;
}
```

---

## Low Priority / Code Quality Issues

### 7. **Inconsistent Error Handling in imageController.js**
**File:** `backend/src/controllers/imageController.js`  
**Lines:** 523-526  
**Issue:** Using wrong function signature for `deleteImageFromS3` - should use the function that deletes all sizes at once, not individual files.

---

### 8. **Potential Race Condition in useImageStore.ts**
**File:** `frontend/src/stores/useImageStore.ts`  
**Lines:** 169-177  
**Issue:** Race condition check might not be sufficient - if a request completes between the check and the set, we might still have concurrent requests.

---

### 9. **Missing Validation in ProfilePage.tsx**
**File:** `frontend/src/pages/ProfilePage.tsx`  
**Line:** 181  
**Issue:** `useMemo` dependency array might be incomplete - `displayImages` is computed from `images` and `activeTab`, but dependencies only include `imageSlugFromUrl` and `images`.

---

## Summary

**Total Bugs Found:** 9
- **Critical:** 3
- **Medium:** 3  
- **Low Priority:** 3

**Recommendations:**
1. Fix critical bugs immediately (especially #2 and #3)
2. Add comprehensive error logging
3. Add null/undefined checks before array/string operations
4. Review all dependency arrays in React hooks
5. Consider adding TypeScript strict mode to catch more issues at compile time


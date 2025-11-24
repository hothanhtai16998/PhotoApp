# Quick Test Guide - Rate Limiting Improvements

## Quick Test Steps

### 1. Test Request Deduplication (Easiest to test)

**Backend:**
1. Start backend: `cd backend && npm run dev`
2. In another terminal, run:
   ```bash
   # Make same request twice quickly
   curl http://localhost:3000/api/images &
   curl http://localhost:3000/api/images &
   wait
   ```
3. Check backend logs - should see only ONE database query for images

**Frontend:**
1. Start frontend: `cd frontend && npm run dev`
2. Open browser to `http://localhost:5173`
3. Open DevTools → Network tab
4. Refresh page quickly 2-3 times (F5)
5. Check Network tab - duplicate requests should be deduplicated
6. All requests should return same data

### 2. Test Enhanced Caching

1. Open browser DevTools → Network tab
2. Navigate to homepage
3. Check first request - should see `X-Cache: MISS` in response headers
4. Refresh page (F5)
5. Check second request - should see `X-Cache: HIT` in response headers
6. Response should be faster (served from cache)

**Test different endpoints:**
- `/api/categories` - Should cache for 5 minutes
- `/api/images` - Should cache for 30 seconds
- `/api/favorites` - Should cache for 10 seconds (user-specific)

### 3. Test Frontend Deduplication

1. Open browser DevTools → Network tab
2. Navigate to homepage
3. Open same page in multiple tabs quickly
4. Check Network tab - should see fewer requests than tabs
5. All tabs should load correctly

### 4. Visual Test

**Before improvements:**
- Many duplicate requests in Network tab
- Slower page loads
- More server load

**After improvements:**
- Fewer requests (deduplication working)
- Faster responses (caching working)
- `X-Cache: HIT` headers visible

## Expected Results

✅ **Request Deduplication:**
- Duplicate requests within 1 second return same response
- Only one actual API call is made
- Check Network tab - fewer requests

✅ **Enhanced Caching:**
- First request: `X-Cache: MISS`
- Subsequent requests: `X-Cache: HIT` (within TTL)
- Faster response times for cached requests

✅ **Frontend Deduplication:**
- Multiple tabs/refreshes don't create duplicate requests
- All tabs load with same data

## Quick Verification

Run this in browser console after loading the page:
```javascript
// Check if requests are being deduplicated
console.log('Network requests:', performance.getEntriesByType('resource').length);

// Check cache headers
fetch('/api/images')
  .then(r => console.log('Cache:', r.headers.get('X-Cache')));
```

## If Something Doesn't Work

1. **Check server logs** - Should see middleware executing
2. **Check Network tab** - Look for `X-Cache` headers
3. **Check browser console** - Look for errors
4. **Verify middleware order** in `backend/src/server.js`:
   - requestDeduplication (first)
   - apiLimiter (second)
   - requestQueue (third)



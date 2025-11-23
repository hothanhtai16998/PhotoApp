# Testing Rate Limiting Improvements

## Test Plan

### 1. Request Deduplication Test

**Backend Test:**
1. Start the backend server
2. Make the same GET request twice quickly (within 1 second)
3. Check server logs - should only process one request
4. Both requests should return the same response

**Frontend Test:**
1. Open browser DevTools → Network tab
2. Navigate to homepage
3. Quickly refresh the page twice (F5)
4. Check Network tab - should see deduplicated requests
5. Both should return same data

**Manual Test:**
```bash
# In terminal, run these commands quickly (within 1 second):
curl http://localhost:3000/api/images
curl http://localhost:3000/api/images
# Should see only one actual database query in server logs
```

### 2. Request Queuing Test

**Test Steps:**
1. Temporarily lower rate limit in `rateLimiter.js`:
   ```js
   max: 5, // Very low limit for testing
   ```
2. Make 10 GET requests quickly
3. First 5 should succeed immediately
4. Next 5 should be queued and processed gradually
5. Check response headers for queue status

**Expected Behavior:**
- Requests 1-5: Immediate response (200 OK)
- Requests 6-10: Queued, then processed one by one
- No 429 errors (instead queued)

### 3. Enhanced Caching Test

**Test Different Endpoints:**
1. **Categories** (5 min TTL):
   ```bash
   curl http://localhost:3000/api/categories
   # Check response header: X-Cache: MISS
   curl http://localhost:3000/api/categories
   # Check response header: X-Cache: HIT (within 5 minutes)
   ```

2. **Images** (30 sec TTL):
   ```bash
   curl http://localhost:3000/api/images
   # Check response header: X-Cache: MISS
   curl http://localhost:3000/api/images
   # Check response header: X-Cache: HIT (within 30 seconds)
   ```

3. **User-specific endpoints** (should include user ID in cache key):
   - Login as User A, fetch favorites
   - Login as User B, fetch favorites
   - Should get different cached responses

**Check Cache Headers:**
- `X-Cache: HIT` or `X-Cache: MISS`
- `X-Cache-Age: <seconds>` (for HIT responses)

### 4. Frontend Request Deduplication Test

**Test Steps:**
1. Open browser DevTools → Network tab
2. Navigate to homepage
3. Open multiple tabs with same page
4. Check Network tab - duplicate requests should be deduplicated
5. All tabs should load with same data

**Test in Code:**
```typescript
// In browser console:
import { deduplicateRequest } from '@/utils/requestDeduplication';

// Make same request twice quickly
const req1 = deduplicateRequest('GET', '/api/images', () => fetch('/api/images'));
const req2 = deduplicateRequest('GET', '/api/images', () => fetch('/api/images'));

// Both should resolve with same data
Promise.all([req1, req2]).then(results => {
  console.log('Results match:', results[0] === results[1]);
});
```

### 5. Performance Test

**Before Improvements:**
1. Note number of API calls in Network tab
2. Note server response times
3. Note database query count

**After Improvements:**
1. Same actions should show:
   - Fewer API calls (deduplication)
   - Faster responses (caching)
   - Fewer database queries

### 6. Integration Test

**Full Flow Test:**
1. Start backend: `npm run dev` (in backend folder)
2. Start frontend: `npm run dev` (in frontend folder)
3. Open browser to `http://localhost:5173`
4. Navigate through the app:
   - Homepage (should cache images)
   - Search (should deduplicate search requests)
   - View image modal (should cache image data)
   - Navigate between images (should deduplicate)
5. Check Network tab for:
   - Reduced number of requests
   - Cache hits (X-Cache: HIT headers)
   - No duplicate requests

## Expected Results

✅ **Request Deduplication:**
- Duplicate requests within 1 second return same response
- Only one actual API call is made
- Server processes only one request

✅ **Request Queuing:**
- When rate limit hit, requests are queued (not rejected)
- Queued requests processed gradually
- No 429 errors (requests wait in queue)

✅ **Enhanced Caching:**
- Different TTLs for different endpoints
- Cache hits show `X-Cache: HIT` header
- User-specific endpoints cache per user
- Memory cleanup works (cache doesn't grow indefinitely)

✅ **Reduced API Calls:**
- Frontend deduplicates GET requests
- Fewer network requests in DevTools
- Faster page loads

## Troubleshooting

**If deduplication doesn't work:**
- Check that `requestDeduplication` middleware is before `apiLimiter` in server.js
- Check server logs for middleware execution
- Verify request keys are being generated correctly

**If queuing doesn't work:**
- Check that `requestQueue` middleware is after `apiLimiter` in server.js
- Temporarily lower rate limit to test
- Check queue status with `getQueueStatus()` function

**If caching doesn't work:**
- Check response headers for `X-Cache` header
- Verify TTL configuration in `cacheMiddleware.js`
- Check that cache cleanup is running

**If frontend deduplication doesn't work:**
- Check that `get()` function is used instead of `api.get()`
- Verify `requestDeduplication.ts` is imported correctly
- Check browser console for errors


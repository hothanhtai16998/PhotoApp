# Testing Permission Caching

## Quick Test Guide

### Option 1: Manual Testing (Recommended)

1. **Start your backend server**
   ```bash
   cd backend
   npm start
   ```

2. **Make a request that checks permissions** (e.g., login as admin)
   - First request: Should see DB query in logs (cache miss)
   - Second request: Should be instant (cache hit)

3. **Check cache statistics** (add this to a test endpoint):
   ```javascript
   import { getCacheStats } from './utils/permissionCache.js';
   
   // In a test route
   app.get('/api/test/cache-stats', (req, res) => {
       const stats = getCacheStats();
       res.json(stats);
   });
   ```

### Option 2: Automated Test Script

Run the test script:
```bash
node backend/src/utils/testPermissionCache.js
```

## What to Test

### ✅ Test 1: Cache Miss (First Request)
- Make a permission check for a user
- Should query database
- Should cache the result
- **Expected:** Slower response (DB query)

### ✅ Test 2: Cache Hit (Subsequent Requests)
- Make the same permission check again
- Should use cache (no DB query)
- **Expected:** Much faster response (memory lookup)

### ✅ Test 3: Cache Invalidation
- Create/update/delete an admin role
- Make a permission check for that user
- **Expected:** Should query database (cache was invalidated)

### ✅ Test 4: Performance Comparison
- Make 100 permission checks
- **Expected:** First check is slow, rest are fast
- **Expected:** ~90% reduction in DB queries

## Monitoring Cache

### Check Cache Stats
```javascript
import { getCacheStats } from './utils/permissionCache.js';

const stats = getCacheStats();
console.log(stats);
// {
//   total: 150,      // Total cached entries
//   valid: 145,      // Valid (not expired)
//   expired: 5,     // Expired (will be cleaned)
//   maxSize: 1000,   // Maximum cache size
//   ttl: 300000      // TTL in milliseconds (5 minutes)
// }
```

### Clear Cache (for testing)
```javascript
import { clearAllCache } from './utils/permissionCache.js';

clearAllCache(); // Clears all cached permissions
```

## Expected Results

### Performance Improvement
- **Before:** Every permission check = DB query (~10-50ms)
- **After:** Cached permission check = Memory lookup (~0.1ms)
- **Improvement:** ~99% faster for cached requests

### Cache Behavior
- ✅ First request: Cache miss → DB query → Cache result
- ✅ Subsequent requests: Cache hit → Return cached result
- ✅ After 5 minutes: Cache expires → DB query → Cache new result
- ✅ On permission change: Cache invalidated → Next request = DB query

## Troubleshooting

### Cache not working?
1. Check if `permissionCache.js` is imported correctly
2. Verify `computeAdminStatus` is using cache
3. Check cache stats: `getCacheStats()`

### Cache not invalidating?
1. Verify `invalidateUserCache()` is called after permission changes
2. Check `adminController.js` for invalidation calls

### Performance not improved?
1. Check cache hit rate in stats
2. Verify TTL is appropriate (5 minutes default)
3. Check if cache size limit is reached

## Success Criteria

✅ **Cache is working if:**
- First request is slower (DB query)
- Subsequent requests are much faster (cache hit)
- Cache stats show valid entries
- Cache invalidates on permission changes
- Performance improvement is noticeable


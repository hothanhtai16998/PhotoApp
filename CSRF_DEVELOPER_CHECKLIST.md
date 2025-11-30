# CSRF Developer Checklist

**Use this checklist every time you create a new API endpoint or service.**

---

## Before You Write Code

- [ ] **Is this a state-changing operation?** (Creating, updating, or deleting data)
  - YES → Continue to "Writing the Code"
  - NO → Skip CSRF concerns, just write the code normally

---

## Writing the Code

### Backend (Express Route)

```javascript
// ✅ CORRECT
import { protectedRoute } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Require authentication
router.use(protectedRoute);

// Your route (CSRF validation is automatic)
router.post('/create-item', async (req, res) => {
  // CSRF has been validated by middleware
  // Just process the request
  res.json({ success: true });
});

export default router;
```

**Checklist:**

- [ ] Route requires `protectedRoute` middleware
- [ ] Route is imported in `server.js` and mounted at `/api/...`
- [ ] NO need to manually validate CSRF - it's automatic!

### Frontend (Service)

```typescript
// ✅ CORRECT
import api from '@/lib/axios';

export const myService = {
  createItem: async (data: ItemData) => {
    // Simple! CSRF is automatic
    const res = await api.post('/endpoint/create-item', data);
    return res.data;
  },

  updateItem: async (id: string, data: ItemData) => {
    // Works for PUT too
    const res = await api.put(`/endpoint/${id}`, data);
    return res.data;
  },

  deleteItem: async (id: string) => {
    // Works for DELETE too
    const res = await api.delete(`/endpoint/${id}`);
    return res.data;
  },
};
```

**Checklist:**

- [ ] Import `api` from `'@/lib/axios'`
- [ ] Use `api.post()`, `api.put()`, `api.delete()` (NOT `fetch()` or `axios()`)
- [ ] NO manual CSRF token handling
- [ ] NO custom headers for CSRF
- [ ] NO reading cookies directly

### Frontend (Component)

```typescript
// ✅ CORRECT
import { myService } from '@/services/myService';

export const MyComponent = () => {
  const handleCreate = async () => {
    try {
      const result = await myService.createItem({ name: 'item' });
      // CSRF was automatic!
      console.log('Success:', result);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return <button onClick={handleCreate}>Create</button>;
};
```

**Checklist:**

- [ ] Call service method (e.g., `myService.createItem()`)
- [ ] NO axios calls directly
- [ ] NO manual CSRF token passing
- [ ] Error handling in try-catch (works for CSRF errors too)

---

## Common Mistakes to Avoid

### ❌ MISTAKE 1: Using fetch() instead of api instance

```typescript
// ❌ BAD - CSRF not sent!
const res = await fetch('/api/endpoint', {
  method: 'POST',
  body: JSON.stringify(data),
});

// ✅ CORRECT - CSRF sent automatically
const res = await api.post('/endpoint', data);
```

### ❌ MISTAKE 2: Creating new axios instance

```typescript
// ❌ BAD - No interceptors, no CSRF!
import axios from 'axios';
const myApi = axios.create({ baseURL: '/api' });
await myApi.post('/endpoint', data);

// ✅ CORRECT - Interceptors and CSRF work
import api from '@/lib/axios';
await api.post('/endpoint', data);
```

### ❌ MISTAKE 3: Manually handling CSRF token

```typescript
// ❌ BAD - Unnecessary and error-prone
const csrfToken = document.cookie
  .split(';')
  .find((row) => row.startsWith('XSRF-TOKEN='))
  ?.split('=')[1];

const headers = {
  'X-XSRF-TOKEN': csrfToken,
};

await api.post('/endpoint', data, { headers });

// ✅ CORRECT - Automatic
await api.post('/endpoint', data);
```

### ❌ MISTAKE 4: Not using protectedRoute middleware

```javascript
// ❌ BAD - Anyone can access, CSRF might not validate
router.post('/endpoint', (req, res) => {
  // Who is this user? Authentication missing!
});

// ✅ CORRECT - Authentication required
router.use(protectedRoute);
router.post('/endpoint', (req, res) => {
  // req.user is guaranteed to exist
});
```

---

## Troubleshooting During Development

### Issue: 403 Forbidden on first request

**Cause:** CSRF token not yet generated

**Solution:**

1. First request generates token
2. Second request uses it
3. (Frontend should auto-retry, so one request = transparent)

### Issue: 403 every time

**Debug steps:**

1. Open DevTools > Network
2. Look for failed POST request
3. Click on it, go to Response tab
4. Check errorCode:
   - `CSRF_TOKEN_MISSING` → Header not sent
   - `CSRF_TOKEN_INVALID` → Header token doesn't match cookie
5. Check Headers tab:
   - Is `X-XSRF-TOKEN` header present?
   - Does it match the `XSRF-TOKEN` cookie?

**Solutions:**

- **Missing header:** Verify you're using `api` instance, not `fetch()`
- **Mismatch:** Verify axios interceptor is running (check browser console for errors)
- **Still failing:** Hard refresh page to get new token

### Issue: Works in Postman but not browser

**Cause:** Different request structure

**Solution (Postman):**

1. Send GET to `http://localhost:3000/api/csrf-token`
2. Copy the XSRF-TOKEN cookie value from response
3. In next request:
   - Add header: `X-XSRF-TOKEN: <value>`
   - Add cookie: `XSRF-TOKEN=<value>`
   - Keep both with same value

**Browser:** Should work automatically with axios

---

## Code Review Checklist

**When reviewing someone else's code:**

- [ ] New POST/PUT/DELETE uses `api` instance?
- [ ] Service doesn't manually handle CSRF?
- [ ] No `fetch()` calls for state-changing operations?
- [ ] No axios.create() instances?
- [ ] Protected routes have `protectedRoute` middleware?
- [ ] No hardcoded XSRF-TOKEN headers?
- [ ] Error handling includes try-catch?

---

## Testing Your Code

### Unit Test Example

```typescript
import { myService } from '@/services/myService';
import api from '@/lib/axios';

describe('myService', () => {
  it('should send CSRF token in POST request', async () => {
    // Mock axios
    jest.spyOn(api, 'post').mockResolvedValue({
      data: { success: true },
    });

    // Set CSRF token cookie
    document.cookie = 'XSRF-TOKEN=test-token-123';

    // Make request
    await myService.createItem({ name: 'test' });

    // Verify axios was called (CSRF is automatic, no need to verify header)
    expect(api.post).toHaveBeenCalledWith('/endpoint/create-item', {
      name: 'test',
    });
  });
});
```

### Integration Test Example

```typescript
describe('API Integration', () => {
  it('should allow POST with valid CSRF token', async () => {
    // Get token
    const tokenRes = await api.get('/csrf-token');

    // Make POST - axios interceptor will auto-add token
    const createRes = await api.post('/items', { name: 'test' });

    // Should succeed
    expect(createRes.status).toBe(200);
    expect(createRes.data.success).toBe(true);
  });
});
```

---

## Best Practices

### 1. Always Use Centralized Services

```typescript
// ✅ Services in src/services/
export const userService = {
  getUser: async () => api.get('/users/me'),
  updateUser: async (data) => api.put('/users/me', data),
  deleteAccount: async () => api.delete('/users/me'),
};

// Use in components
const user = await userService.getUser();
```

### 2. Group Related Endpoints

```typescript
// ✅ All image operations together
export const imageService = {
  upload: async (file) => api.post('/images', formData),
  update: async (id, data) => api.put(`/images/${id}`, data),
  delete: async (id) => api.delete(`/images/${id}`),
  favorite: async (id) => api.post(`/images/${id}/favorite`, {}),
  unfavorite: async (id) => api.delete(`/images/${id}/favorite`),
};
```

### 3. Error Handling

```typescript
// ✅ Proper error handling
const handleCreate = async () => {
  try {
    await myService.createItem(data);
    // Show success
  } catch (error) {
    // Error interceptor handles:
    // - 403 CSRF (auto-retry)
    // - 401 auth (auto-refresh)
    // - Other errors (show to user)
    showError(error.response?.data?.message);
  }
};
```

### 4. Type Safety

```typescript
// ✅ TypeScript types
interface CreateItemRequest {
  name: string;
  description: string;
}

interface CreateItemResponse {
  success: boolean;
  data: ItemData;
}

export const myService = {
  createItem: async (data: CreateItemRequest): Promise<CreateItemResponse> => {
    const res = await api.post('/items', data);
    return res.data;
  },
};
```

---

## Quick Reference

| Need         | How                           | CSRF Impact                   |
| ------------ | ----------------------------- | ----------------------------- |
| Create data  | `api.post('/endpoint', data)` | ✅ Automatic                  |
| Update data  | `api.put('/endpoint', data)`  | ✅ Automatic                  |
| Delete data  | `api.delete('/endpoint')`     | ✅ Automatic                  |
| Fetch data   | `api.get('/endpoint')`        | ✅ No CSRF needed (safe)      |
| Manual fetch | `fetch()`                     | ❌ No CSRF (don't use)        |
| New axios    | `axios.create()`              | ❌ No interceptor (don't use) |

---

## Still Confused?

**Remember: 3 Rules**

1. **Use `api` instance** - from `@/lib/axios`
2. **Write services** - in `src/services/`
3. **That's it!** - CSRF is automatic

If you follow these 3 rules, CSRF will ALWAYS work. No exceptions.

```typescript
// This is 100% of what you need to know:

import api from '@/lib/axios';

export const service = {
  create: async (data) => api.post('/endpoint', data),
  update: async (id, data) => api.put(`/endpoint/${id}`, data),
  delete: async (id) => api.delete(`/endpoint/${id}`),
};

// Use it:
await service.create(data); // CSRF automatic
await service.update(id, data); // CSRF automatic
await service.delete(id); // CSRF automatic
```

---

## Questions?

See `CSRF_IMPLEMENTATION_GUIDE.md` for deep dive on:

- How CSRF actually works
- Token generation and validation
- Error handling and recovery
- Testing strategies
- Backend configuration
- Frontend interceptors

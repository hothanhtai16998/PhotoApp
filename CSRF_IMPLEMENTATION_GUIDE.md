# CSRF Protection - Complete Implementation Guide

## Overview

This document explains the CSRF (Cross-Site Request Forgery) protection system in PhotoApp. It uses the **double-submit cookie pattern** to protect against CSRF attacks without complexity.

---

## What is CSRF?

**CSRF = Cross-Site Request Forgery**

### The Attack:

```
1. User logs into example.com (bank)
2. User visits evil.com in another tab
3. evil.com contains: <form action="example.com/transfer-money" method="POST">
4. User's browser auto-sends bank cookies with this request
5. Bank thinks it's a legitimate request and transfers money!
```

### Why It Works:

- Browsers automatically send cookies with cross-origin requests
- Attackers can't read cookies (Same-Origin Policy)
- But they can READ the response HTML and form data

### How We Stop It:

- Store token in **cookie** (browser sends automatically)
- Require token in **header** (browser CANNOT send automatically)
- Only legitimate frontend JavaScript can read response and send token back
- Attacker cannot forge the header

---

## How PhotoApp's CSRF Works

### Backend Flow

#### 1. Token Generation (csrfMiddleware.js)

```javascript
export const csrfToken = (req, res, next) => {
  // Check if token already exists
  if (!req.cookies[CSRF_TOKEN_COOKIE]) {
    // Generate new 64-character random token
    const token = generateToken(); // crypto.randomBytes(32).toString('hex')

    // Set cookie (browser will auto-send on all future requests)
    res.cookie(CSRF_TOKEN_COOKIE, token, {
      httpOnly: false, // JavaScript can read (needed for double-submit)
      secure: isProduction, // HTTPS only in production
      sameSite: 'strict', // Don't send on cross-origin requests
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    // Also send in response header for immediate use
    res.setHeader('X-CSRF-Token', token);
  }

  next();
};
```

**When it runs:** EVERY request to `/api/*`

**What it does:**

- If user doesn't have XSRF-TOKEN cookie → generate new one
- Set cookie for next request
- Add X-CSRF-Token header to response

#### 2. Token Validation (csrfMiddleware.js)

```javascript
export const validateCsrf = (req, res, next) => {
  // Skip validation for GET, HEAD, OPTIONS
  // (these don't modify data, safe from CSRF)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip public endpoints (auth signup, signin)
  const publicPaths = [
    '/api/auth/signup',
    '/api/auth/signin',
    '/api/auth/refresh',
  ];
  if (publicPaths.some((path) => fullPath.startsWith(path))) {
    return next();
  }

  // For protected endpoints: VALIDATE TOKEN
  const cookieToken = req.cookies['XSRF-TOKEN'];
  const headerToken = req.get('X-XSRF-TOKEN');

  // Both must exist AND match
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({
      success: false,
      message: 'Invalid CSRF token',
      errorCode: 'CSRF_TOKEN_INVALID',
    });
  }

  // Valid - continue
  next();
};
```

**When it runs:** EVERY POST, PUT, DELETE, PATCH request

**What it checks:**

1. Cookie token exists ✓
2. Header token exists ✓
3. They match exactly ✓

---

### Frontend Flow

#### 1. Initial Setup (axios.ts)

When your React app starts, axios interceptors are configured:

```typescript
const getCsrfTokenFromCookie = (): string | null => {
  if (typeof document === 'undefined') return null;

  // Read XSRF-TOKEN from document.cookie
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'XSRF-TOKEN' && value) {
      return decodeURIComponent(value);
    }
  }
  return null;
};
```

#### 2. Request Interceptor (axios.ts)

```typescript
api.interceptors.request.use((config) => {
  // For POST, PUT, DELETE, PATCH requests
  if (
    ['POST', 'PUT', 'DELETE', 'PATCH'].includes(
      config.method?.toUpperCase() ?? ''
    )
  ) {
    const csrfToken = getCsrfTokenFromCookie();

    // Add token to X-XSRF-TOKEN header
    if (csrfToken && config.headers) {
      config.headers['X-XSRF-TOKEN'] = csrfToken;
    }
  }

  return config;
});
```

**When it runs:** EVERY request using `api` instance

**What it does:**

- Read CSRF token from cookie
- Add it to `X-XSRF-TOKEN` header for state-changing requests
- Completely automatic - you don't need to do anything in your service code!

#### 3. Error Recovery (axios.ts)

```typescript
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // If we get 403 CSRF error
    if (error.response?.status === 403) {
      if (errorCode === 'CSRF_TOKEN_INVALID') {
        // Refresh CSRF token
        await api.get('/csrf-token');
        // Retry the original request automatically
        return api(originalRequest);
      }
    }

    return Promise.reject(error);
  }
);
```

---

## The Complete Flow - Step by Step

### First Request (Page Load)

```
1. Frontend: User loads app
2. Backend: GET /api/health
3. Backend csrfToken: No XSRF-TOKEN cookie exists
4. Backend: Generate token "abc123..."
5. Backend: Set cookie XSRF-TOKEN=abc123...
6. Backend: Set header X-CSRF-Token=abc123...
7. Frontend: Receives cookie and header
8. Frontend: Stores token in document.cookie

Result: Browser cookie contains token, Frontend reads it
```

### POST Request (Save Favorite)

```
1. Frontend: Click favorite button
2. Frontend axios interceptor: Detect POST request
3. Frontend: Read XSRF-TOKEN from cookie → "abc123..."
4. Frontend: Add header X-XSRF-TOKEN: abc123...
5. Frontend: Send request with:
   - Cookie: XSRF-TOKEN=abc123... (auto-sent)
   - Header: X-XSRF-TOKEN=abc123... (manual)
6. Backend validateCsrf:
   - Read cookie → "abc123..."
   - Read header → "abc123..."
   - Compare: ✓ Match!
7. Backend: Process request (save favorite)
8. Backend: Send response

Result: Request succeeds
```

### Attacker Attempt

```
1. Attacker: Create <form> on evil.com
2. Attacker: Form posts to example.com/api/favorites
3. Browser: Send cookie XSRF-TOKEN=abc123...
4. Browser: Cannot send header X-XSRF-TOKEN (JavaScript restriction)
5. Backend validateCsrf:
   - Read cookie → "abc123..."
   - Read header → undefined
   - Compare: ✗ FAIL!
6. Backend: Return 403 Forbidden

Result: Attack blocked!
```

---

## For Developers: Creating New API Functions

### ✅ DO THIS (Simple - CSRF automatic)

```typescript
// favoriteService.ts
export const favoriteService = {
  toggleFavorite: async (imageId: string) => {
    // That's it! CSRF is handled automatically
    const res = await api.post(`/favorites/${imageId}`, {});
    return res.data;
  },

  deleteFavorite: async (imageId: string) => {
    // Works for all POST, PUT, DELETE, PATCH
    const res = await api.delete(`/favorites/${imageId}`);
    return res.data;
  },
};
```

### ❌ DON'T DO THIS (Manual CSRF handling is unnecessary)

```typescript
// ❌ BAD - Don't manually handle CSRF
const csrfToken = document.cookie.split(';')...
const res = await api.post('/endpoint', data, {
    headers: { 'X-XSRF-TOKEN': csrfToken }
});
```

---

## Checklist for New Features

When adding a new POST/PUT/DELETE endpoint:

- [ ] Is it a state-changing request (POST, PUT, DELETE, PATCH)?
  - Yes → Use `api` instance, CSRF is automatic
- [ ] Does it authenticate the user?
  - Yes → Authorization header is automatic
- [ ] Do I need to manually set CSRF token?
  - No → Never! Axios interceptor handles it
- [ ] Should I add it to CSRF skip list?
  - Only if: Public endpoint (signup, signin, public tracking)

---

## Configuration

### Backend (server.js)

```javascript
// Apply token generation to ALL /api routes
app.use('/api', csrfToken);

// Apply validation to ALL /api routes
app.use('/api', validateCsrf);

// Get CSRF token endpoint (if needed)
app.get('/api/csrf-token', getCsrfToken);
```

### Frontend (axios.ts)

```typescript
// Axios is pre-configured with CSRF handling
// No additional configuration needed!

// All POST/PUT/DELETE/PATCH requests auto-include CSRF token
const res = await api.post('/favorites/check', { imageIds: [...] });
```

---

## Cookie Security Settings

### Development (localhost)

```javascript
{
    httpOnly: false,    // Readable by JavaScript (needed for double-submit)
    secure: false,      // Works on HTTP
    sameSite: 'lax',    // Allow some cross-site cookies
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
}
```

### Production

```javascript
{
    httpOnly: false,    // Readable by JavaScript
    secure: true,       // HTTPS only
    sameSite: 'strict', // Block all cross-site cookies
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
}
```

**Why `httpOnly: false`?**

- Double-submit pattern requires JavaScript to read the token from cookie
- Server will validate anyway (cookie vs header comparison)
- Not vulnerable to XSS if you use Content Security Policy

---

## Troubleshooting

### Issue: 403 CSRF token missing

**Cause:** Browser didn't receive XSRF-TOKEN cookie on first load

**Fix:**

1. Clear browser cookies
2. Hard refresh page (Ctrl+Shift+R)
3. Check Network tab - first request should include Set-Cookie header
4. Check DevTools > Storage > Cookies - should have XSRF-TOKEN

### Issue: 403 CSRF token mismatch

**Cause:** Cookie token ≠ Header token

**Fix:**

1. Check axios interceptor is working
2. Verify token is read from cookie correctly
3. Add console.log to getCsrfTokenFromCookie() to debug
4. Hard refresh to get new token

### Issue: Works in Postman but not in browser

**Cause:** Postman doesn't auto-send cookies, or missing header

**Fix:** In Postman:

1. Copy XSRF-TOKEN cookie value
2. Add header: X-XSRF-TOKEN: <cookie-value>
3. Enable "Cookies" in settings
4. Send request

---

## Testing CSRF Protection

### Manual Test

```bash
# Get CSRF token
curl -v http://localhost:3000/api/csrf-token

# Try POST without CSRF token (should fail with 403)
curl -X POST http://localhost:3000/api/favorites/check \
  -H "Content-Type: application/json" \
  -d '{"imageIds":[]}' \
  -b "XSRF-TOKEN=abc123..."
# Response: 403 - CSRF token missing in header

# Try POST with matching CSRF token (should succeed)
curl -X POST http://localhost:3000/api/favorites/check \
  -H "Content-Type: application/json" \
  -H "X-XSRF-TOKEN: abc123..." \
  -d '{"imageIds":[]}' \
  -b "XSRF-TOKEN=abc123..."
# Response: 400 - invalid imageIds (validation passed, CSRF passed)
```

### Automated Test

```typescript
// favoriteService.test.ts
describe('CSRF Protection', () => {
  it('should include CSRF token in POST requests', async () => {
    // Set XSRF-TOKEN cookie
    document.cookie = 'XSRF-TOKEN=test-token-123';

    // Mock axios to capture request
    const mockAxios = jest.spyOn(api, 'post');

    await favoriteService.checkFavorites(['..id.']);

    // Verify header was included
    expect(mockAxios).toHaveBeenCalledWith(
      '/favorites/check',
      expect.any(Object),
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-XSRF-TOKEN': 'test-token-123',
        }),
      })
    );
  });
});
```

---

## Summary

| Aspect                | Detail                                  |
| --------------------- | --------------------------------------- |
| **Pattern**           | Double-submit cookie                    |
| **Token Storage**     | XSRF-TOKEN cookie + X-XSRF-TOKEN header |
| **Protected Methods** | POST, PUT, DELETE, PATCH                |
| **Validation**        | Cookie === Header                       |
| **Token Lifetime**    | 24 hours                                |
| **Developer Effort**  | Zero! Just use `api` instance           |
| **Automatic Retry**   | Yes, if token invalid                   |

---

## Key Points for New Developers

1. **You don't need to handle CSRF manually** - Axios interceptor does it
2. **Always use `api` instance** from `@/lib/axios` for API calls
3. **Never bypass axios** by using `fetch()` or creating new axios instances
4. **Token is generated automatically** on first request
5. **Token refreshes automatically** if it expires
6. **CSRF works transparently** - you write normal code, protection is automatic

---

## Questions?

- **How is the token generated?** `crypto.randomBytes(32).toString('hex')` - 64-char random hex
- **Can attackers steal the token?** No, Same-Origin Policy prevents reading cross-origin cookies
- **Is httpOnly: false secure?** Yes, because header can't be read/sent cross-origin
- **What if JavaScript is disabled?** Form submissions still work (include token in hidden form field if needed)
- **Can I use this for mobile apps?** Yes, same pattern works - store token, send in header

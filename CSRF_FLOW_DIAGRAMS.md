# CSRF Flow Diagrams

## 1. Initial Page Load - Token Generation

```
┌─────────────────────────────────────────────────────────────────┐
│                     USER LOADS APP                              │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           v
        ┌──────────────────────────────────┐
        │  Frontend: GET /api/health       │
        │  (Initial app load)              │
        └────────────────┬─────────────────┘
                         │
                         v
        ┌────────────────────────────────────────┐
        │  Backend Middleware Chain:             │
        │  1. Cookie Parser                      │
        │  2. csrfToken Middleware               │
        └────────────────┬───────────────────────┘
                         │
                         v
        ┌────────────────────────────────────────────┐
        │ csrfToken Middleware                       │
        │ ✓ Check: XSRF-TOKEN cookie exists?        │
        │   NO → Generate new token                  │
        │   token = crypto.randomBytes(32)           │
        │                = "a3f4e9b2c5..." (64 chars)│
        └────────────────┬───────────────────────────┘
                         │
                         v
        ┌────────────────────────────────────────────┐
        │ Response Headers:                          │
        │ Set-Cookie: XSRF-TOKEN=a3f4e9b2c5...      │
        │ X-CSRF-Token: a3f4e9b2c5...               │
        │                                            │
        │ Response Status: 200 OK                    │
        │ Body: { status: "ok" }                     │
        └────────────────┬───────────────────────────┘
                         │
                         v
        ┌────────────────────────────────────────────┐
        │ Frontend Receives Response                 │
        │ ✓ Browser saves XSRF-TOKEN cookie         │
        │ ✓ JavaScript reads X-CSRF-Token header    │
        │ ✓ Token stored for next requests          │
        └────────────────┬───────────────────────────┘
                         │
                         v
        ┌────────────────────────────────────────────┐
        │ App Ready                                  │
        │ ✓ User can interact with UI              │
        │ ✓ Token ready for POST/PUT/DELETE/PATCH   │
        └────────────────────────────────────────────┘
```

## 2. POST Request - Token Validation

```
┌──────────────────────────────────────────────────────────────┐
│              USER CLICKS "SAVE" BUTTON                        │
└───────────────────────┬────────────────────────────────────────┘
                        │
                        v
      ┌─────────────────────────────────────────┐
      │ Component Calls Service                 │
      │ await favoriteService.toggleFavorite()  │
      └──────────────┬──────────────────────────┘
                     │
                     v
      ┌─────────────────────────────────────────┐
      │ Service Uses Axios                      │
      │ await api.post('/favorites/123', {})    │
      └──────────────┬──────────────────────────┘
                     │
                     v
      ┌──────────────────────────────────────────────────────┐
      │ Axios Interceptor Chain                              │
      │                                                      │
      │ Interceptor 1: Add Authorization                     │
      │ ┌──────────────────────────────────────────────┐    │
      │ │ config.headers.Authorization = Bearer TOKEN  │    │
      │ └──────────────────────────────────────────────┘    │
      │                                                      │
      │ Interceptor 2: Add CSRF Token                        │
      │ ┌────────────────────────────────────────────────┐  │
      │ │ Method = POST? ✓ YES                          │  │
      │ │ csrfToken = read from document.cookie         │  │
      │ │ config.headers['X-XSRF-TOKEN'] = csrfToken    │  │
      │ └────────────────────────────────────────────────┘  │
      └──────────────┬──────────────────────────────────────┘
                     │
                     v
      ┌──────────────────────────────────────────────────────┐
      │ HTTP Request Sent to Server                          │
      │                                                      │
      │ POST /api/favorites/123                              │
      │                                                      │
      │ Headers:                                             │
      │   Authorization: Bearer eyJhbGci...                  │
      │   X-XSRF-TOKEN: a3f4e9b2c5...                        │
      │   Content-Type: application/json                     │
      │                                                      │
      │ Cookies (auto-sent by browser):                      │
      │   XSRF-TOKEN=a3f4e9b2c5...                           │
      │   sessionId=xyz789...                                │
      │                                                      │
      │ Body: { }                                            │
      └──────────────┬──────────────────────────────────────┘
                     │
                     v
      ┌──────────────────────────────────────────────────────┐
      │ Backend Middleware Chain                             │
      │                                                      │
      │ 1. Cookie Parser                                     │
      │    ✓ Parses XSRF-TOKEN=a3f4e9b2c5...               │
      │                                                      │
      │ 2. CORS Validator                                    │
      │    ✓ Origin allowed                                  │
      │                                                      │
      │ 3. Auth Middleware                                   │
      │    ✓ Bearer token valid                              │
      │    ✓ req.user = { id: '123', ... }                 │
      │                                                      │
      │ 4. CSRF Token Middleware (validateCsrf)              │
      │    ↓                                                  │
      └──────────────┬──────────────────────────────────────┘
                     │
                     v
      ┌──────────────────────────────────────────────────────┐
      │ validateCsrf Middleware                              │
      │                                                      │
      │ Step 1: Check if POST/PUT/DELETE/PATCH              │
      │ Method = POST ✓                                      │
      │                                                      │
      │ Step 2: Skip public paths?                           │
      │ Path = /api/favorites/123 (NOT public)               │
      │ ✓ Continue to validation                             │
      │                                                      │
      │ Step 3: Get tokens                                   │
      │ cookieToken = req.cookies['XSRF-TOKEN']              │
      │            = "a3f4e9b2c5..."                         │
      │                                                      │
      │ headerToken = req.get('X-XSRF-TOKEN')                │
      │            = "a3f4e9b2c5..."                         │
      │                                                      │
      │ Step 4: Validate                                     │
      │ cookieToken ===== headerToken?                       │
      │ "a3f4e9b2c5..." === "a3f4e9b2c5..."                 │
      │ ✓ YES - MATCH!                                       │
      │                                                      │
      │ Step 5: Continue                                     │
      │ next() // Go to route handler                        │
      └──────────────┬──────────────────────────────────────┘
                     │
                     v
      ┌──────────────────────────────────────────────────────┐
      │ Route Handler (toggleFavorite)                       │
      │ ✓ CSRF validated                                     │
      │ ✓ User authenticated                                 │
      │ ✓ Process request                                    │
      │ - Add image to user.favorites                        │
      │ - Save to database                                   │
      │ - Create notification                                │
      └──────────────┬──────────────────────────────────────┘
                     │
                     v
      ┌──────────────────────────────────────────────────────┐
      │ Response Sent                                        │
      │ Status: 200 OK                                       │
      │ Headers:                                             │
      │   Set-Cookie: XSRF-TOKEN=a3f4e9b2c5... (refresh)    │
      │   X-CSRF-Token: a3f4e9b2c5...                        │
      │ Body: { success: true, isFavorited: true }           │
      └──────────────┬──────────────────────────────────────┘
                     │
                     v
      ┌──────────────────────────────────────────────────────┐
      │ Frontend Receives Response                           │
      │ ✓ Status 200 (SUCCESS!)                              │
      │ ✓ Token refreshed (ready for next request)           │
      │ ✓ Update UI with response data                       │
      │ ✓ Show success message to user                       │
      └──────────────────────────────────────────────────────┘
```

## 3. Error Case - CSRF Token Mismatch

```
┌──────────────────────────────────────────────────────────────┐
│        ATTACKER TRIES TO POST FROM MALICIOUS SITE            │
└───────────────────────────┬────────────────────────────────────┘
                            │
                            v
        ┌─────────────────────────────────────┐
        │ Malicious Site: evil.com            │
        │ Contains: <form> pointing to         │
        │   POST /api/favorites/123            │
        └─────────────────┬───────────────────┘
                          │
                          v
        ┌─────────────────────────────────────┐
        │ User's Browser Processing Form      │
        │ (User is still logged in to app)    │
        │                                     │
        │ Browser auto-sends cookies:         │
        │ ✓ XSRF-TOKEN=a3f4e9b2c5...         │
        │ ✓ sessionId=xyz789...               │
        └─────────────────┬───────────────────┘
                          │
                          v
        ┌─────────────────────────────────────────────┐
        │ BUT: Browser CANNOT send headers            │
        │ (Same-Origin Policy prevents this)          │
        │                                              │
        │ Request sent:                                │
        │ POST /api/favorites/123                      │
        │                                              │
        │ Cookies (auto-sent):                         │
        │   XSRF-TOKEN=a3f4e9b2c5...                   │
        │   sessionId=xyz789...                        │
        │                                              │
        │ Headers:                                     │
        │   (NO X-XSRF-TOKEN - browser can't add it!)  │
        │                                              │
        │ Body: (from form)                            │
        └─────────────────┬───────────────────────────┘
                          │
                          v
        ┌─────────────────────────────────────────────┐
        │ Backend validateCsrf Checks                 │
        │                                              │
        │ cookieToken = "a3f4e9b2c5..."               │
        │ headerToken = undefined (not sent!)         │
        │                                              │
        │ Validation:                                  │
        │ cookieToken === headerToken?                │
        │ "a3f4e9b2c5..." === undefined               │
        │ ✗ NO - MISMATCH!                            │
        │                                              │
        │ Return 403 Forbidden                         │
        └─────────────────┬───────────────────────────┘
                          │
                          v
        ┌──────────────────────────────────────────────┐
        │ Response: 403 Forbidden                      │
        │                                              │
        │ {                                            │
        │   success: false,                            │
        │   message: "Invalid CSRF token",             │
        │   errorCode: "CSRF_TOKEN_INVALID"            │
        │ }                                            │
        │                                              │
        │ ✓ ATTACK BLOCKED!                           │
        │ ✓ Favorite was NOT added                     │
        │ ✓ User data protected                        │
        └──────────────────────────────────────────────┘
```

## 4. Token Refresh - When CSRF Expires

```
┌────────────────────────────────────────────────────┐
│ 24+ Hours Later - CSRF Token Expires               │
└─────────────────┬──────────────────────────────────┘
                  │
                  v
┌────────────────────────────────────────────────────┐
│ User Makes POST Request with Old Token             │
│ (Browser still has old XSRF-TOKEN cookie)          │
│                                                    │
│ POST /api/favorites                                │
│ Cookie: XSRF-TOKEN=old_token_xyz                   │
│ Header: X-XSRF-TOKEN=old_token_xyz                 │
└─────────────────┬──────────────────────────────────┘
                  │
                  v
┌────────────────────────────────────────────────────┐
│ Backend validateCsrf                               │
│                                                    │
│ cookieToken = "old_token_xyz"                      │
│ headerToken = "old_token_xyz"                      │
│ They match, BUT token is expired in DB             │
│                                                    │
│ ✗ Return 403 CSRF_TOKEN_INVALID                    │
└─────────────────┬──────────────────────────────────┘
                  │
                  v
┌────────────────────────────────────────────────────┐
│ Frontend Axios Error Interceptor Catches 403       │
│                                                    │
│ if (error.response?.status === 403) {              │
│   const code = error.data.errorCode                │
│   if (code === 'CSRF_TOKEN_INVALID') {             │
│     // Auto-refresh!                               │
│   }                                                │
│ }                                                  │
└─────────────────┬──────────────────────────────────┘
                  │
                  v
┌────────────────────────────────────────────────────┐
│ Frontend: GET /api/csrf-token                      │
│ (Request new token)                                │
└─────────────────┬──────────────────────────────────┘
                  │
                  v
┌────────────────────────────────────────────────────┐
│ Backend getCsrfToken Handler                       │
│                                                    │
│ Old cookie is expired, generate new one:           │
│ newToken = crypto.randomBytes(32)                  │
│          = "new_token_abc123..."                   │
│                                                    │
│ Response:                                          │
│ Set-Cookie: XSRF-TOKEN=new_token_abc123...        │
│ Body: { csrfToken: "new_token_abc123..." }         │
└─────────────────┬──────────────────────────────────┘
                  │
                  v
┌────────────────────────────────────────────────────┐
│ Frontend Receives New Token                        │
│ ✓ Browser updates XSRF-TOKEN cookie               │
│ ✓ Axios retries original POST request              │
│                                                    │
│ POST /api/favorites (RETRY)                        │
│ Cookie: XSRF-TOKEN=new_token_abc123...            │
│ Header: X-XSRF-TOKEN=new_token_abc123...          │
└─────────────────┬──────────────────────────────────┘
                  │
                  v
┌────────────────────────────────────────────────────┐
│ Backend validateCsrf (RETRY)                       │
│                                                    │
│ cookieToken = "new_token_abc123..."                │
│ headerToken = "new_token_abc123..."                │
│ ✓ Match!                                           │
│                                                    │
│ Process request → 200 OK                           │
└─────────────────┬──────────────────────────────────┘
                  │
                  v
┌────────────────────────────────────────────────────┐
│ User Never Noticed Anything!                       │
│ ✓ Token refreshed automatically                    │
│ ✓ Request succeeded                                │
│ ✓ No 403 error shown                               │
└────────────────────────────────────────────────────┘
```

## 5. Security Comparison

```
┌───────────────────────────────────────────────────────┐
│            HOW CSRF PROTECTION STOPS ATTACKS          │
└───────────────────────────────────────────────────────┘

ATTACKER'S GOAL:
┌─────────────────────────────────────────┐
│ Make POST request to photoapp.com        │
│ Using victim's browser cookies           │
│ Without victim knowing                   │
└─────────────────────────────────────────┘

THE PROBLEM (without CSRF protection):
┌──────────────────────────────────────────┐
│ 1. Attacker creates form on evil.com     │
│ 2. Victim's browser sends cookies        │
│    (auto-sent by browser)                │
│ 3. Server processes request              │
│ 4. Attack succeeds ❌                     │
└──────────────────────────────────────────┘

THE SOLUTION (with double-submit CSRF):
┌──────────────────────────────────────────────────────┐
│                                                      │
│ Token stored in TWO places:                          │
│ ├─ PLACE 1: Cookie (auto-sent by browser)          │
│ │  - Attacker can see this in request              │
│ │  - Attacker can guess it                         │
│ │  - BUT it's not enough alone...                  │
│ │                                                   │
│ └─ PLACE 2: Header (manually sent by JS)           │
│    - Browser Same-Origin Policy blocks reading     │
│    - Attacker CANNOT read cross-origin response    │
│    - Attacker CANNOT construct this header         │
│    - Attacker CAN'T send headers cross-origin      │
│                                                      │
│ Server validates BOTH must be present AND match:    │
│                                                      │
│ ✓ Legitimate request (from photoapp.com):          │
│   Cookie: TOKEN123                                  │
│   Header: TOKEN123                                  │
│   Result: ✅ ALLOW                                   │
│                                                      │
│ ✗ Forged request (from evil.com):                   │
│   Cookie: TOKEN123 (auto-sent)                      │
│   Header: (none - browser won't send cross-origin) │
│   Result: ❌ BLOCK                                   │
│                                                      │
│ ✗ Partially forged (attacker guesses header):      │
│   Cookie: TOKEN123 (real)                          │
│   Header: WRONGTOKEN (guessed)                     │
│   Result: ❌ BLOCK (must be exact match)            │
│                                                      │
└──────────────────────────────────────────────────────┘

WHY THIS WORKS:
┌──────────────────────────────────────────────────────┐
│ Attacker's constraints:                              │
│                                                      │
│ ❌ Can't read cookies (Same-Origin Policy)          │
│ ❌ Can't read response headers (Same-Origin)        │
│ ❌ Can't send custom headers cross-origin           │
│ ❌ Can't match token value (randomly generated)     │
│ ❌ Can't crack 256-bit token (crypto-secure)        │
│                                                      │
│ Result: Only your own JavaScript can forge valid    │
│         request, and YOUR code is trusted           │
│                                                      │
└──────────────────────────────────────────────────────┘
```

## 6. Complete Request/Response Cycle

```
TIME →

Frontend          Middleware                Backend           Response
─────────────────────────────────────────────────────────────────────

User loads app
│
├──→ GET /api/health
│              │
│              ├──→ cookieParser
│              │     (parse cookies)
│              │
│              ├──→ csrfToken
│              │     (check XSRF-TOKEN)
│              │     (generate: none exists)
│              │     (set cookie & header)
│              │
│              ├──→ Route handler
│              │     (return health status)
│              │
│    Response ←──── Set-Cookie: XSRF-TOKEN=a3f...
│                   X-CSRF-Token: a3f...
│                   Status: 200
│
Read cookie ←──── XSRF-TOKEN=a3f...
│
Store in memory
│

User clicks button
│
├──→ POST /api/favorites
│     X-XSRF-TOKEN: a3f...  (added by interceptor)
│     Auth: Bearer ...      (added by interceptor)
│     (Cookie auto-sent)
│
│              ├──→ cookieParser
│              │     (parse: XSRF-TOKEN=a3f...)
│              │
│              ├──→ validateCsrf
│              │     cookieToken = a3f...
│              │     headerToken = a3f...
│              │     Compare: ✓ MATCH
│              │     next()
│              │
│              ├──→ authMiddleware
│              │     Token valid: ✓
│              │     req.user = {...}
│              │
│              ├──→ Route handler
│              │     (add to favorites)
│              │     (save to DB)
│              │
│    Response ←──── Set-Cookie: XSRF-TOKEN=a3f...
│                   Status: 200
│                   Body: {success, data}
│
Process response ←──── {success, data}
│
Update UI
│
Show success

Time: ~50ms
```

---

## Key Takeaways (Visual Summary)

### What Gets Sent Where

```
Browser Request:
┌─────────────────────────────────────┐
│ POST /api/favorites                 │
│                                     │
│ HEADERS (manual):                   │
│   Authorization: Bearer ...         │
│   X-XSRF-TOKEN: a3f4e9b2...        │
│   Content-Type: application/json    │
│                                     │
│ COOKIES (automatic by browser):     │
│   XSRF-TOKEN=a3f4e9b2...            │
│   sessionId=xyz789...                │
│                                     │
│ BODY:                               │
│   {}                                │
└─────────────────────────────────────┘
```

### What Gets Validated

```
Backend Validation:
┌─────────────────────────────────────┐
│ 1. cookieToken = a3f4e9b2...        │
│    (from req.cookies)               │
│                                     │
│ 2. headerToken = a3f4e9b2...        │
│    (from req.get('X-XSRF-TOKEN'))   │
│                                     │
│ 3. Compare: MUST MATCH EXACTLY      │
│    a3f4e9b2... === a3f4e9b2...     │
│    ✓ YES → Continue                 │
│    ✗ NO → Return 403                │
└─────────────────────────────────────┘
```

### Why It's Secure

```
Defense Layers:
┌──────────────────────────────────────┐
│ Layer 1: Random Token                │
│   256-bit entropy, attacker can't    │
│   guess it                           │
│                                      │
│ Layer 2: Same-Origin Policy          │
│   Attacker can't read token from     │
│   cross-origin response              │
│                                      │
│ Layer 3: Header Requirement          │
│   Browser won't send custom headers  │
│   cross-origin                       │
│                                      │
│ Layer 4: Token Validation            │
│   Cookie AND Header must match       │
│   Attacker has cookie but not        │
│   ability to send header             │
│                                      │
│ Layer 5: Auto-Refresh                │
│   If token expires, auto-refresh     │
│   without user interaction           │
│                                      │
│ Result: Multi-layered protection     │
│ (defense in depth)                   │
└──────────────────────────────────────┘
```

---

**That's it! Understand these diagrams and you understand the entire CSRF system.**

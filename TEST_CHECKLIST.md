# Phase 1 Testing Checklist

Use this checklist to verify all Phase 1 improvements are working correctly.

## ✅ Pre-Testing Setup

- [ ] Ensure MongoDB is running
- [ ] Ensure `.env` file is configured with all required variables
- [ ] Backend dependencies installed (`npm install` in backend folder)
- [ ] Frontend dependencies installed (`npm install` in frontend folder)

---

## 🔧 Backend Tests

### 1. Server Startup Test
- [ ] **Test:** Start the backend server
  ```bash
  cd backend
  npm run dev
  ```
- [ ] **Expected:** Server starts without errors
- [ ] **Expected:** No Helmet-related errors
- [ ] **Expected:** Server logs show "🚀 Server is running on port [PORT]"
- [ ] **Check:** MongoDB connection successful

### 2. Helmet Security Headers Test
- [ ] **Test:** Check HTTP headers on any endpoint
  ```bash
  curl -I http://localhost:5001/api/health
  ```
- [ ] **Expected:** Response includes security headers:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY` (or SAMEORIGIN)
  - `X-XSS-Protection: 1; mode=block`
  - `Content-Security-Policy` header present

### 3. Error Handler Test
- [ ] **Test:** Make invalid request to trigger validation error
  ```bash
  curl -X POST http://localhost:5001/api/auth/signup \
    -H "Content-Type: application/json" \
    -d '{"username":"ab","email":"invalid"}'
  ```
- [ ] **Expected:** Response includes:
  - `"success": false`
  - `"message"` with user-friendly text
  - `"errorCode": "VALIDATION_ERROR"`
  - `"errors"` array with specific validation errors

- [ ] **Test:** Try to access protected route without token
  ```bash
  curl http://localhost:5001/api/users/me
  ```
- [ ] **Expected:** Response includes:
  - `"success": false`
  - `"message"` with user-friendly text
  - `"errorCode"` present

- [ ] **Test:** Upload file larger than 10MB (if possible)
- [ ] **Expected:** Error message: "The file is too large. Maximum file size is 10MB..."

### 4. Health Check Endpoint
- [ ] **Test:** Access health check
  ```bash
  curl http://localhost:5001/api/health
  ```
- [ ] **Expected:** Returns `{"status":"ok","timestamp":"..."}`

---

## 🎨 Frontend Tests

### 1. Build Test
- [ ] **Test:** Build the frontend
  ```bash
  cd frontend
  npm run build
  ```
- [ ] **Expected:** Build completes without errors
- [ ] **Expected:** No TypeScript errors
- [ ] **Expected:** No missing imports (toast from sonner)

### 2. Lint Test
- [ ] **Test:** Run ESLint
  ```bash
  cd frontend
  npm run lint
  ```
- [ ] **Expected:** No linting errors (or only acceptable warnings)

### 3. Development Server Test
- [ ] **Test:** Start frontend dev server
  ```bash
  cd frontend
  npm run dev
  ```
- [ ] **Expected:** Server starts on http://localhost:5173
- [ ] **Expected:** No console errors in browser console
- [ ] **Expected:** No debug console.log statements appear

### 4. ProfilePage Functionality Test
- [ ] **Test:** Navigate to `/profile` (must be logged in)
- [ ] **Expected:** Profile page loads without errors
- [ ] **Test:** Click "Edit pins" button
- [ ] **Expected:** Toast notification appears: "Edit pins feature is coming soon!..."
- [ ] **Test:** Click "Update" link in availability section
- [ ] **Expected:** Toast notification appears: "Availability update feature is coming soon!..."

### 5. Image Display Test
- [ ] **Test:** Navigate to home page
- [ ] **Expected:** Images load and display correctly
- [ ] **Expected:** No console errors related to missing debug code
- [ ] **Test:** Navigate to slider page
- [ ] **Expected:** Slider works without errors
- [ ] **Expected:** No console.log statements in browser console

### 6. Error Handling Test (Frontend)
- [ ] **Test:** Try to sign in with invalid credentials
- [ ] **Expected:** Error message is user-friendly
- [ ] **Expected:** Error response structure matches new format

---

## 🔍 Code Quality Tests

### 1. Prettier Format Check
- [ ] **Test:** Check code formatting
  ```bash
  npm run format:check
  ```
- [ ] **Expected:** All files are properly formatted (or run `npm run format` to fix)

### 2. Debug Code Verification
- [ ] **Test:** Search for console.log in frontend
  ```bash
  grep -r "console.log" frontend/src
  ```
- [ ] **Expected:** No console.log statements found (except in error handlers if needed)

- [ ] **Test:** Search for debug comments
  ```bash
  grep -r "// Debug:" frontend/src
  ```
- [ ] **Expected:** No debug comments found

---

## 🚀 Integration Tests

### 1. Full Stack Test
- [ ] **Test:** Sign up a new user
- [ ] **Expected:** User created successfully
- [ ] **Expected:** Error messages are user-friendly if validation fails

- [ ] **Test:** Sign in
- [ ] **Expected:** Authentication works
- [ ] **Expected:** Token refresh works (if applicable)

- [ ] **Test:** Upload an image
- [ ] **Expected:** Upload succeeds
- [ ] **Expected:** Error messages are user-friendly if upload fails

- [ ] **Test:** View images
- [ ] **Expected:** Images load correctly
- [ ] **Expected:** No console errors

### 2. Security Headers in Browser
- [ ] **Test:** Open browser DevTools → Network tab
- [ ] **Test:** Make any API request
- [ ] **Test:** Check response headers
- [ ] **Expected:** Security headers are present (X-Content-Type-Options, etc.)

---

## 📝 Manual Verification Checklist

### Backend
- [ ] Server starts successfully
- [ ] No syntax errors in `server.js`
- [ ] No syntax errors in `errorHandler.js`
- [ ] Helmet middleware loads without errors
- [ ] Error responses follow new format

### Frontend
- [ ] No TypeScript compilation errors
- [ ] ProfilePage imports toast correctly
- [ ] No missing imports
- [ ] All components render without errors
- [ ] Toast notifications work

### Code Quality
- [ ] All debug code removed
- [ ] Code is properly formatted
- [ ] No linting errors

---

## 🐛 Known Issues / Notes

- If Helmet CSP blocks Cloudinary images, adjust CSP in `server.js`
- If toast notifications don't appear, check if `sonner` is properly configured
- If error format differs, check if frontend needs updates to handle new error structure

---

## ✅ Test Results

**Date:** _______________
**Tester:** _______________

**Backend Tests:** ___ / 4 passed
**Frontend Tests:** ___ / 6 passed
**Code Quality Tests:** ___ / 2 passed
**Integration Tests:** ___ / 2 passed

**Overall Status:** ☐ Pass ☐ Fail

**Notes:**
_________________________________________________
_________________________________________________
_________________________________________________


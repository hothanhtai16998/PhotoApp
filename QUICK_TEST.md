# Quick Test Guide - Phase 1 Verification

## ✅ Automated Checks (Already Done)

1. ✅ **No console.log statements** - Verified: None found in frontend/src
2. ✅ **No debug comments** - Verified: None found in frontend/src  
3. ✅ **Linter errors** - Verified: No linter errors in modified files
4. ✅ **Syntax check** - Run `node --check` on backend files

## 🧪 Manual Testing Steps

### Step 1: Test Backend Server
```bash
cd backend
npm run dev
```

**What to check:**
- [ ] Server starts without errors
- [ ] No Helmet-related errors
- [ ] MongoDB connects successfully
- [ ] Server logs show: "🚀 Server is running on port [PORT]"

**If errors occur:**
- Check `.env` file has all required variables
- Check MongoDB is running
- Check port is not already in use

---

### Step 2: Test Security Headers
Open browser DevTools → Network tab, then:
1. Make any API request (e.g., `http://localhost:5001/api/health`)
2. Check Response Headers

**Expected headers:**
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY` or `SAMEORIGIN`
- `Content-Security-Policy` (should include Cloudinary)

---

### Step 3: Test Error Handler
Try these requests:

**Test 1: Invalid signup (validation error)**
```bash
curl -X POST http://localhost:5001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"username":"ab","email":"invalid"}'
```

**Expected response:**
```json
{
  "success": false,
  "message": "Please check your input and try again",
  "errorCode": "VALIDATION_ERROR",
  "errors": [...]
}
```

**Test 2: Protected route without token**
```bash
curl http://localhost:5001/api/users/me
```

**Expected response:**
```json
{
  "success": false,
  "message": "Your session is invalid. Please sign in again.",
  "errorCode": "INVALID_TOKEN"
}
```

---

### Step 4: Test Frontend

```bash
cd frontend
npm run dev
```

**What to check:**
1. [ ] Frontend starts without errors
2. [ ] Open browser console - no errors
3. [ ] Navigate to `/profile` (must be logged in)
4. [ ] Click "Edit pins" button
   - [ ] Toast notification appears with message
5. [ ] Click "Update" in availability section
   - [ ] Toast notification appears with message

---

### Step 5: Test Build
```bash
cd frontend
npm run build
```

**What to check:**
- [ ] Build completes successfully
- [ ] No TypeScript errors
- [ ] No missing imports

---

## 🎯 Quick Verification Checklist

**Backend:**
- [ ] Server starts: `npm run dev` in backend folder
- [ ] Health check works: `curl http://localhost:5001/api/health`
- [ ] Error format is correct (check response structure)

**Frontend:**
- [ ] Dev server starts: `npm run dev` in frontend folder
- [ ] No console errors
- [ ] ProfilePage toast notifications work
- [ ] Build succeeds: `npm run build`

**Code Quality:**
- [ ] No console.log statements (verified ✅)
- [ ] No debug comments (verified ✅)
- [ ] Code formatted: `npm run format:check`

---

## 🐛 Troubleshooting

### Backend won't start
- Check `.env` file exists and has all variables
- Check MongoDB connection string
- Check port availability

### Helmet blocking resources
- Check CSP configuration in `server.js`
- Adjust `imgSrc` to include all needed domains

### Frontend build errors
- Check TypeScript version compatibility
- Check all imports are correct
- Run `npm install` again

### Toast notifications not showing
- Check `sonner` is installed
- Check toast provider is set up in root component
- Check browser console for errors

---

## ✅ Test Results Template

**Date:** _______________

**Backend:**
- Server starts: ☐ Yes ☐ No
- Security headers: ☐ Yes ☐ No
- Error handler: ☐ Yes ☐ No

**Frontend:**
- Dev server: ☐ Yes ☐ No
- ProfilePage: ☐ Yes ☐ No
- Build: ☐ Yes ☐ No

**Issues Found:**
_________________________________________________
_________________________________________________

**Ready for Phase 2:** ☐ Yes ☐ No


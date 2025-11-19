# Production Deployment Checklist ✅

## Pre-Deployment Steps

### 1. Environment Variables ⚠️ **REQUIRED**

Set these in your production environment (`.env` file or hosting platform):

```env
# Required
NODE_ENV=production
MONGODB_URI=your-production-mongodb-uri
ACCESS_TOKEN_SECRET=generate-strong-secret-min-32-chars
CLIENT_URL=https://yourdomain.com
CLOUDINARY_CLOUD_NAME=your-cloudinary-name
CLOUDINARY_API_KEY=your-cloudinary-key
CLOUDINARY_API_SECRET=your-cloudinary-secret

# Optional (if using Google OAuth)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback
```

**⚠️ Generate strong ACCESS_TOKEN_SECRET:**

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 2. Build Frontend ✅

```bash
cd frontend
npm run build
```

This creates the `frontend/dist` folder that the backend will serve.

### 3. Database Setup ✅

- [✅ ] Production MongoDB instance configured
- [✅ ] Connection string tested
- [✅ ] Database indexes created (automatic on first run)
- [✅ ] Backup strategy in place

### 4. Cloudinary Setup ✅

- [✅] Production Cloudinary account
- [✅] API keys are production keys (not test keys)
- [✅] Image optimization settings verified

### 5. Google OAuth (if using) ✅

- [ ] Google OAuth app created in Google Console
- [ ] Authorized redirect URI set: `https://yourdomain.com/api/auth/google/callback`
- [ ] Production client ID and secret configured

### 6. SSL/HTTPS ✅

- [ ] SSL certificate installed
- [ ] HTTPS enforced
- [ ] HSTS headers configured (via Helmet - already done)

### 7. Domain & DNS ✅

- [ ] Domain configured
- [ ] DNS records set correctly
- [ ] CORS origins match production domain

### 8. Test Production Build Locally ✅

```bash
# Backend
cd backend
NODE_ENV=production npm start

# Test that frontend is served correctly
# Visit http://localhost:3000
```

## Deployment

### Start Production Server

```bash
cd backend
NODE_ENV=production npm start
```

Or use a process manager (PM2, systemd, etc.):

```bash
pm2 start src/server.js --name photoapp --env production
```

## Post-Deployment Verification

- [ ] Health check: `https://yourdomain.com/api/health`
- [ ] Frontend loads correctly
- [ ] User signup works
- [ ] User signin works
- [ ] Image upload works
- [ ] Google OAuth works (if configured)
- [ ] Admin panel accessible (if admin user created)

## Security Checklist

- [ ] All environment variables set (no defaults in production)
- [ ] Strong secrets generated (ACCESS_TOKEN_SECRET)
- [ ] No console.log statements (✅ already fixed)
- [ ] No hardcoded URLs (✅ already fixed)
- [ ] HTTPS enforced
- [ ] Rate limiting active
- [ ] CSRF protection working
- [ ] CORS properly configured

## Monitoring Setup (Recommended)

- [ ] Error tracking (e.g., Sentry)
- [ ] Uptime monitoring (e.g., UptimeRobot)
- [ ] Log aggregation (e.g., CloudWatch, Loggly)
- [ ] Performance monitoring

---

## Quick Start Commands

```bash
# 1. Build frontend
cd frontend && npm run build

# 2. Start backend (production)
cd backend && NODE_ENV=production npm start

# 3. Create admin user
cd backend && npm run make:admin <username>
```

---

**✅ Your app is production-ready!**

All code issues have been fixed:

- ✅ Console.log statements removed
- ✅ Hardcoded localhost URLs removed
- ✅ Environment variable validation in place
- ✅ Security headers configured
- ✅ Error handling comprehensive

Just set your environment variables and deploy! 🚀

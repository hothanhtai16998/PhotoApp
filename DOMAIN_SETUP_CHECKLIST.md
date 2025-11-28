# Custom Domain Setup - Quick Checklist

Use this checklist to quickly set up your custom domain for PhotoApp.

## ✅ Pre-Setup
- [ ] Domain purchased and DNS access available
- [ ] AWS account with CloudFront distribution set up
- [ ] Backend server deployed and accessible
- [ ] SSL certificate ready (or will use AWS Certificate Manager)

## ✅ Step 1: DNS Configuration
- [ ] Point domain A record to CloudFront distribution
- [ ] Add CNAME for www subdomain (if using)
- [ ] Point API subdomain to backend server (if using separate subdomain)
- [ ] Wait for DNS propagation (check with `nslookup yourdomain.com`)

## ✅ Step 2: SSL Certificate
- [ ] Request certificate in AWS Certificate Manager (ACM)
  - Domain: `yourdomain.com`
  - Optional: `*.yourdomain.com` (wildcard)
- [ ] Validate certificate (DNS or email)
- [ ] Associate certificate with CloudFront distribution

## ✅ Step 3: Backend Environment Variables
Update `.env` file or hosting platform environment variables:
- [ ] `CLIENT_URL=https://yourdomain.com`
- [ ] `FRONTEND_URL=https://yourdomain.com`
- [ ] `AWS_CLOUDFRONT_URL=https://d1234567890.cloudfront.net` (your CloudFront URL)
- [ ] `GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback`
- [ ] Restart backend server

## ✅ Step 4: Frontend Environment Variables
Create `frontend/.env.production`:
- [ ] `VITE_API_URL=https://api.yourdomain.com` (if using API subdomain)
- [ ] OR leave empty if API is on same domain (uses relative `/api`)

## ✅ Step 5: CloudFront Configuration
- [ ] Update CloudFront CORS function with your domain
  - Edit `cloudfront-function-cors.js` allowedOrigins array
  - Add: `'https://yourdomain.com'` and `'https://www.yourdomain.com'` (if using www)
- [ ] Publish CloudFront function
- [ ] Associate function with distribution behavior
- [ ] Add custom domain to CloudFront Alternate Domain Names (CNAMEs)
- [ ] Select SSL certificate in CloudFront distribution
- [ ] Wait for CloudFront deployment (~15 minutes)

## ✅ Step 6: Google OAuth
- [ ] Go to Google Cloud Console → Credentials
- [ ] Add authorized redirect URI: `https://yourdomain.com/api/auth/google/callback`
- [ ] Add authorized JavaScript origin: `https://yourdomain.com`
- [ ] Save changes

## ✅ Step 7: Rebuild & Deploy
- [ ] Build frontend: `cd frontend && npm run build`
- [ ] Deploy frontend `dist/` folder to CloudFront/S3
- [ ] Verify backend is running with new environment variables

## ✅ Step 8: Testing
- [ ] Visit `https://yourdomain.com` - frontend loads
- [ ] Check browser console - no errors
- [ ] Test sign in functionality
- [ ] Test image upload
- [ ] Test Google OAuth login
- [ ] Check Network tab - API calls work
- [ ] Verify CORS headers present
- [ ] Test on mobile device
- [ ] SSL certificate shows as valid (green lock)

## ✅ Step 9: Final Verification
- [ ] HTTP redirects to HTTPS (if configured)
- [ ] www redirects to non-www (or vice versa, as preferred)
- [ ] All images load correctly
- [ ] No mixed content warnings
- [ ] Performance is good (check CloudFront cache)

## 🔧 Troubleshooting

**CORS Errors:**
- Verify CloudFront function is published
- Check backend `CLIENT_URL` matches exactly
- Clear browser cache

**API Not Found:**
- Check `VITE_API_URL` is correct
- Verify backend is accessible
- Check backend CORS configuration

**SSL Issues:**
- Wait for DNS propagation (up to 48 hours)
- Verify certificate is validated in ACM
- Check CloudFront is using correct certificate

---

**Quick Command Reference:**

```bash
# Check DNS propagation
nslookup yourdomain.com

# Build frontend
cd frontend && npm run build

# Check backend environment variables
# (depends on your hosting platform)
```

---

**Need the full guide?** See `CUSTOM_DOMAIN_SETUP.md`


# Custom Domain Setup Guide for PhotoApp

This guide will walk you through configuring your custom domain for PhotoApp.

## Prerequisites

- ✅ Custom domain purchased
- ✅ AWS account with S3 and CloudFront configured
- ✅ Backend server deployed (or deployment plan)
- ✅ Frontend build ready for deployment

---

## Step 1: DNS Configuration

### 1.1 Point Your Domain to Your Hosting

**If using AWS (recommended):**
- Go to AWS Route 53 (or your DNS provider)
- Create an A record or CNAME pointing to:
  - **Frontend**: Your CloudFront distribution domain (e.g., `d1234567890.cloudfront.net`)
  - **Backend API**: Your backend server IP or load balancer DNS

**DNS Records to Create:**
```
Type    Name              Value
A       @                 [Your CloudFront IP or ALIAS]
CNAME   www               [Your CloudFront domain]
A       api               [Your Backend Server IP]
```

**If using a subdomain for API:**
```
Type    Name              Value
A       @                 [Your CloudFront IP]
CNAME   api.yourdomain.com [Your Backend Server]
```

---

## Step 2: Update Environment Variables

### 2.1 Backend Environment Variables

Update your backend `.env` file (or environment variables in your hosting platform):

```env
# Replace with your actual domain
CLIENT_URL=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com

# If using CloudFront for assets
AWS_CLOUDFRONT_URL=https://d1234567890.cloudfront.net

# Update Google OAuth redirect URI
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback
```

**Important:** 
- Use `https://` (not `http://`)
- No trailing slash
- Include `www.` if you're using it (e.g., `https://www.yourdomain.com`)

### 2.2 Frontend Environment Variables

Create or update `.env.production` in the `frontend/` directory:

```env
# Production API URL (if using subdomain for API)
VITE_API_URL=https://api.yourdomain.com

# Or if API is on same domain, leave empty (uses relative /api)
# VITE_API_URL=
```

**Note:** If your API is served from the same domain as your frontend, you can leave `VITE_API_URL` empty as the frontend uses relative URLs (`/api`) in production.

---

## Step 3: Update CloudFront CORS Function

### 3.1 Update the CORS Function

1. Go to **AWS Console → CloudFront → Functions**
2. Find your CORS function (or create one using `cloudfront-function-cors.js`)
3. Update the `allowedOrigins` array:

```javascript
var allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://yourdomain.com',        // Add your domain
    'https://www.yourdomain.com'     // Add www version if using
];
```

4. **Publish** the function
5. Go to your **CloudFront Distribution → Behaviors → Edit**
6. Under **Function associations → Viewer response**, select your updated function

---

## Step 4: Update Backend CORS Configuration

The backend CORS is configured in `backend/src/server.js`. If you need to add your domain explicitly, update the CORS origin:

```javascript
origin: env.NODE_ENV === 'development' 
    ? ['http://localhost:3000', 'http://localhost:5173', env.CLIENT_URL].filter(Boolean)
    : [env.CLIENT_URL, env.FRONTEND_URL].filter(Boolean)
```

This should already work if `CLIENT_URL` and `FRONTEND_URL` are set correctly.

---

## Step 5: SSL Certificate Setup

### 5.1 AWS Certificate Manager (ACM)

1. Go to **AWS Certificate Manager**
2. Request a public certificate for:
   - `yourdomain.com`
   - `*.yourdomain.com` (wildcard, optional but recommended)
3. Validate the certificate via DNS or email
4. Once validated, go to your **CloudFront Distribution**
5. Edit the distribution → **General** tab
6. Under **SSL Certificate**, select your ACM certificate
7. Save changes

### 5.2 Alternative: Let's Encrypt

If not using AWS, use Let's Encrypt or your hosting provider's SSL certificate.

---

## Step 6: Update Google OAuth Settings

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services → Credentials**
3. Find your OAuth 2.0 Client ID
4. Add authorized redirect URIs:
   - `https://yourdomain.com/api/auth/google/callback`
5. Update authorized JavaScript origins:
   - `https://yourdomain.com`
6. Save changes

---

## Step 7: Rebuild and Redeploy

### 7.1 Frontend

```bash
cd frontend
npm run build
# Deploy the dist/ folder to your hosting/CDN
```

### 7.2 Backend

```bash
cd backend
# Restart your backend server to pick up new environment variables
# Or redeploy if using a platform like AWS Elastic Beanstalk, Heroku, etc.
```

---

## Step 8: Test Your Setup

### 8.1 Test Checklist

- [ ] Visit `https://yourdomain.com` - frontend loads
- [ ] Check browser console for errors
- [ ] Test API calls (sign in, load images, etc.)
- [ ] Test image uploads
- [ ] Test Google OAuth login
- [ ] Verify CORS headers in Network tab
- [ ] Test on mobile devices
- [ ] Check SSL certificate (should show as secure)

### 8.2 Common Issues

**CORS Errors:**
- Verify CloudFront function is published and associated
- Check backend `CLIENT_URL` matches your domain exactly
- Clear browser cache

**API Not Found:**
- Verify `VITE_API_URL` is set correctly (or empty if using same domain)
- Check backend is accessible at the configured URL

**SSL Certificate Issues:**
- Wait for DNS propagation (can take up to 48 hours)
- Verify certificate is validated in ACM
- Check CloudFront distribution is using the correct certificate

---

## Step 9: Update CloudFront Distribution (Optional)

### 9.1 Add Custom Domain to CloudFront

1. Go to **CloudFront → Distributions → Your Distribution**
2. Click **Edit**
3. Under **Alternate Domain Names (CNAMEs)**, add:
   - `yourdomain.com`
   - `www.yourdomain.com` (if using www)
4. Select your SSL certificate from ACM
5. Save and wait for distribution to deploy (~15 minutes)

---

## Step 10: Final Configuration

### 10.1 Update Any Hardcoded URLs

Search your codebase for any hardcoded localhost URLs:

```bash
# Search for localhost references
grep -r "localhost" frontend/src
grep -r "localhost" backend/src
```

### 10.2 Update Documentation

Update any documentation or README files with your new domain.

---

## Quick Reference: Environment Variables Summary

### Backend `.env`
```env
CLIENT_URL=https://yourdomain.com
FRONTEND_URL=https://yourdomain.com
AWS_CLOUDFRONT_URL=https://d1234567890.cloudfront.net
GOOGLE_REDIRECT_URI=https://yourdomain.com/api/auth/google/callback
```

### Frontend `.env.production`
```env
VITE_API_URL=https://api.yourdomain.com
# OR leave empty if API is on same domain
```

---

## Need Help?

If you encounter issues:
1. Check browser console for errors
2. Check Network tab for failed requests
3. Verify DNS propagation: `nslookup yourdomain.com`
4. Check CloudFront distribution status
5. Verify environment variables are set correctly

---

## Security Checklist

- [ ] SSL certificate installed and valid
- [ ] HTTPS redirect configured (HTTP → HTTPS)
- [ ] CORS configured correctly
- [ ] Environment variables secured (not in git)
- [ ] Google OAuth redirect URIs updated
- [ ] CloudFront security headers configured

---

**Last Updated:** $(date)
**Domain:** [Your Domain Here]


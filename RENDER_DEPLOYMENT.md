# Render Deployment Guide

This guide covers deploying the PhotoApp to Render and configuring Cloudflare R2 for public file access.

## Prerequisites

- Cloudflare account with R2 bucket created
- Render account
- Domain configured (optional, for custom R2 domain)

## Step 1: Configure Cloudflare R2 Bucket for Public Access

### Enable Public Access on R2 Bucket

1. **Go to Cloudflare Dashboard**
   - Navigate to R2 → Your Bucket

2. **Enable Public Access**
   - Click on "Settings" tab
   - Under "Public Access", click "Allow Access"
   - This enables public read access to your bucket

3. **Configure Custom Domain (Optional but Recommended)**
   - Go to "Settings" → "Public Access" → "Custom Domains"
   - Click "Connect Domain"
   - Enter your domain (e.g., `uploadanh.cloud`)
   - Follow DNS configuration instructions:
     - Add a CNAME record pointing to the R2 endpoint
     - Example: `uploadanh.cloud` → `[your-bucket-name].r2.cloudflarestorage.com`
   - Wait for DNS propagation (can take a few minutes to hours)

4. **Alternative: Use R2.dev Subdomain**
   - If you don't have a custom domain, R2 provides a public subdomain
   - Format: `https://pub-[account-id].r2.dev`
   - This is automatically available when public access is enabled

## Step 2: Configure Environment Variables on Render

### Required Environment Variables

Add these in your Render dashboard under your service → Environment:

#### Database
```
MONGODB_URI=your_mongodb_connection_string
```

#### Authentication
```
ACCESS_TOKEN_SECRET=your_secret_key_here
```

#### Frontend URL
```
CLIENT_URL=https://your-app.onrender.com
# Or your custom domain
# CLIENT_URL=https://yourdomain.com
```

#### Cloudflare R2 Storage (Required)
```
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET_NAME=your_bucket_name
R2_PUBLIC_URL=https://uploadanh.cloud
# OR if using R2.dev subdomain:
# R2_PUBLIC_URL=https://pub-[account-id].r2.dev
```

#### Optional Environment Variables
```
NODE_ENV=production
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM_NAME=PhotoApp
EMAIL_FROM=noreply@yourdomain.com
ARCJET_KEY=your_arcjet_key
ARCJET_ENV=production
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=https://your-app.onrender.com/api/auth/google/callback
ENABLE_GIF_TO_VIDEO=true
```

### How to Get R2 Credentials

1. **R2_ACCOUNT_ID**
   - Go to Cloudflare Dashboard → Right sidebar → "Account ID"
   - Copy the Account ID

2. **R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY**
   - Go to Cloudflare Dashboard → R2 → "Manage R2 API Tokens"
   - Click "Create API Token"
   - Select permissions: "Object Read & Write"
   - Select your bucket or "All Buckets"
   - Copy the Access Key ID and Secret Access Key
   - ⚠️ **Important**: Save the Secret Access Key immediately - you can't view it again!

3. **R2_BUCKET_NAME**
   - The name of your R2 bucket (e.g., `photo-app-storage`)

4. **R2_PUBLIC_URL**
   - If using custom domain: `https://uploadanh.cloud`
   - If using R2.dev subdomain: `https://pub-[account-id].r2.dev`
   - You can find the R2.dev URL in R2 → Your Bucket → Settings → Public Access

## Step 3: Verify R2 Configuration

### Test Public Access

1. **Upload a test file** to your R2 bucket via the app
2. **Check the URL** returned - it should be accessible
3. **Visit the URL directly** in a browser - it should display the image

### Common Issues and Solutions

#### Issue: Error 404 - Object not found

**Causes:**
- Public access not enabled on bucket
- Custom domain not properly configured
- Wrong R2_PUBLIC_URL in environment variables
- DNS not propagated yet

**Solutions:**
1. Verify public access is enabled:
   - R2 → Your Bucket → Settings → Public Access should show "Enabled"
2. Check custom domain configuration:
   - Verify DNS CNAME record is correct
   - Wait for DNS propagation (use `dig` or `nslookup` to check)
3. Verify R2_PUBLIC_URL:
   - Should match your custom domain or R2.dev subdomain exactly
   - No trailing slash
   - Include `https://` protocol
4. Test with R2.dev subdomain first:
   - Use `https://pub-[account-id].r2.dev` as R2_PUBLIC_URL
   - If this works, the issue is with custom domain configuration

#### Issue: CORS Errors

**Solution:**
- R2 buckets don't need CORS configuration like S3
- If you see CORS errors, check:
  - Frontend is using the correct R2_PUBLIC_URL
  - No CORS headers needed for R2 public buckets

#### Issue: Images not loading after deployment

**Check:**
1. Environment variables are set correctly on Render
2. R2_PUBLIC_URL matches the actual public URL
3. Bucket has public access enabled
4. Files were uploaded with correct paths

## Step 4: Render Build Configuration

### Backend Service

**Build Command:**
```bash
cd backend && npm install && npm run build
```

**Start Command:**
```bash
cd backend && npm start
```

**Environment:**
- Node: 18.x or higher

### Frontend Service (Static Site)

**Build Command:**
```bash
cd frontend && npm install && npm run build
```

**Publish Directory:**
```
frontend/dist
```

**Environment Variables:**
- Set `VITE_API_URL` to your backend URL (e.g., `https://your-backend.onrender.com`)

## Step 5: Post-Deployment Checklist

- [ ] R2 bucket has public access enabled
- [ ] Custom domain configured (if using)
- [ ] All environment variables set on Render
- [ ] Test image upload works
- [ ] Test image display works
- [ ] Check browser console for errors
- [ ] Verify CORS is working (if applicable)

## Troubleshooting

### Check R2 Public URL

```bash
# Test if R2 public URL is accessible
curl -I https://uploadanh.cloud/test-image.webp

# Should return 200 OK or 404 (if file doesn't exist, but URL is accessible)
# If returns 403, public access is not enabled
```

### Verify Environment Variables

On Render, check that all R2 variables are set:
- R2_ACCOUNT_ID
- R2_ACCESS_KEY_ID
- R2_SECRET_ACCESS_KEY
- R2_BUCKET_NAME
- R2_PUBLIC_URL

### Check Render Logs

1. Go to Render Dashboard → Your Service → Logs
2. Look for R2-related errors
3. Check if environment variables are being read correctly

### Test Locally First

Before deploying to Render, test with the same environment variables locally:
1. Create `.env` file with production values
2. Test upload and display
3. If it works locally, it should work on Render

## Additional Resources

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [Render Documentation](https://render.com/docs)
- [R2 Public Access Guide](https://developers.cloudflare.com/r2/buckets/public-buckets/)


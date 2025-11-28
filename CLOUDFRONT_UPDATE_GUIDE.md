# CloudFront CORS Configuration Guide

## Current Setup

This project uses **CloudFront Managed CORS Policies** instead of custom functions:

- **Behavior 0** (`/api/*`): Uses `Managed-CORS-With-Preflight` response headers policy → routes to `backend-api` origin
- **Behavior 1** (Default `*`): Uses `Managed-SimpleCORS` response headers policy → routes to `backend-api` origin

## ⚠️ Important: Image Behavior Required

**Images are stored in S3** but need a separate CloudFront behavior to route correctly. If you're seeing 403 errors for images, you need to add a behavior for image paths.

### Required Behavior Configuration

You need **3 behaviors** (in order of precedence):

1. **Behavior 0** (`/api/*`): 
   - Origin: `backend-api` (Render backend)
   - Response headers: `Managed-CORS-With-Preflight`

2. **Behavior 1** (`/photo-app-images/*`): ⚠️ **ADD THIS**
   - Origin: `photo-app-images-2026.s3.ap-southeast-2.amazonaws.com` (S3 bucket)
   - Response headers: `Managed-SimpleCORS` or custom CORS policy
   - Cache policy: `Managed-CachingOptimized` (images can be cached)

3. **Behavior 2** (Default `*`): ⚠️ **MUST stay as backend-api**
   - Origin: `backend-api` (Render backend) - **DO NOT change to S3!**
   - Response headers: `Managed-SimpleCORS`
   - **Why?** The backend serves your React app (HTML/JS/CSS) and handles SPA routing. Changing this to S3 will break your frontend.

## Configuring Managed CORS Policies

### Step 1: Open AWS CloudFront Console
1. Go to [AWS Console](https://console.aws.amazon.com/)
2. Navigate to **CloudFront** service
3. Click on **Distributions**
4. Select your distribution

### Step 2: Edit Behavior CORS Settings
1. Go to the **Behaviors** tab
2. Click **Edit** on the behavior you want to configure
3. Scroll down to **Response headers policy**
4. Select or create a CORS policy:
   - For API routes: Use `Managed-CORS-With-Preflight` (supports preflight OPTIONS requests)
   - For images/static content: Use `Managed-SimpleCORS` (simpler, faster)

### Step 3: Configure Allowed Origins (if using custom policy)
If you need to customize allowed origins:
1. Go to **Policies** > **Response headers**
2. Create a new policy or edit existing
3. Configure CORS settings:
   - **Access-Control-Allow-Origin**: Add your domains (`uploadanh.cloud`, `localhost:5173`, etc.)
   - **Access-Control-Allow-Methods**: `GET, POST, PUT, DELETE, PATCH, OPTIONS`
   - **Access-Control-Allow-Headers**: `Content-Type, Authorization, X-XSRF-TOKEN`
   - **Access-Control-Allow-Credentials**: `true` (if using cookies)

### Step 4: Wait for Deployment
- CloudFront changes can take 5-15 minutes to propagate
- Check the distribution's "Last modified" timestamp

## Verification
After deployment, test by:
1. Opening your site at `uploadanh.cloud`
2. Check browser console - CORS errors should be gone
3. Try logging in - refresh token should work
4. Verify images load correctly

## Troubleshooting

### 403 Errors for Images
If you see 403 errors when loading images:
1. **Check if image behavior exists**: Go to Behaviors tab and verify there's a behavior for `/photo-app-images/*`
2. **Create image behavior if missing**:
   - Click "Create behavior"
   - Path pattern: `/photo-app-images/*`
   - Origin: Select your S3 origin (e.g., `photo-app-images-2026.s3.ap-southeast-2.amazonaws.com`)
   - Response headers: `Managed-SimpleCORS`
   - Cache policy: `Managed-CachingOptimized`
   - **Important**: Set precedence to 1 (before default behavior)
3. **Verify S3 bucket permissions**: Ensure CloudFront has access to the S3 bucket (OAI or OAC configured)

### CORS Errors
If CORS errors persist:
  - Verify the managed policy is attached to the correct behavior
  - Check that allowed origins include your frontend domain
  - Ensure credentials are allowed if using cookies
  - Wait 15 minutes for CloudFront to propagate changes


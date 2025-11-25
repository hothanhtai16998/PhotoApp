# CloudFront CORS Configuration Guide

## The Problem
Your CloudFront distribution is blocking requests from `http://localhost:3000` because it's configured to only allow `http://localhost:5173`.

## Solution: Update Response Headers Policy

The "Cache key and origin requests" section you're looking at is **different** from where CORS origins are set. You need to find the **"Response headers policy"** section.

### Step-by-Step Instructions:

1. **Go to CloudFront Console** → Select your distribution
2. **Click on the "Behaviors" tab**
3. **Click "Edit" on your default behavior** (or the behavior that serves your images)
4. **Scroll down to find "Response headers policy"** section (it's below "Cache key and origin requests")
5. **You have two options:**

#### Option A: Use Managed Policy (Quick Fix)
   - Select **"CORS-With-Preflight"** or **"SimpleCORS"** from the dropdown
   - These managed policies allow **all origins** (`*`), which will work for both `localhost:3000` and `localhost:5173`
   - Click "Save changes"
   - Wait for distribution to deploy (~5-15 minutes)

#### Option B: Create Custom Policy (More Control)
   - Click **"Create policy"** or **"Create response headers policy"**
   - Name it: `Custom-CORS-Localhost`
   - Under **"CORS"** section:
     - **Access-Control-Allow-Origin**: Select "Specify origins"
       - Add: `http://localhost:3000`
       - Add: `http://localhost:5173`
     - **Access-Control-Allow-Methods**: `GET, HEAD, OPTIONS`
     - **Access-Control-Allow-Headers**: `*` (or specific headers)
     - **Access-Control-Max-Age**: `3600`
   - Save the policy
   - Go back to your behavior and select the new custom policy
   - Click "Save changes"
   - Wait for distribution to deploy

### Alternative: Use AWS CLI or SDK

If you prefer to do this programmatically, you can use the CloudFront SDK. However, the managed "CORS-With-Preflight" policy should work immediately if you select it in the Response headers policy section.

### Important Notes:

- **"Cache key and origin requests"** ≠ **"Response headers policy"**
- The managed policies like "CORS-With-Preflight" allow all origins (`*`), which should fix your issue
- Changes take 5-15 minutes to deploy
- After deployment, clear your browser cache or test in incognito mode

### Verify It's Working:

After the distribution deploys, check the browser console. The CORS errors should be gone. You can also check the response headers:

```bash
curl -I -H "Origin: http://localhost:3000" https://your-cloudfront-url/image.jpg
```

You should see `Access-Control-Allow-Origin: *` or your specific origin in the response headers.


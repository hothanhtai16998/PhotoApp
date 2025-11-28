# Step-by-Step Guide: Setting Up uploadanh.cloud

This is your complete step-by-step guide to configure `uploadanh.cloud` for PhotoApp.

---

## STEP 1: Point Your Domain to CloudFront (DNS Configuration)

### Where to do this:
Go to where you bought your domain (Namecheap, GoDaddy, Cloudflare, etc.) and find the DNS settings.

### What to do:
1. Find your **CloudFront distribution domain** (looks like: `d1234567890.cloudfront.net`)
   - Go to AWS Console → CloudFront → Distributions
   - Copy the domain name (e.g., `d1234567890.cloudfront.net`)

2. In your domain's DNS settings, add these records:

   **Option A: Using A Record (if CloudFront gives you an IP)**
   ```
   Type: A
   Name: @ (or leave blank)
   Value: [CloudFront IP address]
   TTL: 3600 (or default)
   ```

   **Option B: Using CNAME (Recommended)**
   ```
   Type: CNAME
   Name: @ (or leave blank, or use "www")
   Value: d1234567890.cloudfront.net (your CloudFront domain)
   TTL: 3600
   ```

   **Note:** Some registrars don't allow CNAME on root domain (@). If that's the case:
   - Use A record with CloudFront IP, OR
   - Use a subdomain like `www.uploadanh.cloud` with CNAME

3. **Save** the DNS records

4. **Wait 5-30 minutes** for DNS to propagate
   - Test with: `nslookup uploadanh.cloud` or visit `https://www.whatsmydns.net`

---

## STEP 2: Get SSL Certificate (HTTPS)

### Where to do this:
AWS Certificate Manager (ACM)

### What to do:
1. Go to **AWS Console** → **Certificate Manager** (search "Certificate Manager")
2. Click **"Request a certificate"**
3. Choose **"Request a public certificate"**
4. Enter domain names:
   - `uploadanh.cloud`
   - `*.uploadanh.cloud` (optional, for subdomains)
5. Choose **"DNS validation"** (recommended)
6. Click **"Request"**
7. AWS will show you DNS records to add:
   - Go back to your domain DNS settings
   - Add the CNAME records AWS provides (for validation)
8. Wait for validation (usually 5-30 minutes)
9. Once status shows **"Issued"**, you're ready!

**Important:** Request the certificate in the **same AWS region** as your CloudFront distribution (usually `us-east-1`)

---

## STEP 3: Update CloudFront Distribution

### Where to do this:
AWS CloudFront Console

### What to do:
1. Go to **AWS Console** → **CloudFront** → **Distributions**
2. Click on your distribution
3. Click **"Edit"**
4. Scroll to **"Alternate domain names (CNAMEs)"**
   - Click **"Add item"**
   - Enter: `uploadanh.cloud`
   - If using www: also add `www.uploadanh.cloud`
5. Scroll to **"Custom SSL certificate"**
   - Select the certificate you created in Step 2
6. Scroll down and click **"Save changes"**
7. **Wait 15-30 minutes** for CloudFront to deploy

---

## STEP 4: Update CloudFront CORS Function

### Where to do this:
AWS CloudFront → Functions

### What to do:
1. Go to **AWS Console** → **CloudFront** → **Functions**
2. Find your CORS function (or create a new one)
3. Click **"Edit"**
4. Replace the code with this (I'll update the file for you):

```javascript
function handler(event) {
    var request = event.request;
    var response = event.response;
    var headers = response.headers;
    
    var origin = request.headers.origin ? request.headers.origin.value : '*';
    
    var allowedOrigins = [
        'http://localhost:3000',
        'http://localhost:5173',
        'https://uploadanh.cloud',
        'https://www.uploadanh.cloud'
    ];
    
    var allowOrigin = '*';
    if (origin && origin !== 'null') {
        if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            allowOrigin = origin;
        } else if (allowedOrigins.includes(origin)) {
            allowOrigin = origin;
        }
    }
    
    headers['access-control-allow-origin'] = { value: allowOrigin };
    headers['access-control-allow-methods'] = { value: 'GET, HEAD, OPTIONS' };
    headers['access-control-allow-headers'] = { value: '*' };
    headers['access-control-max-age'] = { value: '3600' };
    
    if (request.method === 'OPTIONS') {
        return {
            statusCode: 204,
            statusDescription: 'No Content',
            headers: headers
        };
    }
    
    return response;
}
```

5. Click **"Save changes"**
6. Click **"Publish"**
7. Go back to your **CloudFront Distribution** → **Behaviors**
8. Click **"Edit"** on your behavior
9. Scroll to **"Function associations"**
10. Under **"Viewer response"**, select your CORS function
11. Click **"Save changes"**

---

## STEP 5: Update Backend Environment Variables

### Where to do this:
Your backend hosting platform (AWS, Heroku, Railway, etc.) or `.env` file

### What to do:
Update these environment variables with these **exact values**:

```env
CLIENT_URL=https://uploadanh.cloud
FRONTEND_URL=https://uploadanh.cloud
GOOGLE_REDIRECT_URI=https://uploadanh.cloud/api/auth/google/callback
```

**If you have AWS_CLOUDFRONT_URL, keep it as is** (it's your CloudFront domain)

### How to update:
- **If using `.env` file**: Edit the file and restart your backend
- **If using hosting platform**: Go to environment variables settings and update them
- **After updating**: Restart your backend server

---

## STEP 6: Update Frontend Environment Variables

### Where to do this:
Create a file in your `frontend/` folder

### What to do:
1. Create a file: `frontend/.env.production`
2. Add this content:

```env
# Leave empty if API is on same domain (recommended)
# The frontend will use relative URLs (/api)
VITE_API_URL=
```

**OR** if your API is on a different subdomain (like `api.uploadanh.cloud`):

```env
VITE_API_URL=https://api.uploadanh.cloud
```

**Note:** Since your frontend uses relative URLs (`/api`) in production, you can leave `VITE_API_URL` empty if your backend serves the API from the same domain.

3. **Save** the file

---

## STEP 7: Update Google OAuth Settings

### Where to do this:
Google Cloud Console

### What to do:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Find your **OAuth 2.0 Client ID** (the one you're using for PhotoApp)
4. Click **"Edit"**
5. Under **"Authorized JavaScript origins"**, click **"Add URI"**:
   - Add: `https://uploadanh.cloud`
   - If using www: also add `https://www.uploadanh.cloud`
6. Under **"Authorized redirect URIs"**, click **"Add URI"**:
   - Add: `https://uploadanh.cloud/api/auth/google/callback`
7. Click **"Save"**

---

## STEP 8: Rebuild and Deploy Frontend

### Where to do this:
Your local computer or CI/CD pipeline

### What to do:
1. Open terminal in your project folder
2. Run these commands:

```bash
cd frontend
npm run build
```

3. **Deploy the `frontend/dist/` folder** to:
   - Your CloudFront S3 bucket, OR
   - Your hosting platform

4. **Clear CloudFront cache** (if using CloudFront):
   - Go to CloudFront → Your Distribution
   - Click **"Invalidations"** → **"Create invalidation"**
   - Enter: `/*`
   - Click **"Create invalidation"**

---

## STEP 9: Test Everything

### Test Checklist:

1. **Visit your domain:**
   - Open browser: `https://uploadanh.cloud`
   - Should load your PhotoApp frontend
   - Check for green lock icon (SSL working)

2. **Check browser console:**
   - Press F12 → Console tab
   - Should see no red errors

3. **Test sign in:**
   - Try signing in with username/password
   - Should work without errors

4. **Test Google OAuth:**
   - Click "Sign in with Google"
   - Should redirect to Google and back
   - Should successfully sign you in

5. **Test image upload:**
   - Upload an image
   - Should work without CORS errors

6. **Check Network tab:**
   - Press F12 → Network tab
   - Look for API calls to `/api/...`
   - Should all return 200 status (green)

---

## STEP 10: Troubleshooting

### Problem: "Site can't be reached" or DNS error
**Solution:**
- Wait longer for DNS propagation (can take up to 48 hours)
- Check DNS with: `nslookup uploadanh.cloud`
- Verify DNS records are correct in your domain registrar

### Problem: "Not Secure" or SSL error
**Solution:**
- Verify SSL certificate is issued in ACM
- Check CloudFront is using the certificate
- Wait for CloudFront deployment to complete

### Problem: CORS errors in browser console
**Solution:**
- Verify CloudFront CORS function is published
- Check backend `CLIENT_URL` is exactly `https://uploadanh.cloud` (no trailing slash)
- Clear browser cache
- Check Network tab → Headers → should see `access-control-allow-origin`

### Problem: API calls fail (404 or network error)
**Solution:**
- Check backend is running
- Verify `VITE_API_URL` is set correctly (or empty if using same domain)
- Check backend CORS allows your domain

### Problem: Google OAuth doesn't work
**Solution:**
- Verify redirect URI in Google Console matches exactly: `https://uploadanh.cloud/api/auth/google/callback`
- Check backend `GOOGLE_REDIRECT_URI` matches
- Clear browser cookies and try again

---

## Quick Reference: All Values for uploadanh.cloud

### Backend Environment Variables:
```env
CLIENT_URL=https://uploadanh.cloud
FRONTEND_URL=https://uploadanh.cloud
GOOGLE_REDIRECT_URI=https://uploadanh.cloud/api/auth/google/callback
```

### Frontend Environment Variables:
```env
# frontend/.env.production
VITE_API_URL=
```

### CloudFront CORS Allowed Origins:
- `https://uploadanh.cloud`
- `https://www.uploadanh.cloud` (if using www)

### Google OAuth:
- Authorized origin: `https://uploadanh.cloud`
- Redirect URI: `https://uploadanh.cloud/api/auth/google/callback`

---

## Summary Checklist

- [ ] DNS pointed to CloudFront
- [ ] SSL certificate requested and validated
- [ ] CloudFront distribution updated with domain and certificate
- [ ] CloudFront CORS function updated and published
- [ ] Backend environment variables updated
- [ ] Frontend `.env.production` created
- [ ] Google OAuth settings updated
- [ ] Frontend rebuilt and deployed
- [ ] Everything tested and working

---

**Need help?** Check the troubleshooting section or verify each step was completed correctly.


# CloudFront Function CORS Setup (Works on Free Plan!)

Since you can't use custom Response Headers Policies (requires Business plan), we'll use a **CloudFront Function** which works on all plans, including the free tier.

## Step-by-Step Instructions:

### 1. Create the CloudFront Function

1. Go to **AWS Console** → **CloudFront** → **Functions** (in the left sidebar)
2. Click **"Create function"**
3. Name it: `add-cors-headers`
4. Paste the code from `cloudfront-function-cors.js` into the function editor
5. Click **"Save changes"**
6. Click **"Publish"** to deploy the function

### 2. Attach Function to Your Distribution

1. Go to **CloudFront** → **Distributions** → Select your distribution
2. Click on the **"Behaviors"** tab
3. Click **"Edit"** on your default behavior (or the behavior serving images)
4. Scroll down to **"Function associations"** section
5. Under **"Viewer response"**, select your function: `add-cors-headers`
6. Click **"Save changes"**
7. Wait for distribution to deploy (~5-15 minutes)

### 3. Alternative: Update the Function Code

If you need to add more origins later, edit the function and update the `allowedOrigins` array:

```javascript
var allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://your-production-domain.com'
];
```

After editing, click **"Publish"** again.

## How It Works:

- The function intercepts responses from CloudFront
- It adds CORS headers dynamically based on the request origin
- For localhost origins, it echoes back the exact origin (required by browsers)
- For other origins, it checks against the allowed list
- Handles OPTIONS preflight requests automatically

## Verify It's Working:

After deployment (5-15 minutes), test in your browser:
1. Open DevTools → Network tab
2. Load an image from CloudFront
3. Check the response headers - you should see:
   - `access-control-allow-origin: http://localhost:3000`
   - `access-control-allow-methods: GET, HEAD, OPTIONS`

The CORS errors in the console should disappear!

## Troubleshooting:

- **Function not working?** Make sure it's published (not just saved)
- **Still getting CORS errors?** Clear browser cache or test in incognito
- **Need to add more origins?** Edit the function and add to `allowedOrigins` array, then publish again


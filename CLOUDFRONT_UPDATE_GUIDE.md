# CloudFront Function Update Guide

## Step-by-Step Instructions

### Step 1: Open AWS CloudFront Console
1. Go to [AWS Console](https://console.aws.amazon.com/)
2. Navigate to **CloudFront** service
3. Click on **Functions** in the left sidebar

### Step 2: Find Your CORS Function
- Look for your existing CORS function (it might be named something like "CORS-Function" or "cors-headers")
- If you don't have one, click **Create function** and name it (e.g., "CORS-Function")

### Step 3: Edit the Function
1. Click on your function name to open it
2. Click **Edit** button
3. In the code editor, **select all** (Ctrl+A / Cmd+A) and **delete** the old code
4. **Copy the entire content** from `cloudfront-function-cors.js` file
5. **Paste** it into the CloudFront function editor

### Step 4: Publish the Function
1. Click **Save changes**
2. Click **Publish** button (this makes it live)
3. Confirm the publish action

### Step 5: Associate Function with Distribution (if not already done)
1. Go to **Distributions** in CloudFront
2. Click on your distribution (the one serving `uploadanh.cloud`)
3. Go to the **Behaviors** tab
4. Click **Edit** on your default behavior (or the behavior handling your API)
5. Scroll down to **Function associations**
6. Under **Viewer response**, select your CORS function from the dropdown
7. Click **Save changes**

### Step 6: Wait for Deployment
- CloudFront changes can take 5-15 minutes to propagate
- You can check the status in the distribution's "Last modified" timestamp

## Verification
After deployment, test by:
1. Opening your site at `uploadanh.cloud`
2. Check browser console - 403 errors should be gone
3. Try logging in - refresh token should work

## Troubleshooting
- If errors persist after 15 minutes, check that:
  - Function is published (not just saved)
  - Function is associated with the correct behavior
  - Distribution is deployed (check "Last modified" time)


# AWS CloudFront CDN Setup Guide

This guide will help you set up AWS CloudFront CDN for faster global image delivery in your Photo App.

## Prerequisites

- AWS account with S3 bucket already configured
- S3 bucket name and region
- AWS credentials (Access Key ID and Secret Access Key)

## Step 1: Create CloudFront Distribution

### 1.1 Navigate to CloudFront Console

1. Log in to [AWS Console](https://console.aws.amazon.com/)
2. Go to **CloudFront** service (search for "CloudFront" in the search bar)
3. Click **Create Distribution**

### 1.2 Configure Origin Settings

**Origin Domain:**
- Select your S3 bucket from the dropdown
- Format: `your-bucket-name.s3.region.amazonaws.com`
- Or use the S3 website endpoint if you have one

**Origin Path:**
- Leave empty (unless your images are in a specific subfolder)

**Name:**
- Auto-generated (you can customize it)

**Origin Access:**
- Select **Origin access control settings (recommended)**
- Click **Create control setting**
  - Name: `photo-app-s3-access`
  - Origin type: `S3`
  - Signing behavior: `Sign requests`
  - Click **Create**
- Select the newly created control setting

**Origin Shield:**
- Leave as default (optional, for additional caching layer)

### 1.3 Configure Default Cache Behavior

**Viewer Protocol Policy:**
- Select **Redirect HTTP to HTTPS** (recommended for security)

**Allowed HTTP Methods:**
- Select **GET, HEAD, OPTIONS** (default is fine for images)

**Cache Policy:**
- Select **CachingOptimized** (recommended for images)
- Or create a custom policy:
  - Cache key settings: Include all query strings and headers
  - TTL settings:
    - Default TTL: `86400` (1 day)
    - Max TTL: `31536000` (1 year)
    - Min TTL: `0`

**Origin Request Policy:**
- Select **None** (or create custom if needed)

**Response Headers Policy:**
- Select **CORS-Customize** or create custom:
  - Add CORS headers if needed
  - Add `Cache-Control` headers

### 1.4 Configure Distribution Settings

**Price Class:**
- Select based on your needs:
  - **Use all edge locations (best performance)** - Most expensive
  - **Use only North America and Europe** - Balanced
  - **Use only North America** - Cheapest

**Alternate Domain Names (CNAMEs):**
- Optional: Add custom domain (e.g., `cdn.yourdomain.com`)
- Requires SSL certificate setup

**SSL Certificate:**
- **Default CloudFront certificate** (if using CloudFront domain)
- **Custom SSL certificate** (if using custom domain)

**Default Root Object:**
- Leave empty (not needed for image CDN)

**Comment:**
- Optional: "Photo App Image CDN"

**Logging:**
- Optional: Enable logging for analytics

### 1.5 Review and Create

1. Review all settings
2. Click **Create Distribution**
3. Wait 5-15 minutes for distribution to deploy (status will show "Deploying")

## Step 2: Update S3 Bucket Policy

After creating the CloudFront distribution, you need to update your S3 bucket policy to allow CloudFront access.

### 2.1 Get CloudFront Origin Access Identity

1. In CloudFront console, select your distribution
2. Go to **Origins** tab
3. Click on your origin
4. Note the **Origin access control** name

### 2.2 Update S3 Bucket Policy

1. Go to **S3 Console**
2. Select your bucket
3. Go to **Permissions** tab
4. Click **Bucket Policy**
5. Add or update the policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowCloudFrontServicePrincipal",
      "Effect": "Allow",
      "Principal": {
        "Service": "cloudfront.amazonaws.com"
      },
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::YOUR-BUCKET-NAME/*",
      "Condition": {
        "StringEquals": {
          "AWS:SourceArn": "arn:aws:cloudfront::YOUR-ACCOUNT-ID:distribution/YOUR-DISTRIBUTION-ID"
        }
      }
    }
  ]
}
```

**Replace:**
- `YOUR-BUCKET-NAME` with your actual bucket name
- `YOUR-ACCOUNT-ID` with your AWS account ID
- `YOUR-DISTRIBUTION-ID` with your CloudFront distribution ID

**To find Distribution ID:**
- In CloudFront console, it's shown in the distribution list (format: `E1234567890ABC`)

**To find Account ID:**
- Click your username in top-right → Account ID is shown

## Step 3: Get CloudFront Distribution URL

1. In CloudFront console, select your distribution
2. Copy the **Distribution domain name**
   - Format: `d1234567890abc.cloudfront.net`
3. This is your CloudFront URL

## Step 4: Update Environment Variables

Add the CloudFront URL to your `.env` file:

```env
AWS_CLOUDFRONT_URL=https://d1234567890abc.cloudfront.net
```

**Important:**
- Include `https://` protocol
- Do NOT include trailing slash `/`
- Use the full distribution domain name

## Step 5: Verify Setup

### 5.1 Test Image URLs

1. Upload a new image through your app
2. Check the image URL in your database or response
3. The URL should now start with your CloudFront domain instead of S3

**Before (S3 direct):**
```
https://your-bucket.s3.region.amazonaws.com/photo-app-images/image-123-original.webp
```

**After (CloudFront):**
```
https://d1234567890abc.cloudfront.net/photo-app-images/image-123-original.webp
```

### 5.2 Test Performance

1. Use browser DevTools → Network tab
2. Load an image
3. Check response headers:
   - Should see `X-Cache: Hit from cloudfront` (after first load)
   - Response time should be faster

### 5.3 Test from Different Locations

- Use online tools like [WebPageTest](https://www.webpagetest.org/) to test from different regions
- Images should load faster from edge locations

## Step 6: Invalidate Cache (Optional)

If you need to update existing images immediately:

1. Go to CloudFront console
2. Select your distribution
3. Go to **Invalidations** tab
4. Click **Create invalidation**
5. Enter paths:
   - `/*` (all files) - Use carefully, costs money
   - `/photo-app-images/*` (specific folder)
   - `/photo-app-images/image-123-*` (specific image)
6. Click **Create invalidation**

**Note:** Invalidations cost money after the first 1,000 paths per month (free tier).

## Troubleshooting

### Images not loading through CloudFront

1. **Check S3 bucket policy** - Make sure CloudFront has access
2. **Check CloudFront distribution status** - Should be "Deployed"
3. **Check environment variable** - Verify `AWS_CLOUDFRONT_URL` is set correctly
4. **Check image URLs** - Should use CloudFront domain, not S3

### CORS errors

**Solution: Configure CloudFront Response Headers Policy**

1. **Go to CloudFront Console → Policies → Response headers**
2. **Click "Create response headers policy"**
3. **Configure CORS:**
   - **Name:** `photo-app-cors-policy`
   - **CORS configuration:**
     - **Access-Control-Allow-Origin:** 
       - For development: `http://localhost:5173`
       - For production: Your domain (e.g., `https://yourdomain.com`)
       - Or use `*` to allow all origins (less secure)
     - **Access-Control-Allow-Methods:** `GET, HEAD, OPTIONS`
     - **Access-Control-Allow-Headers:** `*` (or specific: `Content-Type, Authorization`)
     - **Access-Control-Max-Age:** `86400` (24 hours)
     - **Access-Control-Allow-Credentials:** `false` (set to `true` only if needed)
4. **Save the policy**
5. **Attach to your distribution:**
   - Go to your distribution → **Behaviors** tab
   - Click **Edit** on the default behavior
   - Under **Response headers policy**, select `photo-app-cors-policy`
   - Click **Save changes**
6. **Wait for deployment** (5-15 minutes)
7. **Test again** - CORS errors should be resolved

**Alternative:** Update S3 bucket CORS configuration (if CloudFront passes through headers)

### Images still using S3 URLs

1. **New uploads:** Check that `AWS_CLOUDFRONT_URL` is in your `.env` file
2. **Existing images:** Old images in database still have S3 URLs
   - Option 1: Wait for natural cache expiration
   - Option 2: Create database migration to update URLs
   - Option 3: Invalidate CloudFront cache

### High CloudFront costs

1. **Review Price Class** - Use regional edge locations if global isn't needed
2. **Optimize cache settings** - Increase TTL to reduce origin requests
3. **Monitor usage** - Check CloudFront metrics in AWS Console

## Cost Considerations

### CloudFront Pricing (as of 2024)

- **Data Transfer Out:**
  - First 10 TB/month: $0.085 per GB
  - Next 40 TB/month: $0.080 per GB
  - Next 100 TB/month: $0.060 per GB
  - Over 150 TB/month: $0.040 per GB

- **HTTP/HTTPS Requests:**
  - First 10 million: $0.0075 per 10,000
  - Over 10 million: $0.0070 per 10,000

- **Invalidation:**
  - First 1,000 paths/month: Free
  - Additional: $0.005 per path

### Cost Optimization Tips

1. Use appropriate **Price Class** for your audience
2. Set proper **Cache TTL** to reduce origin requests
3. Use **CloudFront compression** (enabled by default)
4. Monitor usage in **CloudWatch** metrics

## Additional Optimizations

### Enable Compression

CloudFront compresses responses by default, but you can optimize:

1. In CloudFront distribution → **Behaviors** tab
2. Edit behavior
3. Under **Compress objects automatically**: **Yes** (default)

### Custom Cache Headers

Your code already sets cache headers in `s3.js`:
```javascript
CacheControl: 'public, max-age=31536000' // Cache for 1 year
```

CloudFront will respect these headers.

### Multiple Distributions

For different content types:
- One distribution for images
- One distribution for static assets (if needed)
- Different cache policies for each

## Next Steps

After CloudFront is set up:

1. ✅ Monitor CloudFront metrics in AWS Console
2. ✅ Set up CloudWatch alarms for high usage
3. ✅ Consider adding custom domain (optional)
4. ✅ Update existing image URLs in database (if needed)

## Support

If you encounter issues:
1. Check AWS CloudFront documentation
2. Review CloudFront distribution logs
3. Test with a simple image URL directly

---

**Note:** Your code in `backend/src/libs/s3.js` already supports CloudFront. Once you add `AWS_CLOUDFRONT_URL` to your `.env` file, all new image uploads will automatically use CloudFront URLs!


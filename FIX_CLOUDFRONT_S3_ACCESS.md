# Fix CloudFront S3 Access Denied Error

The "Access Denied" error means CloudFront can't access your S3 bucket. Here's how to fix it.

---

## Option 1: Use Origin Access Control (OAC) - Recommended

### Step 1: Create Origin Access Control in CloudFront

1. Go to **AWS Console** → **CloudFront** → **Policies** → **Origin access**
2. Click **"Create origin access control"**
3. Fill in:
   - **Name:** `photo-app-oac` (or any name)
   - **Description:** `Origin Access Control for PhotoApp S3 bucket`
   - **Signing behavior:** `Sign requests`
   - **Origin type:** `S3`
4. Click **"Create"**
5. **Copy the OAC ID** (you'll need it in Step 3)

### Step 2: Update CloudFront Distribution Origin

1. Go to **CloudFront** → **Distributions** → Your distribution
2. Click **"Origins"** tab
3. Click on your S3 origin
4. Click **"Edit"**
5. Under **"Origin access"**, select:
   - **"Origin access control settings (recommended)"**
   - Select the OAC you just created
6. Click **"Save changes"**

### Step 3: Update S3 Bucket Policy

1. Go to **AWS Console** → **S3** → Your bucket
2. Click **"Permissions"** tab
3. Scroll to **"Bucket policy"**
4. Click **"Edit"**
5. Replace the policy with this (update the values):

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
            "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/*",
            "Condition": {
                "StringEquals": {
                    "AWS:SourceArn": "arn:aws:cloudfront::YOUR_ACCOUNT_ID:distribution/YOUR_DISTRIBUTION_ID"
                }
            }
        }
    ]
}
```

**Replace:**
- `YOUR_BUCKET_NAME` with your S3 bucket name
- `YOUR_ACCOUNT_ID` with your AWS account ID (e.g., `186566932632`)
- `YOUR_DISTRIBUTION_ID` with your CloudFront distribution ID (e.g., `EIBWPCWIAEHXF`)

6. Click **"Save changes"**

### Step 4: Wait for CloudFront to Deploy

- CloudFront will redeploy (15-30 minutes)
- After deployment, test `https://uploadanh.cloud` again

---

## Option 2: Make S3 Bucket Public (Not Recommended for Security)

**Only use this if Option 1 doesn't work:**

1. Go to **S3** → Your bucket → **Permissions**
2. Under **"Block public access"**, click **"Edit"**
3. **Uncheck all** the block public access settings
4. Click **"Save changes"**
5. Under **"Bucket policy"**, add:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::YOUR_BUCKET_NAME/*"
        }
    ]
}
```

**⚠️ Warning:** This makes your bucket publicly readable. Only use if you're serving public content.

---

## Quick Check: What's Your CloudFront Origin?

1. Go to **CloudFront** → **Distributions** → Your distribution
2. Click **"Origins"** tab
3. Check what your origin is:
   - Is it pointing to an S3 bucket?
   - Or is it pointing to a custom origin (like your backend server)?

**If it's pointing to your backend server**, then the issue is different - your backend might not be serving the frontend files correctly.

---

## Troubleshooting

### If you see "Access Denied" after fixing:

1. **Wait 15-30 minutes** for CloudFront to deploy
2. **Clear CloudFront cache:**
   - CloudFront → Your distribution → **Invalidations**
   - Create invalidation: `/*`
3. **Check S3 bucket name** matches exactly
4. **Verify OAC is attached** to the origin

### If your frontend is in a different location:

If your frontend files are NOT in S3, but served by your backend:
- The CloudFront origin should point to your backend server
- Make sure your backend is serving the frontend files from the `dist/` folder

---

**Need help?** Share:
1. What your CloudFront origin is pointing to (S3 or custom origin)
2. Your S3 bucket name
3. Your CloudFront distribution ID


# AWS S3 Setup Guide for PhotoAppWeb

This guide will help you set up AWS S3 to replace Cloudinary for image storage.

## Prerequisites

1. AWS Account (free tier available)
2. AWS CLI installed (optional, for easier setup)

## Step 1: Create S3 Bucket

1. Go to [AWS S3 Console](https://s3.console.aws.amazon.com/)
2. Click "Create bucket"
3. Configure:
   - **Bucket name**: `your-photo-app-bucket` (must be globally unique)
   - **Region**: Choose closest to your users (e.g., `us-east-1`, `ap-southeast-1`)
   - **Block Public Access**: Uncheck "Block all public access" (we need public read access)
   - **Bucket Versioning**: Disable (optional)
   - **Default encryption**: Enable (recommended)
4. Click "Create bucket"

## Step 2: Configure Bucket Permissions

1. Go to your bucket → **Permissions** tab
2. **Bucket Policy** → Edit and add:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::your-photo-app-bucket/*"
        }
    ]
}
```

Replace `your-photo-app-bucket` with your actual bucket name.

3. **CORS Configuration** → Edit and add:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": ["ETag"],
        "MaxAgeSeconds": 3000
    }
]
```

## Step 3: Create IAM User for S3 Access

1. Go to [IAM Console](https://console.aws.amazon.com/iam/)
2. **Users** → **Create user**
3. User name: `photo-app-s3-user`
4. **Attach policies directly** → Search and select:
   - `AmazonS3FullAccess` (or create custom policy with only needed permissions)
5. Click "Create user"
6. **Security credentials** tab → **Create access key**
7. Choose "Application running outside AWS"
8. **Download** or copy:
   - Access Key ID
   - Secret Access Key (only shown once!)

## Step 4: Set Up CloudFront (Optional but Recommended)

CloudFront CDN will:
- Speed up image delivery globally
- Reduce S3 bandwidth costs
- Provide HTTPS

1. Go to [CloudFront Console](https://console.aws.amazon.com/cloudfront/)
2. **Create distribution**
3. Configure:
   - **Origin domain**: Select your S3 bucket
   - **Origin access**: Use website endpoint (or OAC for better security)
   - **Viewer protocol policy**: Redirect HTTP to HTTPS
   - **Allowed HTTP methods**: GET, HEAD, OPTIONS
   - **Price class**: Use all edge locations (or cheapest for testing)
4. Click "Create distribution"
5. Wait 5-15 minutes for deployment
6. Copy the **Distribution domain name** (e.g., `d1234abcd.cloudfront.net`)

## Step 5: Environment Variables

Add these to your `.env` file in the `backend` folder:

```env
# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_S3_BUCKET_NAME=your-photo-app-bucket

# Optional: CloudFront CDN URL (if you set it up)
AWS_CLOUDFRONT_URL=https://d1234abcd.cloudfront.net
```

**Important**: 
- Replace all placeholder values with your actual values
- Never commit `.env` file to Git
- Use different credentials for production

## Step 6: Test the Setup

1. Start your backend server:
   ```bash
   cd backend
   npm start
   ```

2. Try uploading an image through your app

3. Check S3 bucket - you should see:
   - `photo-app-images/` folder with uploaded images
   - Multiple sizes: `-thumbnail.webp`, `-small.webp`, `-regular.webp`, `-original.webp`

## Cost Estimation

### AWS S3 Pricing (as of 2024)

**Storage:**
- First 50 TB: $0.023 per GB/month
- Example: 10 GB = ~$0.23/month

**Requests:**
- PUT requests: $0.005 per 1,000 requests
- GET requests: $0.0004 per 1,000 requests
- Example: 1,000 uploads = $0.005, 10,000 views = $0.004

**Data Transfer:**
- First 1 GB/month: Free
- Next 9.999 TB/month: $0.09 per GB
- Example: 10 GB transfer = ~$0.90/month

**Total for small scale (10 GB storage, 1,000 uploads, 10 GB transfer):**
- ~$1.14/month

### CloudFront Pricing (Optional)

- First 1 TB/month: $0.085 per GB
- Example: 10 GB = ~$0.85/month

**Total with CloudFront: ~$2/month**

## Troubleshooting

### Error: "Access Denied"
- Check IAM user has S3 permissions
- Verify bucket policy allows public read
- Check CORS configuration

### Error: "Bucket not found"
- Verify bucket name in `.env`
- Check AWS region matches bucket region

### Images not loading
- Check bucket policy allows public read
- Verify CORS allows your domain
- Check image URLs in browser console

### Slow image loading
- Set up CloudFront CDN
- Use CloudFront URL in `AWS_CLOUDFRONT_URL`

## Security Best Practices

1. **Use IAM roles** instead of access keys when possible (for EC2/ECS)
2. **Rotate access keys** regularly
3. **Use CloudFront with OAC** for better security
4. **Enable S3 bucket versioning** for backups
5. **Set up S3 lifecycle policies** to delete old images

## Migration from Cloudinary

If you have existing images in Cloudinary:

1. Export image URLs from your database
2. Download images from Cloudinary
3. Re-upload to S3 using a migration script
4. Update database with new S3 URLs

## Support

For issues:
- Check AWS S3 documentation
- Review CloudFront documentation
- Check server logs for detailed error messages


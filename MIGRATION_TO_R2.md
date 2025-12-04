# Migration Guide: AWS S3 → Cloudflare R2

This guide will help you migrate from AWS S3/CloudFront to Cloudflare R2.

## Why R2?

- ✅ **No egress fees** - Save money on bandwidth
- ✅ **Better CORS handling** - No more CORS headaches
- ✅ **Built-in CDN** - Fast global delivery
- ✅ **S3-compatible API** - Easy migration
- ✅ **Free tier**: 10GB storage/month

## Step 1: Create Cloudflare R2 Bucket

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Navigate to **R2** → **Create bucket**
3. Name your bucket (e.g., `photo-app-images`)
4. Click **Create bucket**

## Step 2: Create R2 API Token

1. In R2 dashboard, go to **Manage R2 API Tokens**
2. Click **Create API Token**
3. Select **Admin Read & Write** permissions
4. Copy the following:
   - **Account ID** (shown at the top)
   - **Access Key ID**
   - **Secret Access Key** (only shown once - save it!)

## Step 3: Configure Public Access (Optional but Recommended)

### Option A: Use R2.dev Subdomain (Free, Automatic)
- R2 automatically provides: `https://pub-{account-id}.r2.dev`
- No additional setup needed!

### Option B: Custom Domain (Recommended for Production)
1. In R2 dashboard, go to your bucket → **Settings** → **Public Access**
2. Click **Connect Domain**
3. Add your domain (e.g., `cdn.uploadanh.cloud`)
4. Follow DNS instructions to add CNAME record

## Step 4: Update Environment Variables

Add these to your `.env` file:

```env
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your_account_id_here
R2_ACCESS_KEY_ID=your_access_key_id_here
R2_SECRET_ACCESS_KEY=your_secret_access_key_here
R2_BUCKET_NAME=photo-app-images

# Optional: Custom domain (if using Option B above)
# If not set, will use R2.dev subdomain automatically
R2_PUBLIC_URL=https://cdn.uploadanh.cloud
```

**Important**: Keep your AWS variables commented out or remove them. The code will automatically use R2 if R2 variables are present.

## Step 5: Configure R2 CORS

Run this command to set up CORS:

```bash
cd backend
npm run update:r2-cors
```

This will configure R2 to allow requests from:
- `http://localhost:3000`
- `http://localhost:5173`
- Your `CLIENT_URL`
- `https://uploadanh.cloud`

## Step 6: Test the Migration

1. Start your backend:
   ```bash
   cd backend
   npm run dev
   ```

2. Try uploading an image - it should work!

3. Check the logs - you should see R2 URLs instead of S3 URLs

## Step 7: Migrate Existing Images (Optional)

If you want to migrate existing images from S3 to R2:

1. **Option A: Keep both** (recommended for gradual migration)
   - New uploads go to R2
   - Old images stay on S3
   - Update URLs in database as needed

2. **Option B: Full migration**
   - Download all images from S3
   - Upload to R2
   - Update database URLs
   - (We can create a migration script if needed)

## Troubleshooting

### "Missing storage configuration" error
- Make sure all 4 R2 environment variables are set
- Check for typos in variable names

### CORS errors
- Run `npm run update:r2-cors` again
- Make sure your frontend URL is in the allowed origins

### Images not loading
- Check `R2_PUBLIC_URL` is correct
- Verify bucket is set to **Public** access
- Check R2 dashboard for any errors

## Cost Comparison

**Example: 100GB storage, 500GB/month transfer**

| Provider | Storage | Transfer | Total/month |
|----------|---------|----------|-------------|
| AWS S3 + CloudFront | $2.30 | $42.50 | **~$45** |
| Cloudflare R2 | $1.50 | $0 | **$1.50** |

**Savings: ~$43.50/month** 🎉

## Need Help?

If you encounter any issues, check:
1. R2 dashboard for bucket status
2. Backend logs for error messages
3. Environment variables are correctly set


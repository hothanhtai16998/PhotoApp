# Cloudflare Setup Guide for uploadanh.cloud

This guide will help you switch your DNS to Cloudflare so you can use the root domain `uploadanh.cloud` (without www).

---

## Step 1: Create Cloudflare Account

1. Go to: https://dash.cloudflare.com/sign-up
2. Enter your email and create a password
3. Verify your email address
4. Log in to Cloudflare dashboard

---

## Step 2: Add Your Domain to Cloudflare

1. In Cloudflare dashboard, click **"Add a site"** (big button)
2. Enter: `uploadanh.cloud`
3. Click **"Add site"**
4. Choose the **Free plan** (click "Continue with Free")
5. Cloudflare will scan your current DNS records (this takes 30-60 seconds)

---

## Step 3: Get Your Cloudflare Nameservers

After Cloudflare scans your domain, you'll see a page with:

**"Update your nameservers"**

You'll see 2 nameservers like:
- `ns1.cloudflare.com`
- `ns2.cloudflare.com`

**IMPORTANT:** Copy these 2 nameservers - you'll need them in Step 4!

---

## Step 4: Update Nameservers at P.A Vietnam

1. Go back to P.A Vietnam: `access.pavietnam.vn/name-server`
2. You should see the "Thay đổi DNS" (Change DNS) page
3. **Delete the existing nameservers:**
   - Click the trash icon next to each:
     - `ns1.pavietnam.vn`
     - `ns2.pavietnam.vn`
     - `nsbak.pavietnam.net`
4. **Add Cloudflare nameservers:**
   - Click "Thêm" (Add) button
   - In the "Nhập name server" field, enter: `ns1.cloudflare.com`
   - Click "Thêm" again
   - Enter: `ns2.cloudflare.com`
5. **Save:**
   - Click "Lưu cấu hình" (Save configuration)
   - Wait for confirmation

**Note:** It may take 5-30 minutes for nameserver changes to propagate.

---

## Step 5: Add DNS Records in Cloudflare

1. Go back to Cloudflare dashboard
2. Click on your domain `uploadanh.cloud`
3. Go to **DNS** → **Records** (left sidebar)
4. **Delete any auto-imported records** (if Cloudflare imported old records)

### Add Main CNAME Record (Root Domain):

1. Click **"Add record"**
2. Fill in:
   - **Type:** `CNAME`
   - **Name:** `@` (or `uploadanh.cloud`)
   - **Target:** `d105lv7u7nltvk.cloudfront.net`
   - **Proxy status:** Click the cloud icon to make it **grey** (DNS only, not proxied)
     - ⚠️ **Important:** CloudFront needs DNS-only (grey cloud), not proxied (orange cloud)
   - **TTL:** `Auto`
3. Click **"Save"**

### Add ACM Validation Record:

1. Click **"Add record"** again
2. Fill in:
   - **Type:** `CNAME`
   - **Name:** `_8abfce6886e0f432e4e349`
   - **Target:** `_9516dd7a25e1e86c5f9ea59a44002590.jkddzztszm.acm-validations.aws.`
   - **Proxy status:** **Grey cloud** (DNS only)
   - **TTL:** `Auto`
3. Click **"Save"**

---

## Step 6: Update CloudFront to Accept Root Domain

1. Go to AWS Console → CloudFront → Distributions
2. Click on your distribution
3. Click **"Edit"**
4. Scroll to **"Alternate domain names (CNAMEs)"**
5. Make sure `uploadanh.cloud` is listed (it should already be there)
6. If not, add it: `uploadanh.cloud`
7. **Save changes**

---

## Step 7: Wait for DNS Propagation

- **Nameserver changes:** 5-30 minutes
- **DNS record propagation:** 5-15 minutes
- **Total wait time:** Usually 15-30 minutes

You can check propagation at: https://www.whatsmydns.net

---

## Step 8: Test Your Domain

After waiting 15-30 minutes:

1. Visit: `https://uploadanh.cloud`
2. It should load your site!

---

## Troubleshooting

### If domain doesn't work after 30 minutes:

1. **Check nameservers:**
   - Visit: https://www.whatsmydns.net/#NS/uploadanh.cloud
   - Should show Cloudflare nameservers

2. **Check DNS records:**
   - Visit: https://www.whatsmydns.net/#CNAME/uploadanh.cloud
   - Should show `d105lv7u7nltvk.cloudfront.net`

3. **Verify Cloudflare settings:**
   - Make sure CNAME record has **grey cloud** (not orange)
   - CloudFront doesn't work with Cloudflare proxy (orange cloud)

### Common Issues:

- **"Site can't be reached"** → Wait longer for DNS propagation
- **SSL error** → Make sure CloudFront has the certificate attached
- **CORS errors** → Update CloudFront CORS function (Step 4 from main guide)

---

## Next Steps After Cloudflare Setup

Once `uploadanh.cloud` is working:

1. ✅ Update backend environment variables (Step 5)
2. ✅ Create frontend `.env.production` (Step 6)
3. ✅ Update Google OAuth (Step 7)
4. ✅ Update CloudFront CORS function (Step 4)
5. ✅ Rebuild and deploy frontend (Step 8)

---

**Need help?** Let me know which step you're on!


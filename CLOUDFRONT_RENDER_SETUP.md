# CloudFront + Render Setup Guide

This guide will help you configure CloudFront to point to your Render backend.

---

## Step 1: Find Your Render Backend URL

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Find your backend service
3. Copy the service URL (looks like: `your-app.onrender.com` or `your-app-name.onrender.com`)

**Note:** Make sure your Render service is running and accessible.

---

## Step 2: Update CloudFront Origin

### 2.1 Edit the Origin

1. Go to **AWS Console** → **CloudFront** → **Distributions**
2. Click your distribution (`EIBWPCWIAEHXF`)
3. Click **"Origins"** tab
4. Click **"Edit"** on the existing origin (or create a new one)

### 2.2 Configure Origin Settings

Fill in these settings:

- **Origin domain:** `your-app.onrender.com` (your Render backend URL)
- **Name:** `render-backend` (or any name you prefer)
- **Origin path:** (leave empty)
- **Origin protocol:** `HTTPS Only`
- **HTTP port:** `443`
- **Origin SSL certificates:** `Default CloudFront Certificate`
- **Origin request policy:** `CORS-S3Origin` or `CORS-CustomOrigin`
- **Origin response timeout:** `30` (seconds)
- **Origin connection timeout:** `10` (seconds)
- **Origin connection attempts:** `3`

### 2.3 Save Changes

Click **"Save changes"** and wait 15-30 minutes for deployment.

---

## Step 3: Configure CloudFront Behaviors (Important!)

Since your backend serves both API (`/api/*`) and frontend (`/*`), you need to configure behaviors:

### 3.1 Check Default Behavior

1. Go to **CloudFront** → **Behaviors** tab
2. Click **"Edit"** on the default behavior (`*`)
3. Make sure:
   - **Origin and origin groups:** Points to your Render backend
   - **Viewer protocol policy:** `Redirect HTTP to HTTPS`
   - **Allowed HTTP methods:** `GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE`
   - **Cache policy:** `CachingDisabled` (for API routes) OR `CachingOptimized` (if you want to cache frontend)
   - **Origin request policy:** `CORS-S3Origin` or `CORS-CustomOrigin`

### 3.2 Optional: Create Separate Behavior for API Routes

If you want different caching for API vs frontend:

1. Click **"Create behavior"**
2. **Path pattern:** `/api/*`
3. **Origin:** Your Render backend
4. **Cache policy:** `CachingDisabled` (don't cache API responses)
5. **Origin request policy:** `CORS-CustomOrigin`
6. **Viewer protocol policy:** `Redirect HTTP to HTTPS`
7. Click **"Create behavior"**

**Note:** Make sure the `/api/*` behavior has higher priority (lower number) than the default `*` behavior.

---

## Step 4: Update Render CORS Settings

Make sure your Render backend allows requests from your domain:

### 4.1 Check Backend CORS Configuration

Your backend already has CORS configured in `backend/src/server.js`:

```javascript
app.use(
    cors({
        origin: env.NODE_ENV === 'development' 
            ? ['http://localhost:3000', 'http://localhost:5173', env.CLIENT_URL].filter(Boolean)
            : env.CLIENT_URL,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-XSRF-TOKEN', 'X-CSRF-Token'],
    })
);
```

### 4.2 Update Environment Variables in Render

1. Go to **Render Dashboard** → Your backend service → **Environment**
2. Make sure these are set:
   - `CLIENT_URL=https://uploadanh.cloud`
   - `FRONTEND_URL=https://uploadanh.cloud`
   - `NODE_ENV=production`
3. **Redeploy** your service if you changed environment variables

---

## Step 5: Test Your Setup

After CloudFront finishes deploying (15-30 minutes):

1. Visit: `https://uploadanh.cloud`
2. Should load your frontend
3. Test API calls (sign in, etc.)
4. Check browser console for errors

---

## Troubleshooting

### Issue: "Access Denied" or CORS errors

**Solution:**
- Check Render backend is running
- Verify `CLIENT_URL` environment variable in Render is `https://uploadanh.cloud`
- Check CloudFront origin request policy includes CORS headers

### Issue: Frontend loads but API calls fail

**Solution:**
- Check CloudFront behaviors - make sure `/api/*` routes to backend
- Verify CORS is configured correctly in backend
- Check browser Network tab for error details

### Issue: 502 Bad Gateway

**Solution:**
- Check Render service is running and healthy
- Verify Render backend URL is correct in CloudFront origin
- Check Render logs for errors

### Issue: Timeout errors

**Solution:**
- Increase "Origin response timeout" in CloudFront origin settings (try 60 seconds)
- Check Render service performance

---

## Quick Checklist

- [ ] Render backend is running and accessible
- [ ] CloudFront origin points to Render backend URL
- [ ] CloudFront behaviors configured correctly
- [ ] Render environment variables updated (`CLIENT_URL`, `FRONTEND_URL`)
- [ ] CloudFront deployment completed
- [ ] Domain tested and working

---

**Need help?** Share:
1. Your Render backend URL
2. Any error messages you see
3. CloudFront behavior configuration


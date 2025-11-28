# CloudFront Origin Connectivity Test Guide

This guide helps you troubleshoot CloudFront connectivity issues with your Render backend.

## Prerequisites

- Your Render backend URL: `https://photoapp-pgq4.onrender.com`
- Health check endpoint: `/api/health`

## Step 1: Check if Render Allows CloudFront IPs

Render typically allows all IPs by default, but you should verify:

1. **Check Render Service Settings:**
   - Go to your Render dashboard
   - Navigate to your service settings
   - Check if there are any IP restrictions or firewall rules
   - CloudFront should be able to reach Render without restrictions

2. **CloudFront IP Ranges:**
   - CloudFront uses AWS IP ranges that change over time
   - Render doesn't typically block AWS IPs, but verify there are no custom firewall rules

## Step 2: Verify the Render Service is Running

1. **Check Render Dashboard:**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Verify your service `photoapp-pgq4` is in "Live" status
   - Check recent logs for any errors

2. **Check Service Health:**
   - Look at the service metrics
   - Verify CPU and memory usage are normal
   - Check if there are any recent deployments

## Step 3: Test the Origin Directly

Test if your Render backend is accessible directly (bypassing CloudFront):

### Option A: Using PowerShell (Windows)

```powershell
# Test with HEAD request (just headers)
Invoke-WebRequest -Uri "https://photoapp-pgq4.onrender.com/api/health" -Method Head

# Or test with GET request (full response)
Invoke-WebRequest -Uri "https://photoapp-pgq4.onrender.com/api/health"
```

### Option B: Using curl (if installed)

```bash
# Test with HEAD request (just headers)
curl -I https://photoapp-pgq4.onrender.com/api/health

# Or test with GET request (full response)
curl https://photoapp-pgq4.onrender.com/api/health
```

### Expected Response

You should see:
- **Status Code:** `200 OK`
- **Response Body:** 
  ```json
  {
    "status": "ok",
    "timestamp": "2024-...",
    "version": "1.0.0-cors-fix"
  }
  ```

### What to Look For

✅ **Success indicators:**
- HTTP 200 status code
- Response includes JSON with `status: "ok"`
- Response time is reasonable (< 2 seconds)

❌ **Failure indicators:**
- HTTP 503 (Service Unavailable) - Service might be sleeping or down
- HTTP 502 (Bad Gateway) - Service is starting up
- Connection timeout - Service might be down or network issue
- HTTP 404 - Endpoint doesn't exist (check URL)

## Step 4: Test Through CloudFront

After verifying direct access works, test through your CloudFront distribution:

```powershell
# Replace YOUR_CLOUDFRONT_URL with your actual CloudFront domain
Invoke-WebRequest -Uri "https://YOUR_CLOUDFRONT_URL/api/health" -Method Head
```

## Possible Issues

### Issue 1: Render Service is Sleeping

**Symptom:** First request takes 30+ seconds, subsequent requests are fast

**Solution:** 
- Render free tier services sleep after inactivity
- Consider upgrading to a paid plan for always-on service
- Or accept the cold start delay

### Issue 2: CORS Errors

**Symptom:** Browser console shows CORS errors

**Solution:**
- Verify your CloudFront CORS function is published and associated
- Check that your frontend origin is in the allowed origins list
- See `CLOUDFRONT_UPDATE_GUIDE.md` for CORS setup

### Issue 3: CloudFront Can't Reach Origin

**Symptom:** CloudFront returns 502 or 503 errors

**Possible Causes:**
- Render service is down or sleeping
- Origin path in CloudFront is incorrect
- Origin protocol mismatch (HTTP vs HTTPS)
- Origin response timeout too short

**Solutions:**
1. Verify Render service is running
2. Check CloudFront origin settings:
   - Origin Domain: `photoapp-pgq4.onrender.com`
   - Origin Protocol: `HTTPS Only`
   - Origin Path: (leave empty unless using a subdirectory)
3. Increase origin response timeout in CloudFront (default is 30s)

### Issue 4: SSL/TLS Certificate Issues

**Symptom:** SSL handshake errors

**Solution:**
- Render provides SSL certificates automatically
- Verify the certificate is valid: `https://photoapp-pgq4.onrender.com`
- CloudFront should use "Match Viewer" for SSL protocol

## Quick Diagnostic Commands

### Test Health Endpoint
```powershell
# PowerShell
$response = Invoke-WebRequest -Uri "https://photoapp-pgq4.onrender.com/api/health"
$response.StatusCode
$response.Content
```

### Check Response Headers
```powershell
# PowerShell
$response = Invoke-WebRequest -Uri "https://photoapp-pgq4.onrender.com/api/health" -Method Head
$response.Headers
```

### Test with Detailed Output
```powershell
# PowerShell - Verbose output
Invoke-WebRequest -Uri "https://photoapp-pgq4.onrender.com/api/health" -Verbose
```

## Next Steps

1. ✅ Test origin directly (Step 3)
2. ✅ Verify CloudFront distribution settings
3. ✅ Test through CloudFront URL
4. ✅ Check browser console for errors
5. ✅ Verify CORS headers are present

If all tests pass but you still have issues, check:
- CloudFront cache settings
- CloudFront function associations
- Browser developer tools network tab
- CloudFront CloudWatch logs


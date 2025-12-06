# How Monitoring & Alerts Tab Works

## 🔄 Complete Workflow

### 1. **Configuration (Admin Settings → Monitoring Tab)**

When you configure settings in the Monitoring tab:

#### **Health Checks Section:**
- **Enable Health Checks**: Toggle to turn monitoring on/off
- **Check Interval**: How often the system checks health (10-3600 seconds)
  - Default: 60 seconds (checks every minute)
  - Lower = more frequent checks (more accurate, more CPU)
  - Higher = less frequent checks (less accurate, less CPU)

#### **Alert Thresholds Section:**
Configure when alerts should trigger:
- **CPU Usage Threshold**: Alert when CPU > X% (default: 80%)
- **Memory Usage Threshold**: Alert when Memory > X% (default: 85%)
- **Disk Usage Threshold**: Alert when Disk > X% (default: 90%)
- **Response Time Threshold**: Alert when Response Time > X ms (default: 1000ms)
- **Error Rate Threshold**: Alert when Error Rate > X% (default: 5%)

#### **Email Alerts Section:**
- **Enable Email Alerts**: Toggle to enable/disable email notifications
- **Alert Recipients**: Comma-separated email addresses (e.g., "admin@example.com, support@example.com")

#### **Alert Events Section:**
Choose which events trigger alerts:
- ✅ System Down
- ✅ High CPU Usage
- ✅ High Memory Usage
- ✅ High Disk Usage
- ✅ Slow Response Time
- ✅ High Error Rate
- ✅ Database Connection Failure
- ✅ Storage Connection Failure

---

### 2. **Saving Settings**

When you click "Save":
1. Settings are saved to MongoDB database
2. Settings cache is invalidated (forces refresh)
3. Monitoring service automatically picks up new settings
4. New interval is applied (if health check interval changed)

---

### 3. **Background Monitoring Service** (Automatic)

The monitoring service runs in the background:

#### **On Server Startup:**
```
1. Server starts
2. Monitoring service initializes
3. Reads settings from database
4. Starts checking at configured interval (default: 60 seconds)
```

#### **Every Check Interval:**
```
1. Fetch current system metrics:
   - CPU usage (measures CPU times)
   - Memory usage (from Node.js os module)
   - Disk usage (from filesystem)
   - Response time (from request history)
   - Error rate (from error history)
   - Database status (MongoDB connection)
   - Storage status (R2/S3 connection)

2. Compare metrics against thresholds:
   - If CPU > threshold → Trigger alert
   - If Memory > threshold → Trigger alert
   - If Disk > threshold → Trigger alert
   - If Response Time > threshold → Trigger alert
   - If Error Rate > threshold → Trigger alert
   - If Database disconnected → Trigger alert
   - If Storage disconnected → Trigger alert

3. Check alert cooldown (15 minutes):
   - Prevents spam (won't send same alert twice in 15 minutes)
   - Only sends if last alert was > 15 minutes ago

4. Send email alerts (if enabled):
   - Uses SMTP settings from Email tab
   - Sends to all configured recipients
   - Includes severity, metric details, current values, thresholds
```

---

### 4. **System Metrics Collection**

#### **CPU Usage:**
- Measures CPU times twice (1 second apart)
- Calculates percentage: `100 - (idle / total) * 100`
- Returns 0-100%

#### **Memory Usage:**
- Uses Node.js `os.totalmem()` and `os.freemem()`
- Calculates: `(used / total) * 100`
- Returns 0-100%

#### **Disk Usage:**
- Uses `df -h /` command (Linux/Mac)
- Returns filesystem usage percentage
- Returns 0-100%

#### **Response Time:**
- Tracks last 100 requests
- Calculates average from last 5 minutes
- Returns milliseconds

#### **Error Rate:**
- Tracks errors in last 5 minutes
- Calculates: `(errors / requests) * 100`
- Returns 0-100%

#### **Database Status:**
- Checks MongoDB connection state
- Returns: `'connected'` or `'disconnected'`

#### **Storage Status:**
- Checks storage provider connection
- Returns: `'connected'` or `'disconnected'`

---

### 5. **Alert Determination**

System determines overall status:

```javascript
if (any metric exceeds critical threshold OR database/storage disconnected) {
    status = 'critical'
} else if (any metric exceeds warning threshold) {
    status = 'warning'
} else {
    status = 'healthy'
}
```

**Critical Thresholds:**
- CPU > 80%
- Memory > 85%
- Disk > 90%
- Response Time > 1000ms
- Error Rate > 5%

**Warning Thresholds:**
- CPU > 60%
- Memory > 70%
- Disk > 75%
- Response Time > 500ms
- Error Rate > 2%

---

### 6. **Email Alert Sending**

When an alert is triggered:

1. **Check if email alerts enabled:**
   - If disabled → Skip (just log)
   - If enabled → Continue

2. **Check if recipients configured:**
   - If no recipients → Skip
   - If recipients exist → Continue

3. **Check alert cooldown:**
   - If alert sent < 15 minutes ago → Skip (prevent spam)
   - If > 15 minutes ago → Send

4. **Send email:**
   - Uses SMTP settings from Email tab
   - HTML email with severity colors
   - Includes:
     - Alert type
     - Current value
     - Threshold
     - Severity (critical/warning)
     - Timestamp

---

### 7. **Dashboard Display** (Real-time)

The Admin Dashboard shows real-time system status:

#### **System Status Widget:**
- Fetches metrics from `/api/admin/dashboard/metrics`
- Updates every 30 seconds
- Shows:
  - Overall status (Healthy/Warning/Critical) with color-coded icon
  - CPU Usage with color coding
  - Memory Usage with color coding
  - Disk Usage with color coding
  - Response Time with color coding
  - Database Status
  - Storage Status
  - Last check timestamp

#### **Color Coding:**
- 🟢 **Green**: Normal/Healthy
- 🟡 **Yellow**: Warning (approaching threshold)
- 🔴 **Red**: Critical (exceeded threshold)

---

## 📊 Example Flow

### Scenario: High CPU Usage

1. **Configuration:**
   - Admin sets CPU threshold to 80%
   - Enables email alerts
   - Adds email: `admin@example.com`

2. **Monitoring:**
   - Every 60 seconds, system checks CPU
   - Current CPU: 85%
   - 85% > 80% threshold → Alert triggered

3. **Alert Processing:**
   - Check: Email alerts enabled? ✅
   - Check: Recipients configured? ✅
   - Check: Last alert > 15 min ago? ✅
   - Send email to `admin@example.com`

4. **Email Content:**
   ```
   Subject: [CRITICAL] System Alert: CPU Usage
   
   High CPU usage detected: 85% (threshold: 80%)
   Severity: CRITICAL
   Time: 2025-12-06 13:45:00
   ```

5. **Dashboard:**
   - Shows CPU Usage: 85% in red
   - Shows overall status: Critical
   - Updates every 30 seconds

---

## ⚙️ Settings Impact

### **Health Check Interval:**
- **10 seconds**: Very frequent, high accuracy, more CPU usage
- **60 seconds** (default): Balanced, good accuracy, low CPU
- **300 seconds (5 min)**: Less frequent, lower accuracy, minimal CPU
- **3600 seconds (1 hour)**: Very infrequent, may miss issues, minimal CPU

### **Alert Thresholds:**
- **Too Low**: Many false alarms
- **Too High**: Miss real issues
- **Recommended**: Start with defaults, adjust based on your system

### **Email Alerts:**
- **Enabled**: Receive notifications when issues occur
- **Disabled**: No emails, but monitoring still runs (can view in dashboard)

---

## 🔍 Troubleshooting

### **No Alerts Received:**
1. Check: Email alerts enabled? ✅
2. Check: Recipients configured? ✅
3. Check: SMTP settings correct? ✅
4. Check: Thresholds not too high? ✅
5. Check: Alert cooldown (wait 15 minutes)

### **Too Many Alerts:**
1. Increase thresholds
2. Increase health check interval
3. Disable specific alert events
4. Alert cooldown prevents spam (15 minutes)

### **Dashboard Not Showing Metrics:**
1. Check: Backend running? ✅
2. Check: `/api/admin/dashboard/metrics` accessible? ✅
3. Check: Permissions (need `viewDashboard`)? ✅
4. Check: Browser console for errors

---

## 🎯 Best Practices

1. **Start with Defaults**: Use default thresholds initially
2. **Monitor Dashboard**: Check dashboard regularly
3. **Adjust Thresholds**: Tune based on your system's normal behavior
4. **Use Multiple Recipients**: Add team emails for critical alerts
5. **Test Alerts**: Set low threshold temporarily to test
6. **Review Logs**: Check server logs for monitoring activity

---

## 📝 Summary

**The Monitoring & Alerts tab:**
1. ✅ Lets you configure what to monitor
2. ✅ Runs automatically in background
3. ✅ Checks system health at configured interval
4. ✅ Compares metrics against thresholds
5. ✅ Sends email alerts when thresholds exceeded
6. ✅ Shows real-time status in dashboard
7. ✅ Prevents alert spam with cooldown
8. ✅ Works efficiently with minimal resource usage

**It's a complete monitoring solution that runs automatically once configured!** 🚀


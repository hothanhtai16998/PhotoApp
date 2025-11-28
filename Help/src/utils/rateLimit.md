# rateLimit Explanation

## What is rateLimit?

`rateLimit` is a **utility module** that provides functions for handling rate limit errors. It parses rate limit headers and generates user-friendly error messages.

## Key Features

### 1. **Header Parsing**
- Parses rate limit headers
- Supports standard and legacy headers
- Calculates reset time
- Handles different formats

### 2. **User-Friendly Messages**
- Formats time until reset
- Vietnamese language
- Clear error messages

### 3. **Time Formatting**
- Seconds, minutes, hours
- Human-readable format
- Accurate calculations

## Step-by-Step Breakdown

### Parse Rate Limit Headers

```typescript
export function parseRateLimitHeaders(headers: Record<string, string>): RateLimitInfo | null {
  // Try standard headers first (RateLimit-*)
  const limit = 
    headers['ratelimit-limit'] ?? 
    headers['RateLimit-Limit'] ?? 
    headers['x-ratelimit-limit'] ?? 
    headers['X-RateLimit-Limit'];
  
  const remaining = 
    headers['ratelimit-remaining'] ?? 
    headers['RateLimit-Remaining'] ?? 
    headers['x-ratelimit-remaining'] ?? 
    headers['X-RateLimit-Remaining'];
  
  const reset = 
    headers['ratelimit-reset'] ?? 
    headers['RateLimit-Reset'] ?? 
    headers['x-ratelimit-reset'] ?? 
    headers['X-RateLimit-Reset'];

  if (!limit || !remaining || !reset) {
    return null;
  }

  // Reset can be either Unix timestamp or seconds until reset
  const resetTimestamp = resetNum < 1000000000 
    ? Math.floor(Date.now() / 1000) + resetNum 
    : resetNum;
  
  const resetTime = new Date(resetTimestamp * 1000);
  const secondsUntilReset = Math.max(0, Math.ceil((resetTime.getTime() - Date.now()) / 1000));

  return {
    limit: limitNum,
    remaining: remainingNum,
    reset: resetTimestamp,
    resetTime,
    secondsUntilReset,
  };
}
```

**What this does:**
- Parses rate limit headers
- Supports multiple header formats
- Handles timestamp or seconds format
- Calculates time until reset
- Returns structured info

### Format Time

```typescript
export function formatTimeUntilReset(seconds: number): string {
  if (seconds <= 0) {
    return 'ngay bây giờ';
  }

  if (seconds < 60) {
    return `${seconds} giây`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    if (remainingSeconds === 0) {
      return `${minutes} phút`;
    }
    return `${minutes} phút ${remainingSeconds} giây`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return `${hours} giờ`;
  }
  return `${hours} giờ ${remainingMinutes} phút`;
}
```

**What this does:**
- Formats seconds to human-readable
- Vietnamese language
- Handles seconds, minutes, hours
- Clean formatting

### Get Rate Limit Message

```typescript
export function getRateLimitMessage(rateLimitInfo: RateLimitInfo | null): string {
  if (!rateLimitInfo) {
    return 'Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.';
  }

  const timeUntilReset = formatTimeUntilReset(rateLimitInfo.secondsUntilReset);
  
  return `Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau ${timeUntilReset}.`;
}
```

**What this does:**
- Generates user-friendly message
- Includes time until reset
- Fallback message if no info

## Usage Examples

### Parse Headers

```typescript
import { parseRateLimitHeaders } from '@/utils/rateLimit';

const rateLimitInfo = parseRateLimitHeaders(response.headers);
if (rateLimitInfo) {
  console.log(`Remaining: ${rateLimitInfo.remaining}/${rateLimitInfo.limit}`);
  console.log(`Reset in: ${rateLimitInfo.secondsUntilReset} seconds`);
}
```

### Get Message

```typescript
import { getRateLimitMessage } from '@/utils/rateLimit';

const message = getRateLimitMessage(rateLimitInfo);
toast.error(message); // "Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau 2 phút 30 giây."
```

## Summary

**rateLimit** is the rate limit utility that:
1. ✅ Parses rate limit headers
2. ✅ Formats time until reset
3. ✅ Generates user-friendly messages
4. ✅ Supports multiple header formats
5. ✅ Vietnamese language

It's the "rate limit handler" - making rate limits user-friendly!


# apiConfig Explanation

## What is apiConfig?

`apiConfig` is a **configuration file** that contains API-related settings. It includes retry configuration and geocoding service settings.

## Key Features

### 1. **Retry Configuration**
- Max retries
- Initial delay
- Backoff strategy

### 2. **Geocoding Settings**
- Default language
- Default limit

### 3. **Centralized Configuration**
- Easy to edit
- Single source of truth
- Type-safe

## Step-by-Step Breakdown

### Retry Configuration

```typescript
retry: {
  // Maximum number of retry attempts
  maxRetries: 3,
  
  // Initial delay between retries in milliseconds
  initialDelayMs: 1000,
  
  // Backoff strategy: 'exponential' or 'linear'
  backoff: 'exponential' as const,
},
```

**What this does:**
- Defines retry settings
- 3 max retries
- 1 second initial delay
- Exponential backoff

### Geocoding Configuration

```typescript
geocoding: {
  // Default language for location search
  defaultLanguage: 'vi',
  
  // Default limit for location suggestions
  defaultLimit: 8,
},
```

**What this does:**
- Defines geocoding settings
- Vietnamese language default
- 8 results default limit

## Usage Examples

### Retry Configuration

```typescript
import { apiConfig } from '@/config/apiConfig';

const result = await retry(fn, {
  maxRetries: apiConfig.retry.maxRetries,
  delay: apiConfig.retry.initialDelayMs,
  backoff: apiConfig.retry.backoff,
});
```

### Geocoding Configuration

```typescript
import { apiConfig } from '@/config/apiConfig';

const suggestions = await searchLocations(
  query,
  apiConfig.geocoding.defaultLanguage,
  apiConfig.geocoding.defaultLimit
);
```

## Summary

**apiConfig** is the API configuration that:
1. ✅ Defines retry settings
2. ✅ Geocoding settings
3. ✅ Centralized configuration
4. ✅ Easy to edit
5. ✅ Type-safe

It's the "API settings" - centralizing API configuration!


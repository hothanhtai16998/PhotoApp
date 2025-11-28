# appConfig Explanation

## What is appConfig?

`appConfig` is a **configuration file** that contains general application-wide settings. It includes mobile breakpoints, API timeouts, and storage keys.

## Key Features

### 1. **Application Settings**
- Mobile breakpoint
- API timeout
- Storage keys

### 2. **Centralized Configuration**
- Easy to edit
- Single source of truth
- Type-safe

### 3. **Storage Management**
- Search history key
- Navigation flags
- Profile view tracking

## Step-by-Step Breakdown

### Mobile Breakpoint

```typescript
mobileBreakpoint: 768,
```

**What this does:**
- Defines mobile breakpoint (768px)
- Used for responsive design
- Determines mobile vs desktop

### API Timeout

```typescript
apiTimeout: 120000, // 2 minutes for file uploads
```

**What this does:**
- Sets API timeout (120 seconds)
- Long timeout for file uploads
- Prevents premature timeouts

### Storage Keys

```typescript
storage: {
  // Search history localStorage key
  searchHistoryKey: 'photoApp_searchHistory',
  
  // Image page navigation flag (sessionStorage)
  imagePageFromGridKey: 'imagePage_fromGrid',
  
  // Profile view tracking (sessionStorage)
  profileViewKeyPrefix: 'profile_view_',
},
```

**What this does:**
- Defines storage keys
- Search history in localStorage
- Navigation flags in sessionStorage
- Profile view tracking prefix

## Usage Examples

### Mobile Breakpoint

```typescript
import { appConfig } from '@/config/appConfig';

if (window.innerWidth <= appConfig.mobileBreakpoint) {
  // Mobile layout
}
```

### API Timeout

```typescript
import { appConfig } from '@/config/appConfig';

axios.defaults.timeout = appConfig.apiTimeout;
```

### Storage Keys

```typescript
import { appConfig } from '@/config/appConfig';

localStorage.setItem(appConfig.storage.searchHistoryKey, JSON.stringify(history));
```

## Summary

**appConfig** is the general application configuration that:
1. ✅ Defines mobile breakpoint
2. ✅ Sets API timeout
3. ✅ Defines storage keys
4. ✅ Centralized settings
5. ✅ Easy to edit

It's the "app settings" - centralizing app configuration!


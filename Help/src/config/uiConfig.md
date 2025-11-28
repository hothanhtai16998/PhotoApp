# uiConfig Explanation

## What is uiConfig?

`uiConfig` is a **configuration file** that contains UI-related settings. It includes skeleton loading counts, tag input limits, and analytics date range options.

## Key Features

### 1. **Skeleton Settings**
- Image grid count
- Collection grid count
- Analytics card count

### 2. **Tag Settings**
- Maximum tags
- Maximum tag length

### 3. **Analytics Settings**
- Date range options
- Day options array

## Step-by-Step Breakdown

### Skeleton Settings

```typescript
skeleton: {
  // Number of skeleton items for image grids
  imageGridCount: 12,
  
  // Number of skeleton items for collection grids
  collectionGridCount: 6,
  
  // Number of skeleton items for analytics cards
  analyticsCardCount: 4,
},
```

**What this does:**
- Defines skeleton counts
- Image grid: 12 items
- Collection grid: 6 items
- Analytics: 4 cards

### Tag Settings

```typescript
tags: {
  // Maximum number of tags allowed
  maxTags: 20,
  
  // Maximum length per tag
  maxTagLength: 50,
},
```

**What this does:**
- Defines tag limits
- Max 20 tags
- Max 50 characters per tag

### Analytics Settings

```typescript
analytics: {
  // Analytics date range options (in days)
  dayOptions: [7, 30, 90, 180, 365] as const,
},
```

**What this does:**
- Defines date range options
- 7, 30, 90, 180, 365 days
- Used in analytics dropdown

## Usage Examples

### Skeleton Count

```typescript
import { uiConfig } from '@/config/uiConfig';

{Array.from({ length: uiConfig.skeleton.imageGridCount }).map((_, i) => (
  <Skeleton key={i} />
))}
```

### Tag Limits

```typescript
import { uiConfig } from '@/config/uiConfig';

if (tags.length >= uiConfig.tags.maxTags) {
  toast.error(`Maximum ${uiConfig.tags.maxTags} tags allowed`);
}
```

### Analytics Options

```typescript
import { uiConfig } from '@/config/uiConfig';

uiConfig.analytics.dayOptions.map(days => (
  <option key={days} value={days}>{days} days</option>
))
```

## Summary

**uiConfig** is the UI configuration that:
1. ✅ Defines skeleton counts
2. ✅ Tag limits
3. ✅ Analytics options
4. ✅ Centralized settings
5. ✅ Easy to edit

It's the "UI settings" - centralizing UI configuration!


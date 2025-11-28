# userStatsService Explanation

## What is userStatsService?

`userStatsService` is a **service module** that provides user statistics-related API methods. It handles fetching user stats and tracking profile views.

## Key Features

### 1. **User Statistics**
- Total images
- Total collections
- Total favorites
- Total downloads
- Total views
- Follow statistics
- Profile views
- Profile completion

### 2. **Profile Tracking**
- Track profile views
- Increment view counter
- Analytics support

### 3. **Request Cancellation**
- Supports AbortSignal
- Prevents race conditions
- Better performance

## Step-by-Step Breakdown

### Get User Stats

```typescript
getUserStats: async (userId: string, signal?: AbortSignal): Promise<UserStats> => {
  const res = await api.get(`/users/${userId}/stats`, {
    withCredentials: true,
    signal, // Pass abort signal for request cancellation
  });
  return res.data;
},
```

**What this does:**
- Fetches user statistics
- Supports request cancellation
- Returns comprehensive stats
- Used for profile pages

### User Stats Structure

```typescript
export interface UserStats {
  totalImages: number;
  totalCollections: number;
  totalFavorites: number; // Likes received
  totalDownloads: number;
  totalViews: number;
  followersCount: number;
  followingCount: number;
  profileViews: number;
  joinDate: string;
  verifiedBadge: boolean; // Future feature
  profileCompletion: ProfileCompletion;
}
```

**What this does:**
- Defines complete stats structure
- Content statistics
- Social statistics
- Profile metrics
- Completion status

### Profile Completion

```typescript
export interface ProfileCompletion {
  percentage: number;
  completed: number;
  total: number;
  criteria: ProfileCompletionCriteria;
}

export interface ProfileCompletionCriteria {
  hasAvatar: boolean;
  hasBio: boolean;
  hasPhone: boolean;
  hasImages: boolean;
  hasCollections: boolean;
}
```

**What this does:**
- Defines completion structure
- Percentage and counts
- Completion criteria
- Used for profile completion UI

### Track Profile View

```typescript
trackProfileView: async (userId: string): Promise<{ profileViews: number }> => {
  const res = await api.post(`/users/${userId}/view`, {}, {
    withCredentials: true,
  });
  return res.data;
},
```

**What this does:**
- Tracks profile view
- Increments view counter
- Returns updated count
- Used for analytics

## Usage Examples

### Get User Stats

```typescript
const signal = useRequestCancellation();
const stats = await userStatsService.getUserStats(userId, signal);
console.log(stats.totalImages);
console.log(stats.profileCompletion.percentage);
```

### Track Profile View

```typescript
await userStatsService.trackProfileView(userId);
```

### Access Stats

```typescript
const stats = await userStatsService.getUserStats(userId);

// Content stats
console.log(stats.totalImages, stats.totalCollections);

// Social stats
console.log(stats.followersCount, stats.followingCount);

// Profile completion
console.log(stats.profileCompletion.percentage);
stats.profileCompletion.criteria.hasAvatar; // true/false
```

## Summary

**userStatsService** is the user statistics service that:
1. ✅ Provides user statistics
2. ✅ Profile completion
3. ✅ Profile view tracking
4. ✅ Request cancellation
5. ✅ Comprehensive data

It's the "stats API" - providing user statistics!


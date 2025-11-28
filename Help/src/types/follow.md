# follow Types Explanation

## What is follow Types?

`follow` types is a **TypeScript type definitions file** that defines all follow-related types and interfaces. It provides type safety for follow operations, status checks, and follow lists.

## Key Features

### 1. **Follow Status Types**
- Follow status
- Follow counts
- Follow action response

### 2. **Follow List Types**
- Following list response
- Followers list response
- Follow user interface

### 3. **Statistics Types**
- User follow stats response
- Complete statistics

## Step-by-Step Breakdown

### Follow Status

```typescript
export interface FollowStatus {
  success: boolean;
  isFollowing: boolean;
  isFollowedBy: boolean;
}
```

**What this does:**
- Defines follow status
- Is following flag
- Is followed by flag
- Used for status checks

### Follow Counts

```typescript
export interface FollowCounts {
  success: boolean;
  following: number;
  followers: number;
}
```

**What this does:**
- Defines follow counts
- Following count
- Followers count
- Used for statistics

### Follow User

```typescript
export interface FollowUser {
  _id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  followedAt: string;
}
```

**What this does:**
- Defines follow user structure
- User information
- Follow date
- Used in follow lists

### Following/Followers List Response

```typescript
export interface FollowingListResponse {
  success: boolean;
  following: FollowUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface FollowersListResponse {
  success: boolean;
  followers: FollowUser[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
```

**What this does:**
- Defines follow list responses
- Array of follow users
- Pagination metadata
- Used for follow lists

### User Follow Stats Response

```typescript
export interface UserFollowStatsResponse {
  success: boolean;
  stats: {
    followers: number;
    following: number;
    isFollowing: boolean;
  };
}
```

**What this does:**
- Defines follow stats response
- Complete statistics
- Includes isFollowing
- Used for profile pages

## Usage Examples

### Follow Status

```typescript
import type { FollowStatus } from '@/types/follow';

const status: FollowStatus = await followService.getFollowStatus(userId);
console.log(status.isFollowing);
```

### Follow Counts

```typescript
import type { FollowCounts } from '@/types/follow';

const counts: FollowCounts = await followService.getFollowCounts(userId);
console.log(counts.followers, counts.following);
```

### Follow Stats

```typescript
import type { UserFollowStatsResponse } from '@/types/follow';

const response: UserFollowStatsResponse = await followService.getUserFollowStats(userId);
console.log(response.stats.followers);
```

## Summary

**follow types** is the follow type definitions file that:
1. ✅ Defines follow status types
2. ✅ Follow list types
3. ✅ Statistics types
4. ✅ Type safety
5. ✅ Consistent structure

It's the "follow types" - ensuring type safety for follows!


# followService Explanation

## What is followService?

`followService` is a **service module** that provides follow-related API methods. It handles following/unfollowing users, fetching follow lists, and getting follow statistics.

## Key Features

### 1. **Follow Operations**
- Follow user
- Unfollow user
- Get follow status

### 2. **Follow Lists**
- Get following list
- Get followers list
- Pagination support

### 3. **Statistics**
- Get follow counts
- Get follow stats (includes isFollowing)
- Request cancellation support

## Step-by-Step Breakdown

### Follow/Unfollow

```typescript
followUser: async (userId: string): Promise<FollowActionResponse> => {
  const res = await api.post(`/follows/${userId}`, {}, {
    withCredentials: true,
  });
  return res.data;
},

unfollowUser: async (userId: string): Promise<FollowActionResponse> => {
  const res = await api.delete(`/follows/${userId}`, {
    withCredentials: true,
  });
  return res.data;
},
```

**What this does:**
- Follows user (POST)
- Unfollows user (DELETE)
- Returns action response
- Requires authentication

### Get Follow Lists

```typescript
getFollowing: async (params?: {
  page?: number;
  limit?: number;
}): Promise<FollowingListResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.page) {
    queryParams.append('page', params.page.toString());
  }
  if (params?.limit) {
    queryParams.append('limit', params.limit.toString());
  }

  const queryString = queryParams.toString();
  const url = queryString ? `/follows/following?${queryString}` : '/follows/following';

  const res = await api.get(url, {
    withCredentials: true,
  });
  return res.data;
},

getFollowers: async (params?: {
  page?: number;
  limit?: number;
}): Promise<FollowersListResponse> => {
  // Similar implementation
},
```

**What this does:**
- Fetches following list
- Fetches followers list
- Supports pagination
- Builds query string

### Get Follow Status

```typescript
getFollowStatus: async (userId: string): Promise<FollowStatus> => {
  const res = await api.get(`/follows/${userId}/status`, {
    withCredentials: true,
  });
  return res.data;
},
```

**What this does:**
- Checks if following user
- Returns follow status
- Used by FollowButton

### Get Statistics

```typescript
getFollowCounts: async (userId: string): Promise<FollowCounts> => {
  const res = await api.get(`/follows/${userId}/counts`);
  return res.data;
},

getUserFollowStats: async (userId: string, signal?: AbortSignal): Promise<UserFollowStatsResponse> => {
  const res = await api.get(`/follows/${userId}/stats`, {
    withCredentials: true,
    signal, // Pass abort signal for request cancellation
  });
  return res.data;
},
```

**What this does:**
- Gets follow counts (public)
- Gets follow stats (includes isFollowing)
- Supports request cancellation
- Used for profile pages

## Usage Examples

### Follow User

```typescript
const response = await followService.followUser(userId);
console.log(response.isFollowing);
```

### Get Following

```typescript
const response = await followService.getFollowing({
  page: 1,
  limit: 20,
});
```

### Get Follow Status

```typescript
const status = await followService.getFollowStatus(userId);
console.log(status.isFollowing);
```

### Get Stats

```typescript
const signal = useRequestCancellation();
const stats = await followService.getUserFollowStats(userId, signal);
console.log(stats.followersCount, stats.followingCount, stats.isFollowing);
```

## Summary

**followService** is the follow management service that:
1. ✅ Follows/unfollows users
2. ✅ Fetches follow lists
3. ✅ Gets follow status
4. ✅ Provides statistics
5. ✅ Supports request cancellation

It's the "follow API" - managing user relationships!


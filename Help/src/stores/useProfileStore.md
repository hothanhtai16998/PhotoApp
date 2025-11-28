# useProfileStore Explanation

## What is useProfileStore?

`useProfileStore` is a **Zustand store** that manages profile page state. It handles fetching profile user data, follow statistics, user statistics, and collections for a user profile.

## Key Features

### 1. **Profile User Data**
- Fetches user by username
- Fetches user by ID
- Loading states
- Request cancellation

### 2. **Follow Statistics**
- Followers count
- Following count
- Is following status

### 3. **User Statistics**
- User stats data
- Analytics data
- Performance metrics

### 4. **Collections**
- User collections
- Collections count
- Loading state

## Step-by-Step Breakdown

### Fetch Profile User

```typescript
fetchProfileUser: async (username?: string, userId?: string, signal?: AbortSignal) => {
  if (username) {
    set((state) => {
      state.profileUser = null;
      state.profileUserLoading = true;
    });

    try {
      const userData = await userService.getUserByUsername(username, signal);
      set((state) => {
        state.profileUser = userData;
        state.profileUserLoading = false;
      });
    } catch (error) {
      // Ignore cancelled requests
      if (axios.isCancel(error) || (error as { code?: string })?.code === 'ERR_CANCELED') {
        return;
      }
      // Handle error...
    }
  } else if (userId) {
    // Similar for userId
  } else {
    // Viewing own profile - clear profileUser
    set((state) => {
      state.profileUser = null;
      state.profileUserLoading = false;
    });
  }
},
```

**What this does:**
- Fetches user by username or ID
- Supports request cancellation
- Handles own profile (clears data)
- Updates loading state

### Fetch Follow Stats

```typescript
fetchFollowStats: async (userId: string, signal?: AbortSignal) => {
  try {
    const response = await followService.getUserFollowStats(userId, signal);
    set((state) => {
      state.followStats = response.stats;
    });
  } catch (error) {
    // Ignore cancelled requests
    if (axios.isCancel(error) || (error as { code?: string })?.code === 'ERR_CANCELED') {
      return;
    }
    console.error('Failed to fetch follow stats:', error);
  }
},
```

**What this does:**
- Fetches follow statistics
- Updates follow stats state
- Handles cancellation
- Silent error handling

### Fetch User Stats

```typescript
fetchUserStats: async (userId: string, signal?: AbortSignal) => {
  try {
    const stats = await userStatsService.getUserStats(userId, signal);
    set((state) => {
      state.userStats = stats;
    });
  } catch (error) {
    // Ignore cancelled requests
    // ...
  }
},
```

**What this does:**
- Fetches user statistics
- Updates user stats state
- Handles cancellation

### Fetch Collections

```typescript
fetchCollections: async (_userId: string, signal?: AbortSignal) => {
  set((state) => {
    state.collectionsLoading = true;
  });

  try {
    const data = await collectionService.getUserCollections(signal);
    set((state) => {
      state.collections = data;
      state.collectionsCount = data.length;
      state.collectionsLoading = false;
    });
  } catch (error) {
    // Handle error...
  }
},
```

**What this does:**
- Fetches user collections
- Updates collections and count
- Handles cancellation

### Clear Profile

```typescript
clearProfile: () => {
  set((state) => {
    state.profileUser = null;
    state.followStats = {
      followers: 0,
      following: 0,
      isFollowing: false,
    };
    state.userStats = null;
    state.collections = [];
    state.collectionsCount = 0;
  });
},
```

**What this does:**
- Clears all profile data
- Resets to initial state
- Used on navigation

## Usage Examples

### Fetch Profile

```typescript
const { profileUser, fetchProfileUser } = useProfileStore();

useEffect(() => {
  const signal = useRequestCancellation();
  fetchProfileUser(username, undefined, signal);
}, [username]);
```

### Fetch Stats

```typescript
const { followStats, fetchFollowStats } = useProfileStore();

useEffect(() => {
  if (profileUser?._id) {
    fetchFollowStats(profileUser._id);
  }
}, [profileUser]);
```

## Summary

**useProfileStore** is the profile state management store that:
1. ✅ Manages profile user data
2. ✅ Follow statistics
3. ✅ User statistics
4. ✅ Collections
5. ✅ Request cancellation

It's the "profile manager" - handling all profile page data!


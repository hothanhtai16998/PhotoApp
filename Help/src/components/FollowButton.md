# FollowButton Component Explanation

## What is FollowButton?

`FollowButton` is a **follow/unfollow button component** that allows users to follow or unfollow other users. It shows the current follow status and handles the follow action.

## Key Features

### 1. **Follow Status**
- Checks if user is following
- Updates on mount
- Real-time status

### 2. **Follow/Unfollow Action**
- Toggles follow status
- Shows loading state
- Success/error messages

### 3. **Self-Hide**
- Doesn't show for own profile
- Only shows for other users
- Better UX

## Step-by-Step Breakdown

### Fetch Follow Status

```typescript
useEffect(() => {
  const fetchFollowStatus = async () => {
    try {
      setLoading(true);
      const status = await followService.getFollowStatus(userId);
      if (status && typeof status.isFollowing === 'boolean') {
        setIsFollowing(status.isFollowing);
      } else {
        setIsFollowing(false);
      }
    } catch (error) {
      console.error('Failed to fetch follow status:', error);
      setIsFollowing(false);
    } finally {
      setLoading(false);
    }
  };

  if (userId && currentUser?._id) {
    fetchFollowStatus();
  } else {
    setLoading(false);
  }
}, [userId, currentUser?._id]);
```

**What this does:**
- Fetches follow status from API
- Updates local state
- Handles errors gracefully
- Only fetches if user is logged in

### Self-Hide Check

```typescript
if (!currentUser || currentUser._id === userId) {
  return null;
}
```

**What this does:**
- Hides button for own profile
- Only shows for other users
- Prevents self-follow

### Follow Handler

```typescript
const handleFollow = async () => {
  if (actionLoading) return;

  try {
    setActionLoading(true);
    if (isFollowing) {
      await followService.unfollowUser(userId);
      setIsFollowing(false);
      toast.success(`Đã bỏ theo dõi ${userDisplayName || 'người dùng'}`);
    } else {
      await followService.followUser(userId);
      setIsFollowing(true);
      toast.success(`Đã theo dõi ${userDisplayName || 'người dùng'}`);
    }
  } catch (error) {
    toast.error(getErrorMessage(error, 'Có lỗi xảy ra. Vui lòng thử lại.'));
  } finally {
    setActionLoading(false);
  }
};
```

**What this does:**
- Prevents double-clicks
- Toggles follow status
- Updates local state optimistically
- Shows success/error messages
- Handles errors

## Summary

**FollowButton** is the follow/unfollow interface that:
1. ✅ Shows follow status
2. ✅ Toggles follow/unfollow
3. ✅ Hides for own profile
4. ✅ Loading states
5. ✅ Error handling

It's the "social connector" - helping users follow each other!


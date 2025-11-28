# NotificationBell Component Explanation

## What is NotificationBell?

`NotificationBell` is the **notification component** that displays a bell icon with unread count and a dropdown showing all notifications. It supports real-time updates, polling, and various notification types.

## Key Features

### 1. **Real-Time Notifications**
- Polls for new notifications
- Shows unread count badge
- Updates automatically

### 2. **Notification Types**
- Collection invitations
- Image favorites
- Collection updates
- Upload status
- Admin actions
- And more...

### 3. **Notification Actions**
- Mark as read
- Mark all as read
- Delete notification
- Navigate to related content

### 4. **Custom Event Support**
- Listens for refresh events
- Updates when triggered
- Optimistic updates

## Step-by-Step Breakdown

### State Management

```typescript
const [notifications, setNotifications] = useState<Notification[]>([]);
const [unreadCount, setUnreadCount] = useState(0);
const [isOpen, setIsOpen] = useState(false);
const [loading, setLoading] = useState(true);
const [refreshing, setRefreshing] = useState(false);
```

**What these do:**
- `notifications`: All notifications
- `unreadCount`: Count of unread notifications
- `isOpen`: Dropdown open state
- `loading`: Initial load state
- `refreshing`: Refresh in progress

### Fetch Notifications

```typescript
const fetchNotifications = useCallback(async () => {
  if (!accessToken || !user?._id) return;

  try {
    setRefreshing(true);
    const response = await notificationService.getNotifications({
      page: 1,
      limit: 50,
    });
    setNotifications(response.notifications || []);
    setUnreadCount(response.unreadCount || 0);
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
}, [accessToken, user]);
```

**What this does:**
- Fetches notifications from API
- Updates notifications and unread count
- Handles errors gracefully
- Shows loading state

### Polling for Updates

```typescript
useEffect(() => {
  if (!accessToken || !user?._id) return;

  fetchNotifications();

  // Poll for new notifications every 30 seconds
  pollingIntervalRef.current = setInterval(() => {
    fetchNotifications();
  }, 30000);

  return () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
  };
}, [accessToken, user, fetchNotifications]);
```

**What this does:**
- Fetches notifications on mount
- Polls every 30 seconds
- Cleans up interval on unmount
- Real-time updates

### Custom Event Listener

```typescript
useEffect(() => {
  const handleRefresh = () => {
    fetchNotifications();
  };

  window.addEventListener('notification:refresh', handleRefresh);
  return () => {
    window.removeEventListener('notification:refresh', handleRefresh);
  };
}, [fetchNotifications]);
```

**What this does:**
- Listens for custom refresh event
- Refreshes notifications when triggered
- Used for optimistic updates
- Cleans up listener

### Notification Messages

```typescript
const getNotificationMessage = useCallback((notification: Notification): string => {
  const actorName = notification.actor?.displayName || notification.actor?.username || 'Ai đó';
  const collectionName = notification.collection?.name || 'bộ sưu tập';
  const imageTitle = notification.image?.imageTitle || 'ảnh của bạn';

  switch (notification.type) {
    case 'collection_invited': {
      const permission = notification.metadata?.permission;
      const permissionText = permission === 'admin' ? 'quản trị' : permission === 'edit' ? 'chỉnh sửa' : 'xem';
      return `${actorName} đã mời bạn tham gia bộ sưu tập "${collectionName}" với quyền ${permissionText}`;
    }
    case 'image_favorited':
      return `${actorName} đã yêu thích ảnh "${imageTitle}"`;
    // ... more cases
  }
}, []);
```

**What this does:**
- Generates user-friendly messages
- Handles different notification types
- Includes relevant context
- Localized in Vietnamese

### Mark as Read

```typescript
const handleMarkAsRead = async (notificationId: string) => {
  try {
    await notificationService.markAsRead(notificationId);
    setNotifications(prev => prev.map(n => 
      n._id === notificationId ? { ...n, read: true } : n
    ));
    setUnreadCount(prev => Math.max(0, prev - 1));
  } catch (error) {
    console.error('Failed to mark as read:', error);
  }
};
```

**What this does:**
- Marks notification as read
- Updates local state optimistically
- Decrements unread count
- Handles errors

## Summary

**NotificationBell** is the notification system that:
1. ✅ Displays unread count badge
2. ✅ Shows notification dropdown
3. ✅ Polls for updates
4. ✅ Supports custom refresh events
5. ✅ Handles various notification types
6. ✅ Provides notification actions

It's the "notification center" - keeping users informed of all activity!


# notificationService Explanation

## What is notificationService?

`notificationService` is a **service module** that provides notification-related API methods. It handles fetching notifications, marking as read, and managing notification state.

## Key Features

### 1. **Notification Operations**
- Get notifications
- Get unread count
- Mark as read
- Mark all as read
- Delete notification

### 2. **Filtering**
- Unread only filter
- Limit results
- Pagination support

### 3. **State Management**
- Tracks unread count
- Updates on read/delete
- Real-time updates

## Step-by-Step Breakdown

### Get Notifications

```typescript
getNotifications: async (params?: {
  unreadOnly?: boolean;
  limit?: number;
}): Promise<NotificationsResponse> => {
  const queryParams = new URLSearchParams();
  if (params?.unreadOnly) {
    queryParams.append('unreadOnly', 'true');
  }
  if (params?.limit) {
    queryParams.append('limit', params.limit.toString());
  }

  const queryString = queryParams.toString();
  const url = queryString ? `/notifications?${queryString}` : '/notifications';

  const response = await api.get<NotificationsResponse>(url, {
    withCredentials: true,
  });
  return response.data;
},
```

**What this does:**
- Fetches user notifications
- Filters unread only
- Limits results
- Builds query string

### Get Unread Count

```typescript
getUnreadCount: async (): Promise<number> => {
  const response = await api.get<UnreadCountResponse>('/notifications/unread-count', {
    withCredentials: true,
  });
  return response.data.unreadCount;
},
```

**What this does:**
- Gets unread notification count
- Used for badge display
- Lightweight endpoint

### Mark as Read

```typescript
markAsRead: async (notificationId: string): Promise<{ success: boolean; unreadCount: number }> => {
  const response = await api.patch(
    `/notifications/${notificationId}/read`,
    {},
    {
      withCredentials: true,
    }
  );
  return response.data;
},
```

**What this does:**
- Marks notification as read
- Returns updated unread count
- Used when viewing notification

### Mark All as Read

```typescript
markAllAsRead: async (): Promise<{ success: boolean }> => {
  const response = await api.patch(
    '/notifications/read-all',
    {},
    {
      withCredentials: true,
    }
  );
  return response.data;
},
```

**What this does:**
- Marks all notifications as read
- Bulk operation
- Used in notification dropdown

### Delete Notification

```typescript
deleteNotification: async (notificationId: string): Promise<{ success: boolean; unreadCount: number }> => {
  const response = await api.delete(`/notifications/${notificationId}`, {
    withCredentials: true,
  });
  return response.data;
},
```

**What this does:**
- Deletes notification
- Returns updated unread count
- Used for cleanup

## Usage Examples

### Get Notifications

```typescript
const response = await notificationService.getNotifications({
  unreadOnly: true,
  limit: 10,
});
```

### Get Unread Count

```typescript
const count = await notificationService.getUnreadCount();
```

### Mark as Read

```typescript
const result = await notificationService.markAsRead(notificationId);
console.log(result.unreadCount);
```

### Mark All as Read

```typescript
await notificationService.markAllAsRead();
```

## Summary

**notificationService** is the notification management service that:
1. ✅ Fetches notifications
2. ✅ Gets unread count
3. ✅ Marks as read
4. ✅ Deletes notifications
5. ✅ Filters and pagination

It's the "notification API" - managing user notifications!


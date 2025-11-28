# notification Types Explanation

## What is notification Types?

`notification` types is a **TypeScript type definitions file** that defines all notification-related types and interfaces. It provides type safety for notifications, notification types, and notification responses.

## Key Features

### 1. **Notification Interface**
- Complete notification structure
- Multiple notification types
- Metadata support
- Read status

### 2. **Response Types**
- Notifications response
- Unread count response

### 3. **Type Safety**
- TypeScript interfaces
- Union types for notification types
- Optional fields

## Step-by-Step Breakdown

### Notification Interface

```typescript
export interface Notification {
  _id: string;
  recipient: string;
  type: 
    | 'collection_invited' 
    | 'collection_image_added' 
    | 'collection_image_removed' 
    | 'image_favorited'
    | 'image_downloaded'
    | 'collection_favorited'
    | 'collection_shared'
    | 'upload_completed'
    | 'user_followed'
    | 'user_unfollowed'
    // ... many more types
    | 'system_announcement';
  collection?: {
    _id: string;
    name: string;
    coverImage?: {
      _id: string;
      thumbnailUrl?: string;
      smallUrl?: string;
    };
  };
  actor?: {
    _id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  image?: {
    _id: string;
    imageTitle?: string;
    thumbnailUrl?: string;
    smallUrl?: string;
  };
  metadata?: {
    permission?: string;
    collectionName?: string;
    changes?: string[];
    imageCount?: number;
    // ... more metadata fields
    [key: string]: unknown;
  };
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

**What this does:**
- Defines complete notification structure
- Multiple notification types (40+)
- Optional related data (collection, actor, image)
- Metadata for additional info
- Read status and timestamps

### Notification Types

**Collection Types:**
- `collection_invited`
- `collection_image_added`
- `collection_image_removed`
- `collection_permission_changed`
- `collection_removed`
- `collection_favorited`
- `collection_shared`
- `collection_updated`
- `collection_cover_changed`
- `collection_reordered`

**Image Types:**
- `image_favorited`
- `image_downloaded`
- `image_featured`
- `image_removed`
- `image_removed_admin`

**Upload Types:**
- `upload_completed`
- `upload_failed`
- `upload_processing`
- `bulk_upload_completed`

**User Types:**
- `user_followed`
- `user_unfollowed`
- `profile_viewed`
- `profile_updated`
- `account_verified`
- `account_warning`
- `account_banned`

**System Types:**
- `system_announcement`
- `feature_update`
- `maintenance_scheduled`
- `terms_updated`

### Notifications Response

```typescript
export interface NotificationsResponse {
  success: boolean;
  notifications: Notification[];
  unreadCount: number;
}
```

**What this does:**
- Defines notifications response
- Array of notifications
- Unread count
- Used for fetching notifications

### Unread Count Response

```typescript
export interface UnreadCountResponse {
  success: boolean;
  unreadCount: number;
}
```

**What this does:**
- Defines unread count response
- Simple count
- Used for badge display

## Usage Examples

### Notification Type

```typescript
import type { Notification } from '@/types/notification';

const notification: Notification = {
  _id: '123',
  type: 'image_favorited',
  recipient: 'userId',
  actor: { _id: 'actorId', username: 'john', displayName: 'John' },
  image: { _id: 'imageId', imageTitle: 'Sunset' },
  isRead: false,
  createdAt: '2024-01-01',
};
```

### Notifications Response

```typescript
import type { NotificationsResponse } from '@/types/notification';

const response: NotificationsResponse = await notificationService.getNotifications();
console.log(response.notifications);
console.log(response.unreadCount);
```

## Summary

**notification types** is the notification type definitions file that:
1. ✅ Defines Notification interface
2. ✅ 40+ notification types
3. ✅ Response types
4. ✅ Type safety
5. ✅ Complete structure

It's the "notification types" - ensuring type safety for notifications!


# Notification Implementation Guide

Quick reference guide for implementing new notification types in PhotoApp.

## Quick Start Checklist

When adding a new notification type:

1. ✅ Add notification type to `Notification` model enum
2. ✅ Create notification in controller after action
3. ✅ Add icon to `getNotificationIcon()` in `NotificationBell.tsx`
4. ✅ Add message to `getNotificationMessage()` in `NotificationBell.tsx`
5. ✅ Test notification appears in dropdown
6. ✅ Test navigation works correctly
7. ✅ Test mark as read/delete works

## Step-by-Step Implementation

### Step 1: Backend - Add Notification Type

**File**: `backend/src/models/Notification.js`

```javascript
// Add to enum in schema
type: {
  type: String,
  required: true,
  enum: [
    // ... existing types
    'image_favorited',        // NEW
    'image_commented',        // NEW
    'collection_favorited',    // NEW
    // ... etc
  ],
}
```

### Step 2: Backend - Create Notification

**File**: `backend/src/controllers/[relevantController].js`

```javascript
import Notification from '../models/Notification.js';

// In your controller function, after the main action:
try {
  await Notification.create({
    recipient: targetUserId,        // Who receives notification
    type: 'image_favorited',         // Notification type
    image: imageId,                  // Related image (if applicable)
    collection: collectionId,        // Related collection (if applicable)
    actor: userId,                   // Who performed the action
    metadata: {                      // Optional additional data
      // ... any extra info
    },
  });
} catch (notifError) {
  // Log but don't fail the main operation
  logger.error('Failed to create notification:', notifError);
}
```

**Important Rules:**
- ✅ Always check: `recipient !== actor` (don't notify yourself)
- ✅ Use try-catch (don't break main functionality)
- ✅ Create notification AFTER main action succeeds
- ✅ Populate related data if needed

### Step 3: Frontend - Add Notification Icon

**File**: `frontend/src/components/NotificationBell.tsx`

```typescript
const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    // ... existing cases
    case 'image_favorited':
      return <Heart size={16} />;
    case 'image_commented':
      return <MessageCircle size={16} />;
    // ... etc
  }
};
```

### Step 4: Frontend - Add Notification Message

**File**: `frontend/src/components/NotificationBell.tsx`

```typescript
const getNotificationMessage = (notification: Notification): string => {
  const actorName = notification.actor?.displayName || notification.actor?.username || 'Ai đó';
  const collectionName = notification.collection?.name || 'bộ sưu tập';
  const imageTitle = notification.image?.imageTitle || 'ảnh';

  switch (notification.type) {
    // ... existing cases
    case 'image_favorited':
      return `${actorName} đã yêu thích ảnh "${imageTitle}"`;
    case 'image_commented':
      return `${actorName} đã bình luận về ảnh "${imageTitle}"`;
    // ... etc
  }
};
```

### Step 5: Frontend - Update TypeScript Types

**File**: `frontend/src/services/notificationService.ts`

```typescript
export interface Notification {
  // ... existing fields
  type: 
    | 'collection_invited'
    | 'collection_image_added'
    | 'collection_image_removed'
    | 'collection_permission_changed'
    | 'collection_removed'
    | 'image_favorited'        // NEW
    | 'image_commented'        // NEW
    | 'collection_favorited';  // NEW
  // ... rest of interface
}
```

### Step 6: Test Implementation

1. **Trigger the action** (e.g., favorite an image)
2. **Check database** - Notification should be created
3. **Check frontend** - Badge should update (may take 3-5 seconds)
4. **Click bell** - Notification should appear
5. **Click notification** - Should navigate correctly
6. **Mark as read** - Should work
7. **Delete** - Should work

## Common Patterns

### Pattern 1: Notify Owner When Action Performed

```javascript
// Example: Image favorited
if (image.uploadedBy.toString() !== userId.toString()) {
  await Notification.create({
    recipient: image.uploadedBy,
    type: 'image_favorited',
    image: imageId,
    actor: userId,
  });
}
```

### Pattern 2: Notify Multiple Users

```javascript
// Example: Image added to collection - notify all collaborators
const collaborators = collection.collaborators || [];
const notificationPromises = collaborators
  .filter(collab => collab.user.toString() !== userId.toString())
  .map(collab =>
    Notification.create({
      recipient: collab.user,
      type: 'collection_image_added',
      collection: collectionId,
      actor: userId,
      image: imageId,
    })
  );
await Promise.all(notificationPromises);
```

### Pattern 3: Conditional Notification

```javascript
// Example: Only notify on first favorite, not every toggle
const wasAlreadyFavorited = user.favorites.includes(imageId);
if (!wasAlreadyFavorited && image.uploadedBy.toString() !== userId.toString()) {
  await Notification.create({
    recipient: image.uploadedBy,
    type: 'image_favorited',
    image: imageId,
    actor: userId,
  });
}
```

## Notification Message Templates

### Image Notifications:
- `"${actorName} đã yêu thích ảnh "${imageTitle}""`
- `"${actorName} đã tải xuống ảnh "${imageTitle}""`
- `"${actorName} đã bình luận về ảnh "${imageTitle}""`

### Collection Notifications:
- `"${actorName} đã yêu thích bộ sưu tập "${collectionName}""`
- `"${actorName} đã chia sẻ bộ sưu tập "${collectionName}""`

### Comment Notifications:
- `"${actorName} đã trả lời bình luận của bạn"`
- `"${actorName} đã đề cập bạn trong bình luận"`

## Icon Mapping

| Notification Type | Icon | Import |
|------------------|------|--------|
| `image_favorited` | Heart | `lucide-react` |
| `image_commented` | MessageCircle | `lucide-react` |
| `image_downloaded` | Download | `lucide-react` |
| `collection_favorited` | Heart | `lucide-react` |
| `user_followed` | UserPlus | `lucide-react` |
| `upload_completed` | CheckCircle | `lucide-react` |
| `upload_failed` | XCircle | `lucide-react` |

## Troubleshooting

### Notification not appearing?
1. Check database - was it created?
2. Check recipient ID matches logged-in user
3. Check polling interval (3-5 seconds)
4. Check browser console for errors
5. Verify notification type is in enum

### Badge count wrong?
1. Check `isRead` field
2. Verify unread count query
3. Check for duplicate notifications
4. Verify recipient filtering

### Navigation not working?
1. Check `collection._id` or `image._id` exists
2. Verify route exists
3. Check `navigate()` function
4. Test with console.log

## Performance Tips

1. **Batch notifications** - Use `Promise.all()` for multiple
2. **Index database** - Add indexes for common queries
3. **Limit history** - Keep only last 100 notifications
4. **Cleanup old** - Delete read notifications after 30 days
5. **Rate limit** - Prevent notification spam

## Code Examples

### Complete Example: Image Favorite Notification

**Backend** (`favoriteController.js`):
```javascript
export const toggleFavorite = asyncHandler(async (req, res) => {
  const { imageId } = req.params;
  const userId = req.user._id;
  
  const image = await Image.findById(imageId).populate('uploadedBy');
  if (!image) {
    return res.status(404).json({ success: false, message: 'Image not found' });
  }
  
  const user = await User.findById(userId);
  const isFavorited = user.favorites.includes(imageId);
  
  if (isFavorited) {
    user.favorites = user.favorites.filter(id => id.toString() !== imageId);
    await user.save();
  } else {
    user.favorites.push(imageId);
    await user.save();
    
    // Create notification for image owner
    if (image.uploadedBy._id.toString() !== userId.toString()) {
      try {
        await Notification.create({
          recipient: image.uploadedBy._id,
          type: 'image_favorited',
          image: imageId,
          actor: userId,
        });
      } catch (notifError) {
        logger.error('Failed to create favorite notification:', notifError);
      }
    }
  }
  
  res.json({ success: true, isFavorited: !isFavorited });
});
```

**Frontend** (`NotificationBell.tsx`):
```typescript
// In getNotificationIcon()
case 'image_favorited':
  return <Heart size={16} />;

// In getNotificationMessage()
case 'image_favorited':
  const imageTitle = notification.image?.imageTitle || 'của bạn';
  return `${actorName} đã yêu thích ảnh "${imageTitle}"`;
```

## Next Steps

1. Review `NOTIFICATION_EXPANSION_ROADMAP.md` for feature ideas
2. Choose a notification type to implement
3. Follow this guide step-by-step
4. Test thoroughly
5. Deploy and monitor

## Questions?

- Check existing notification implementations for reference
- Review `Notification` model schema
- Check `NotificationBell.tsx` for frontend patterns
- Review `notificationController.js` for backend patterns


# Notification System Expansion Roadmap

This document outlines potential notification features to expand the current notification system in PhotoApp.

## Current Implementation ✅

The following notification types are already implemented:

- `collection_invited` - User invited to a collection
- `collection_image_added` - Image added to collection
- `collection_image_removed` - Image removed from collection
- `collection_permission_changed` - Collaborator permission changed
- `collection_removed` - User removed from collection

## High Priority Features 🎯

### 1. Image Comments & Interactions

#### Notification Types:

- `image_commented` - Someone commented on user's image
- `comment_replied` - Someone replied to user's comment
- `comment_mentioned` - User mentioned in a comment (@username)
- `image_favorited` - Someone favorited user's image
- `image_downloaded` - Someone downloaded user's image

#### Implementation Details:

```typescript
// New notification types to add to Notification model
enum NotificationType {
  // ... existing types
  'image_commented',
  'comment_replied',
  'comment_mentioned',
  'image_favorited',
  'image_downloaded',
}
```

#### Where to Trigger:

- **Image Comments**: In `commentController.js` when creating/replying to comments
- **Image Favorites**: In `favoriteController.js` when toggling favorites
- **Image Downloads**: In `imageController.js` when downloading images

#### Database Schema:

```javascript
// Notification model already supports:
{
  recipient: ObjectId,      // User receiving notification
  type: String,             // Notification type
  collection: ObjectId,     // Related collection (if applicable)
  actor: ObjectId,          // User who performed action
  image: ObjectId,          // Related image (if applicable)
  comment: ObjectId,        // NEW: Related comment (if applicable)
  metadata: Object,         // Additional data
  isRead: Boolean,
  readAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```

#### Frontend Display:

- Show comment preview in notification
- Link to specific comment thread
- Show image thumbnail
- Show actor avatar

---

### 2. Collection Favorites

#### Notification Types:

- `collection_favorited` - Someone favorited user's collection
- `collection_shared` - Someone shared user's collection

#### Implementation Details:

```typescript
// Trigger when:
// - User favorites a collection (in collectionFavoriteController.js)
// - User shares a collection (in collectionShare component)
```

#### Where to Trigger:

- **Collection Favorites**: In `collectionFavoriteController.js` when toggling favorites
- **Collection Sharing**: In `CollectionShare.tsx` when sharing via social media

---

### 3. Upload Status Notifications

#### Notification Types:

- `upload_completed` - Image upload completed successfully
- `upload_failed` - Image upload failed
- `upload_processing` - Image is being processed
- `bulk_upload_completed` - Multiple images uploaded

#### Implementation Details:

```typescript
// Trigger in:
// - UploadModal.tsx after successful upload
// - useImageUpload.ts hook during upload process
```

#### Use Cases:

- Notify user when large batch upload completes
- Alert user of upload failures
- Show processing progress

---

## Medium Priority Features 📋

### 4. Social Features

#### Notification Types:

- `user_followed` - Someone started following user
- `user_unfollowed` - Someone unfollowed user
- `profile_viewed` - Someone viewed user's profile (optional, privacy-sensitive)

#### Implementation Details:

- Requires user follow/follower system
- Profile view tracking (consider privacy implications)

---

### 5. Image Tags & Mentions

#### Notification Types:

- `image_tagged` - User tagged in an image
- `collection_tagged` - User tagged in a collection
- `tag_removed` - Tag removed from image/collection

#### Implementation Details:

- Requires tagging system for images
- Mention system (@username) in descriptions/comments

---

### 6. Collection Updates

#### Notification Types:

- `collection_updated` - Collection details changed
- `collection_cover_changed` - Collection cover image changed
- `collection_reordered` - Images reordered in collection

#### Implementation Details:

- Notify collaborators when collection is modified
- Show what changed in metadata

---

### 7. Admin Actions

#### Notification Types:

- `image_featured` - Image featured on homepage
- `image_removed` - Image removed by admin
- `account_verified` - Account verified by admin
- `account_warning` - Account warning issued
- `account_banned` - Account banned

#### Implementation Details:

- Trigger in admin controllers
- Important notifications (require user acknowledgment)

---

## Low Priority Features 🔮

### 8. System Announcements

#### Notification Types:

- `system_announcement` - System-wide announcement
- `feature_update` - New feature released
- `maintenance_scheduled` - Maintenance scheduled
- `terms_updated` - Terms of service updated

#### Implementation Details:

- Admin can send to all users or specific groups
- Can be persistent (require dismissal)

---

### 9. Account Security

#### Notification Types:

- `login_new_device` - Login from new device
- `password_changed` - Password changed
- `email_changed` - Email address changed
- `two_factor_enabled` - 2FA enabled/disabled

#### Implementation Details:

- Security-critical notifications
- Should be non-dismissible or require acknowledgment

---

### 10. Analytics & Milestones

#### Notification Types:

- `milestone_reached` - "Your image reached 1000 views"
- `achievement_unlocked` - "You uploaded 100 images!"
- `trending_image` - "Your image is trending"

#### Implementation Details:

- Gamification features
- Engagement boosters

---

## Implementation Priority Matrix

| Feature              | Priority | Complexity | Impact | Estimated Time |
| -------------------- | -------- | ---------- | ------ | -------------- |
| Image Comments       | High     | Medium     | High   | 2-3 days       |
| Image Favorites      | High     | Low        | Medium | 1 day          |
| Collection Favorites | High     | Low        | Medium | 1 day          |
| Upload Status        | High     | Medium     | Medium | 1-2 days       |
| Image Downloads      | Medium   | Low        | Low    | 0.5 day        |
| User Follows         | Medium   | Medium     | High   | 2-3 days       |
| Image Tags           | Medium   | Medium     | Medium | 2 days         |
| Admin Actions        | Medium   | Low        | Medium | 1 day          |
| System Announcements | Low      | Medium     | Low    | 1-2 days       |
| Account Security     | Low      | Low        | High   | 1 day          |

## Database Schema Updates Needed

### Add to Notification Model:

```javascript
{
  // ... existing fields
  comment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
  },
  follow: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Follow',
  },
  // ... other new references
}
```

### New Models Needed:

- `Comment` model (if not exists)
- `Follow` model (for user follows)
- `Tag` model (for image/collection tagging)

## Frontend Components to Update

### NotificationBell.tsx

- Add new notification icons for each type
- Update `getNotificationMessage()` function
- Add notification grouping (e.g., "3 new comments")
- Add notification filtering by type

### Notification Service

```typescript
// Add to notificationService.ts
export interface Notification {
  // ... existing fields
  comment?: Comment;
  follow?: Follow;
  // ... other new fields
}
```

## Backend Controllers to Update

### Files to Modify:

1. `backend/src/controllers/commentController.js` (if exists)
2. `backend/src/controllers/favoriteController.js`
3. `backend/src/controllers/imageController.js`
4. `backend/src/controllers/collectionFavoriteController.js`
5. `backend/src/controllers/adminController.js`

### Pattern to Follow:

```javascript
// Example: In favoriteController.js
export const toggleFavorite = asyncHandler(async (req, res) => {
  // ... existing favorite logic

  // Create notification for image owner
  if (image.uploadedBy.toString() !== userId.toString()) {
    await Notification.create({
      recipient: image.uploadedBy,
      type: 'image_favorited',
      image: imageId,
      actor: userId,
    });
  }

  // ... rest of logic
});
```

## Notification Preferences (Future)

Allow users to customize which notifications they receive:

```typescript
interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  notificationTypes: {
    image_commented: boolean;
    image_favorited: boolean;
    collection_invited: boolean;
    // ... etc
  };
}
```

## Real-time Updates (Future Enhancement)

### Current: Polling (3-5 seconds)

- Simple, works with current architecture
- Good for current user base

### Future: WebSocket/SSE

- Real-time notifications
- Better for large user base
- Requires infrastructure changes

### Migration Path:

1. Keep polling as fallback
2. Add WebSocket for real-time
3. Gradually migrate users
4. Remove polling when stable

## Testing Checklist

For each new notification type:

- [ ] Notification created in database
- [ ] Notification appears in bell dropdown
- [ ] Badge count updates correctly
- [ ] Clicking notification navigates correctly
- [ ] Mark as read works
- [ ] Delete notification works
- [ ] Toast notification appears (if enabled)
- [ ] Browser notification appears (if permission granted)
- [ ] Mobile responsive
- [ ] Performance (no lag with many notifications)

## Performance Considerations

### Indexing:

```javascript
// Add indexes for common queries
notificationSchema.index({ recipient: 1, type: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ actor: 1, createdAt: -1 });
```

### Cleanup:

- Auto-delete read notifications older than 30 days
- Archive old notifications
- Limit notification history (keep last 100)

### Rate Limiting:

- Prevent notification spam
- Limit notifications per user per hour
- Batch similar notifications

## Example Implementation: Image Favorites

### Backend (favoriteController.js):

```javascript
export const toggleFavorite = asyncHandler(async (req, res) => {
  const { imageId } = req.params;
  const userId = req.user._id;

  const image = await Image.findById(imageId);
  if (!image) {
    return res.status(404).json({ success: false, message: 'Image not found' });
  }

  // ... existing favorite toggle logic

  // Create notification if favoriting (not unfavoriting)
  if (isFavorited && image.uploadedBy.toString() !== userId.toString()) {
    try {
      await Notification.create({
        recipient: image.uploadedBy,
        type: 'image_favorited',
        image: imageId,
        actor: userId,
      });
    } catch (notifError) {
      logger.error('Failed to create favorite notification:', notifError);
    }
  }

  // ... return response
});
```

### Frontend (NotificationBell.tsx):

```typescript
// Add to getNotificationIcon()
case 'image_favorited':
  return <Heart size={16} />;

// Add to getNotificationMessage()
case 'image_favorited':
  return `${actorName} đã yêu thích ảnh "${imageTitle || 'của bạn'}"`;
```

## Notes

- Always check if recipient is different from actor (don't notify yourself)
- Use try-catch for notification creation (don't fail main operation)
- Consider notification preferences (future)
- Group similar notifications (e.g., "3 people favorited your image")
- Add notification sound option (future)
- Consider notification channels (in-app, email, push)

## Last Updated

- Date: 2024
- Current Status: Collection notifications implemented
- Next Steps: Implement high-priority features (Image Comments, Favorites)

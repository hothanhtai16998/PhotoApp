### 1. Collection Notifications ✅

#### 1.3 Collection Image Removed (not work)

- [ ✅] **Test**: User A removes an image from a collection where User B is a collaborator
- [X ] **Expected**: User B receives `collection_image_removed` notification
- [x ] **Check**: Notification shows correct collection name

### 2. Image Interactions ✅

#### 2.2 Image Downloaded (not work)

- [ X] **Test**: User A downloads an image uploaded by User B (must be authenticated)
- [ X] **Expected**: User B receives `image_downloaded` notification
- [X ] **Check**:
  - Notification shows User A's name
  - Notification shows image title
  - Clicking notification navigates to the image

---

### 3. Collection Interactions ✅

#### 3.1 Collection Favorited

- [ ] **Test**: User A favorites a collection created by User B
- [ ] **Expected**: User B receives `collection_favorited` notification
- [ ] **Check**:
  - Notification shows User A's name
  - Notification shows collection name
  - Clicking notification navigates to the collection

#### 3.2 Collection Shared

- [ ] **Test**: User A shares a collection created by User B
- [ ] **Expected**: User B receives `collection_shared` notification
- [ ] **Check**: Notification shows correct collection name

### 5. Collection Updates ✅

#### 5.1 Collection Updated (not work)

- [ ] **Test**: User A updates collection details (name, description) where User B is collaborator
- [ ] **Expected**: User B receives `collection_updated` notification
- [ ] **Check**: Notification shows what changed

#### 5.2 Collection Cover Changed (not work)

- [ ] **Test**: User A changes collection cover image where User B is collaborator
- [ ] **Expected**: User B receives `collection_cover_changed` notification
- [ ] **Check**: Notification shows collection name

### 6. Admin Actions ✅

#### 6.2 User Banned (the noti not show if ban with no reason)

- [ ✅] **Test**: Admin bans a user
- [✅ ] **Expected**: Banned user receives `user_banned_admin` notification
- [ ✅] **Check**: Notification shows ban reason

#### 6.3 User Unbanned(the noti not show if ban with no reason)

- [✅ ] **Test**: Admin unbans a user
- [ ✅] **Expected**: Unbanned user receives `user_unbanned_admin` notification
- [✅ ] **Check**: Notification appears correctly

#### 6.4 System Announcement (not work, not have)

- [ ] **Test**: Admin creates a system announcement
- [ ] **Expected**: All users receive `system_announcement` notification
- [ ] **Check**:
  - Notification shows announcement title
  - Notification shows message
  - All users see it

---

### 7. Profile & Account Security ✅

#### 7.2 Password Changed

- [ ] **Test**: User changes their password
- [ ] **Expected**: User receives `password_changed` notification
- [ ] **Check**: Notification shows IP address

#### 7.3 Email Changed

- [ ] **Test**: User changes their email
- [ ] **Expected**: User receives `email_changed` notification
- [ ] **Check**: Notification shows old and new email

#### 7.4 Login New Device (not have logic yet)

- [ ] **Test**: User logs in from a new device/browser
- [ ] **Expected**: User receives `login_new_device` notification
- [ ] **Check**: Notification shows device info and IP

---

### 8. Content Reports ✅

#### 8.1 Image Reported (it work but admin dont see the report reason)

- [✅ ] **Test**: User A reports an image uploaded by User B
- [✅ ] **Expected**:
  - Admins receive `image_reported` notification
  - Notification shows report reason
- [ ] **Check**:
  - Admin can see the report
  - Notification shows image title and reason

#### 8.2 Collection Reported

- [ ] **Test**: User A reports a collection created by User B
- [ ] **Expected**: Admins receive `collection_reported` notification
- [ ] **Check**: Notification shows collection name and reason

#### 8.3 User Reported (not yet, need create view user profile)

- [ ] **Test**: User A reports User B
- [ ] **Expected**: Admins receive `user_reported` notification
- [ ] **Check**: Notification shows report reason

---

## Testing Steps

### Step 1: Setup

1. Start backend server
2. Start frontend
3. Create/use 2 test accounts:
   - User A: `testuser1@example.com`
   - User B: `testuser2@example.com`
4. Login as User A in one browser
5. Login as User B in another browser (or incognito)

### Step 2: Test Each Category

1. Go through each category above
2. For each notification type:
   - Perform the action that triggers the notification
   - Check notification appears in bell
   - Check notification message is correct
   - Check notification icon is correct
   - Check clicking notification navigates correctly
   - Mark as read and verify it works
   - Delete notification and verify it works

### Step 3: Edge Cases

- [ ] Test notifications when user is not logged in (should not receive)
- [ ] Test notifications when user is viewing their own content (should not receive)
- [ ] Test multiple rapid notifications (should all appear)
- [ ] Test notification badge count updates correctly
- [ ] Test notification polling (should update every 5 seconds)
- [ ] Test mark all as read
- [ ] Test notification persistence (refresh page, notifications should remain)

### Step 4: Performance

- [ ] Test with many notifications (100+)
- [ ] Test notification loading speed
- [ ] Test notification dropdown performance

---

## Common Issues to Watch For

1. **Notification not appearing**

   - Check backend logs for errors
   - Check browser console for errors
   - Verify notification was created in database
   - Check notification polling is working

2. **Wrong notification message**

   - Check actor name is populated
   - Check related entity (image/collection) is populated
   - Check metadata is correct

3. **Navigation not working**

   - Check notification click handler
   - Check route exists
   - Check image/collection ID is correct

4. **Notification badge not updating**
   - Check unread count API
   - Check polling interval
   - Check notification state updates

---

## Quick Test Script

```bash
# 1. Test Image Favorite
# - Login as User A
# - Find an image uploaded by User B
# - Click favorite button
# - Check User B's notifications

# 2. Test Follow
# - Login as User A
# - Hover over User B's name in image modal
# - Click Follow button
# - Check User B's notifications

# 3. Test Collection Invite
# - Login as User A
# - Create a collection
# - Invite User B
# - Check User B's notifications

# 4. Test Upload
# - Login as User A
# - Upload an image
# - Check User A's notifications for upload_completed

# 5. Test Report
# - Login as User A
# - Report an image
# - Login as Admin
# - Check Admin's notifications for image_reported
```

---

## Notes

- Some notifications may not appear if the recipient is the same as the actor (e.g., favoriting your own image)
- Admin notifications require admin privileges
- System announcements go to all users
- Follow notifications are created for both follow and unfollow (unfollow is optional)

---

## Test Results Template

```
Date: [Date]
Tester: [Name]

Category 1: Collection Notifications
- [ ] All tests passed
- [ ] Issues found: [List issues]

Category 2: Image Interactions
- [ ] All tests passed
- [ ] Issues found: [List issues]

... (continue for all categories)
```

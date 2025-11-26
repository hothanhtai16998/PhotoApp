# Quick Notification Testing Guide

## 🚀 Quick Start Testing

### Setup (5 minutes)
1. **Start servers**
   ```bash
   # Terminal 1: Backend
   cd backend
   npm start

   # Terminal 2: Frontend
   cd frontend
   npm run dev
   ```

2. **Prepare test accounts**
   - Use existing accounts OR create 2 new accounts:
     - User A: `test1@example.com`
     - User B: `test2@example.com`
   - Make sure you have an admin account for admin tests

3. **Open browsers**
   - Browser 1: Login as User A (Chrome)
   - Browser 2: Login as User B (Firefox or Incognito)

---

## 📋 Test Order (Recommended)

### Phase 1: Basic Interactions (15 minutes)

#### Test 1: Image Favorite ⭐
**Action**: User A favorites User B's image
1. User B: Upload an image
2. User A: Find that image, click ❤️ favorite
3. User B: Check notification bell 🔔
4. ✅ Should see: "User A đã yêu thích ảnh [image title]"

#### Test 2: Follow User ⭐
**Action**: User A follows User B
1. User A: Open any image uploaded by User B
2. User A: Hover over User B's name (top left of image modal)
3. User A: Click "Follow" button in the profile card
4. User B: Check notification bell 🔔
5. ✅ Should see: "User A đã bắt đầu theo dõi bạn" with UserPlus icon

#### Test 3: Collection Favorite
**Action**: User A favorites User B's collection
1. User B: Create a collection
2. User A: Open the collection, click ❤️ favorite
3. User B: Check notification bell 🔔
4. ✅ Should see: "User A đã yêu thích bộ sưu tập [collection name]"

---

### Phase 2: Collection Collaboration (20 minutes)

#### Test 4: Collection Invite
**Action**: User A invites User B to a collection
1. User A: Create a collection
2. User A: Click "Invite" or "Add Collaborator"
3. User A: Search for User B and invite them
4. User B: Check notification bell 🔔
5. ✅ Should see: "User A đã mời bạn tham gia bộ sưu tập [name] với quyền [permission]"

#### Test 5: Collection Image Added
**Action**: User A adds image to shared collection
1. User A: Add an image to the collection where User B is a collaborator
2. User B: Check notification bell 🔔
3. ✅ Should see: "User A đã thêm ảnh vào bộ sưu tập [name]"

#### Test 6: Collection Updated
**Action**: User A updates collection details
1. User A: Edit collection name or description
2. User B: Check notification bell 🔔
3. ✅ Should see: "User A đã cập nhật [changes] của bộ sưu tập [name]"

---

### Phase 3: Upload & Processing (10 minutes)

#### Test 7: Upload Completed
**Action**: User uploads an image
1. User A: Upload a single image
2. User A: Check notification bell 🔔
3. ✅ Should see: "Ảnh [title] đã tải lên thành công"

#### Test 8: Bulk Upload
**Action**: User uploads multiple images
1. User A: Upload 3-5 images at once
2. User A: Check notification bell 🔔
3. ✅ Should see: "Đã tải lên thành công X/Y ảnh"

---

### Phase 4: Reports (10 minutes)

#### Test 9: Report Image
**Action**: User A reports User B's image
1. User A: Open User B's image
2. User A: Click "Report" button (in footer)
3. User A: Select reason and submit
4. Admin: Check notification bell 🔔
5. ✅ Should see: "Ảnh [title] đã được báo cáo: [reason]"

---

### Phase 5: Profile & Security (10 minutes)

#### Test 10: Profile Updated
**Action**: User updates their profile
1. User A: Go to profile edit page
2. User A: Change display name or bio
3. User A: Save changes
4. User A: Check notification bell 🔔
5. ✅ Should see: "Hồ sơ của bạn đã được cập nhật: [fields]"

#### Test 11: Password Changed
**Action**: User changes password
1. User A: Go to profile settings
2. User A: Change password
3. User A: Check notification bell 🔔
4. ✅ Should see: "Mật khẩu của bạn đã được thay đổi từ [IP]"

---

### Phase 6: Admin Actions (Requires Admin) (10 minutes)

#### Test 12: System Announcement
**Action**: Admin creates announcement
1. Admin: Go to admin panel
2. Admin: Create system announcement
3. All Users: Check notification bell 🔔
4. ✅ Should see: "[Title]: [Message]" with Megaphone icon

#### Test 13: Ban User
**Action**: Admin bans a user
1. Admin: Ban User B
2. User B: Check notification bell 🔔
3. ✅ Should see: "Tài khoản của bạn đã bị cấm bởi [admin]: [reason]"

---

## 🔍 What to Check for Each Notification

1. **Appearance**
   - ✅ Notification appears in bell dropdown
   - ✅ Badge count increases
   - ✅ Correct icon displayed
   - ✅ Correct message (Vietnamese)

2. **Functionality**
   - ✅ Clicking notification navigates correctly
   - ✅ Mark as read works
   - ✅ Delete notification works
   - ✅ Badge count decreases after marking as read

3. **Timing**
   - ✅ Notification appears within 5 seconds (polling)
   - ✅ Notification time shows correctly ("Vừa xong", "5 phút trước", etc.)

---

## 🐛 Common Issues & Fixes

### Issue: Notification not appearing
**Check:**
- Backend server is running
- User is logged in
- Notification was created in database (check MongoDB)
- Browser console for errors
- Network tab for API errors

**Fix:**
- Check backend logs
- Verify notification service is polling
- Check notification bell component is mounted

### Issue: Wrong notification message
**Check:**
- Actor (user who performed action) is populated
- Related entity (image/collection) is populated
- Metadata is correct

**Fix:**
- Check backend controller creates notification with correct data
- Verify database has correct references

### Issue: Navigation not working
**Check:**
- Route exists in frontend
- Image/collection ID is correct
- Notification click handler is working

**Fix:**
- Check `handleNotificationClick` in NotificationBell.tsx
- Verify routes in App.tsx

---

## 📊 Test Results Log

```
Date: ___________
Tester: ___________

✅ = Passed
❌ = Failed
⚠️ = Partial/Issue

Phase 1: Basic Interactions
[ ] Test 1: Image Favorite - ✅/❌
[ ] Test 2: Follow User - ✅/❌
[ ] Test 3: Collection Favorite - ✅/❌

Phase 2: Collection Collaboration
[ ] Test 4: Collection Invite - ✅/❌
[ ] Test 5: Collection Image Added - ✅/❌
[ ] Test 6: Collection Updated - ✅/❌

Phase 3: Upload & Processing
[ ] Test 7: Upload Completed - ✅/❌
[ ] Test 8: Bulk Upload - ✅/❌

Phase 4: Reports
[ ] Test 9: Report Image - ✅/❌

Phase 5: Profile & Security
[ ] Test 10: Profile Updated - ✅/❌
[ ] Test 11: Password Changed - ✅/❌

Phase 6: Admin Actions
[ ] Test 12: System Announcement - ✅/❌
[ ] Test 13: Ban User - ✅/❌

Issues Found:
1. 
2. 
3. 
```

---

## 🎯 Priority Tests (Do These First)

If you're short on time, test these critical notifications first:

1. ⭐ **Image Favorite** - Most common user interaction
2. ⭐ **Follow User** - Just implemented, needs verification
3. ⭐ **Collection Invite** - Core collaboration feature
4. ⭐ **Upload Completed** - User feedback for uploads
5. ⭐ **Report Image** - Content moderation

---

## 💡 Tips

- Use browser DevTools to monitor network requests
- Check MongoDB directly to verify notifications are created
- Test with different user roles (regular, admin)
- Test edge cases (own content, already favorited, etc.)
- Keep browser console open to catch errors

---

## Next Steps After Testing

1. Document any bugs found
2. Fix critical issues
3. Test edge cases
4. Performance testing with many notifications
5. User acceptance testing


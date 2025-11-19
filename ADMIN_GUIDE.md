# Admin Panel User Guide

## Quick Start

### Step 1: Make a User an Admin

First, you need to set at least one user as an admin. You can do this via command line:

```bash
cd backend
npm run make:admin <username>
```

**Example:**
```bash
npm run make:admin john
```

This will make the user with username "john" an admin.

### Step 2: Access the Admin Panel

1. **Sign in** to your account (the one you made admin)
2. **Navigate** to `/admin` in your browser
   - Or add a link in your header/navigation to `/admin`
3. You'll see the admin dashboard

---

## Admin Panel Features

### 📊 Dashboard Tab

The dashboard provides an overview of your website:

- **Statistics Cards:**
  - Total Users
  - Total Images
  - Number of Categories

- **Top Categories:**
  - Shows the most popular categories
  - Displays how many images are in each category

- **Recent Users:**
  - Shows the 5 most recently registered users
  - Displays username, email, display name, admin status, and join date

- **Recent Images:**
  - Shows the 10 most recently uploaded images
  - Displays title, category, uploader, and upload date

### 👥 Users Tab

Manage all users on your website:

**Features:**
- **Search Users:** Use the search bar to find users by username, email, or display name
- **View User List:** See all users with their details
- **Edit User:** Click the edit button (pencil icon) to modify:
  - Display Name
  - Email
  - Bio
- **Toggle Admin Status:** Click the checkmark/X button to make a user admin or remove admin status
- **Delete User:** Click the delete button (trash icon) to delete a user
  - ⚠️ **Warning:** This will also delete all images uploaded by that user
  - You cannot delete your own account

**Pagination:**
- Navigate through pages of users using Previous/Next buttons
- Shows current page and total pages

### 🖼️ Images Tab

Manage all images on your website:

**Features:**
- **Search Images:** Use the search bar to find images by title or location
- **View Images:** Browse all images in a grid layout
- **Delete Images:** Click the "Delete" button on any image card to remove it
  - ⚠️ **Warning:** This permanently deletes the image from both database and Cloudinary

**Pagination:**
- Navigate through pages of images using Previous/Next buttons

---

## Making Users Admin via Database (Alternative Method)

If you prefer to use MongoDB directly:

1. Connect to your MongoDB database
2. Find the user:
   ```javascript
   db.users.findOne({ username: "yourusername" })
   ```
3. Update the user:
   ```javascript
   db.users.updateOne(
     { username: "yourusername" },
     { $set: { isAdmin: true } }
   )
   ```

---

## API Endpoints (For Developers)

All admin endpoints require authentication and admin role:

### Dashboard
- `GET /api/admin/dashboard/stats` - Get dashboard statistics

### Users
- `GET /api/admin/users?page=1&limit=20&search=query` - List users
- `GET /api/admin/users/:userId` - Get user details
- `PUT /api/admin/users/:userId` - Update user
- `DELETE /api/admin/users/:userId` - Delete user

### Images
- `GET /api/admin/images?page=1&limit=20&search=query&category=Nature&userId=123` - List images
- `DELETE /api/admin/images/:imageId` - Delete image

---

## Security Notes

- Only users with `isAdmin: true` can access `/admin`
- All admin API endpoints are protected by authentication and admin middleware
- Regular users will be redirected to home page if they try to access `/admin`
- You cannot delete your own account from the admin panel

---

## Troubleshooting

### "Admin access required" error
- Make sure you've set your user as admin using `npm run make:admin <username>`
- Verify your user has `isAdmin: true` in the database
- Try signing out and signing back in

### Can't see admin panel
- Check that you're signed in
- Verify your user is an admin
- Check browser console for errors
- Make sure the route `/admin` is accessible

### Can't delete user/image
- Check browser console for error messages
- Verify you have admin permissions
- Some operations may fail if there are database constraints

---

## Tips

1. **Regular Backups:** Before deleting users or images, consider backing up your database
2. **Search Functionality:** Use search to quickly find specific users or images
3. **Bulk Operations:** Currently, operations are done one at a time. For bulk operations, consider using the API directly or database scripts
4. **Monitor Activity:** Check the dashboard regularly to monitor your website's growth


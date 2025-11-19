# Role-Based Admin System Guide

## Overview

The admin system now supports role-based permissions where:
- **Super Admin** (Admin 1) has all permissions and can delegate roles to other admins
- **Regular Admins** can have specific permissions delegated by the super admin
- **Moderators** have limited permissions

## Setup

### Step 1: Create Super Admin

Make yourself the super admin (this gives you all permissions):

```bash
cd backend
npm run make:superadmin <your-username>
```

**Example:**
```bash
npm run make:superadmin john
```

### Step 2: Access Admin Panel

1. Sign in with your super admin account
2. Click "Admin" in the header or navigate to `/admin`
3. You'll see a new "Admin Roles" tab (only visible to super admins)

## Admin Roles Tab

### Creating Admin Roles

1. Go to **Admin Roles** tab
2. Click **"+ Create Admin Role"**
3. Select a user from the dropdown
4. Choose role type:
   - **Admin**: Full admin with customizable permissions
   - **Moderator**: Limited admin with basic permissions
5. Check the permissions you want to grant:
   - ✅ **Manage Users**: View and edit users
   - ✅ **Delete Users**: Delete users (also deletes their images)
   - ✅ **Manage Images**: View all images
   - ✅ **Delete Images**: Delete any image
   - ✅ **Manage Categories**: Manage image categories
   - ✅ **Manage Admins**: Delegate admin roles (only super admin)
   - ✅ **View Dashboard**: View dashboard statistics (always enabled)

6. Click **"Create Role"**

### Editing Admin Roles

1. Find the admin role in the table
2. Click the **Edit** button (pencil icon)
3. Modify permissions or role type
4. Click **"Save Changes"**

### Removing Admin Roles

1. Find the admin role in the table
2. Click the **Delete** button (trash icon)
3. Confirm deletion

## Permission System

### Available Permissions

| Permission | Description |
|------------|-------------|
| `manageUsers` | View and edit user information |
| `deleteUsers` | Delete users and their images |
| `manageImages` | View all images in the system |
| `deleteImages` | Delete any image |
| `manageCategories` | Create, update, delete categories |
| `manageAdmins` | Create and manage admin roles (Super Admin only) |
| `viewDashboard` | View dashboard statistics (always enabled) |

### Role Types

1. **Super Admin** (`isSuperAdmin: true`)
   - Has ALL permissions automatically
   - Can delegate admin roles
   - Cannot be modified via AdminRole (set via script only)

2. **Admin** (role: `admin`)
   - Customizable permissions
   - Can be granted specific permissions by super admin

3. **Moderator** (role: `moderator`)
   - Limited permissions
   - Typically used for content moderation

## How Permissions Work

- **Super Admin**: Automatically has all permissions, bypasses all checks
- **Admin with permissions**: Can only perform actions they have permission for
- **No permission**: Action is denied with "Permission denied" error

### Example Scenarios

**Scenario 1: Admin with only `manageImages` permission**
- ✅ Can view all images
- ❌ Cannot delete images (needs `deleteImages`)
- ❌ Cannot view users (needs `manageUsers`)

**Scenario 2: Admin with `manageUsers` but not `deleteUsers`**
- ✅ Can view and edit users
- ❌ Cannot delete users

**Scenario 3: Super Admin**
- ✅ Can do everything
- ✅ Can delegate roles
- ✅ Can modify any admin role

## API Endpoints

### Admin Role Management (Super Admin Only)

- `GET /api/admin/roles` - Get all admin roles
- `GET /api/admin/roles/:userId` - Get specific admin role
- `POST /api/admin/roles` - Create admin role
- `PUT /api/admin/roles/:userId` - Update admin role
- `DELETE /api/admin/roles/:userId` - Remove admin role

### Protected Operations

All admin operations now check permissions:
- User management requires `manageUsers` permission
- User deletion requires `deleteUsers` permission
- Image viewing requires `manageImages` permission
- Image deletion requires `deleteImages` permission

## Best Practices

1. **Start with Super Admin**: Always create a super admin first
2. **Grant Minimum Permissions**: Only grant permissions that are needed
3. **Regular Review**: Periodically review admin roles and permissions
4. **Document Roles**: Keep track of who has what permissions
5. **Test Permissions**: Test that admins can only do what they're allowed

## Security Notes

- Super admin cannot modify their own role
- Super admin cannot delete their own admin role
- Only super admin can create/update/delete admin roles
- Permissions are checked on every admin operation
- Regular admins cannot grant permissions they don't have

## Troubleshooting

### "Permission denied" errors
- Check if the admin has the required permission
- Verify the admin role exists in the database
- Make sure you're signed in as the correct user

### Can't see "Admin Roles" tab
- Make sure you're a super admin (`isSuperAdmin: true`)
- Try signing out and back in
- Check browser console for errors

### Can't create admin role
- Verify you're a super admin
- Check that the user doesn't already have an admin role
- Ensure the user exists in the database


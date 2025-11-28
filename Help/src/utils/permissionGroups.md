# permissionGroups Explanation

## What is permissionGroups?

`permissionGroups` is a **utility module** that organizes admin permissions into logical groups for better UI display. It provides a structured way to display and manage permissions.

## Key Features

### 1. **Permission Groups**
- Organized by category
- User management
- Image management
- Category management
- Admin management
- System permissions

### 2. **UI Organization**
- Grouped display
- Vietnamese labels
- Permission keys
- Default states

### 3. **Helper Functions**
- Get all permission keys
- Default permission state
- Type-safe

## Step-by-Step Breakdown

### Permission Groups

```typescript
export const PERMISSION_GROUPS = [
    {
        label: 'Quản lý người dùng',
        permissions: [
            { key: 'viewUsers', label: 'Xem người dùng' },
            { key: 'editUsers', label: 'Chỉnh sửa người dùng' },
            { key: 'deleteUsers', label: 'Xóa người dùng' },
            { key: 'banUsers', label: 'Cấm người dùng' },
            { key: 'unbanUsers', label: 'Bỏ cấm người dùng' },
        ],
    },
    {
        label: 'Quản lý ảnh',
        permissions: [
            { key: 'viewImages', label: 'Xem ảnh' },
            { key: 'editImages', label: 'Chỉnh sửa ảnh' },
            { key: 'deleteImages', label: 'Xóa ảnh' },
            { key: 'moderateImages', label: 'Kiểm duyệt ảnh' },
        ],
    },
    // ... more groups
] as const;
```

**What this does:**
- Defines permission groups
- Vietnamese labels
- Permission keys
- Organized by category
- Used in admin UI

### Get All Permission Keys

```typescript
export const getAllPermissionKeys = (): AdminRolePermissions => {
    const allPermissions: AdminRolePermissions = {};
    
    PERMISSION_GROUPS.forEach(group => {
        group.permissions.forEach(perm => {
            allPermissions[perm.key as keyof AdminRolePermissions] = 
                perm.key === 'viewDashboard' ? true : false;
        });
    });
    
    return allPermissions;
};
```

**What this does:**
- Gets all permission keys
- Creates default state
- viewDashboard defaults to true
- Others default to false
- Returns permission object

## Permission Groups

1. **User Management** - viewUsers, editUsers, deleteUsers, banUsers, unbanUsers
2. **Image Management** - viewImages, editImages, deleteImages, moderateImages
3. **Category Management** - viewCategories, createCategories, editCategories, deleteCategories
4. **Admin Management** - viewAdmins, createAdmins, editAdmins, deleteAdmins
5. **Dashboard & Analytics** - viewDashboard, viewAnalytics
6. **Collections** - viewCollections, manageCollections
7. **Favorites** - manageFavorites
8. **Content Moderation** - moderateContent
9. **System** - viewLogs, exportData, manageSettings
10. **Legacy** - Backward compatibility permissions

## Usage Examples

### Display Groups

```typescript
import { PERMISSION_GROUPS } from '@/utils/permissionGroups';

PERMISSION_GROUPS.map(group => (
  <div key={group.label}>
    <h3>{group.label}</h3>
    {group.permissions.map(perm => (
      <Checkbox key={perm.key} label={perm.label} />
    ))}
  </div>
));
```

### Get All Keys

```typescript
import { getAllPermissionKeys } from '@/utils/permissionGroups';

const defaultPermissions = getAllPermissionKeys();
// { viewDashboard: true, viewUsers: false, ... }
```

## Summary

**permissionGroups** is the permission organization utility that:
1. ✅ Organizes permissions into groups
2. ✅ Vietnamese labels
3. ✅ UI-friendly structure
4. ✅ Helper functions
5. ✅ Type-safe

It's the "permission organizer" - making permissions manageable!


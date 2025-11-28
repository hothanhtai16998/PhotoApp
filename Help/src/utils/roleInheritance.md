# roleInheritance Explanation

## What is roleInheritance?

`roleInheritance` is a **utility module** that handles role-based permission inheritance. It matches the backend permission validator logic and provides functions to check inherited permissions.

## Key Features

### 1. **Role Hierarchy**
- Moderator (base role)
- Admin (inherits moderator)
- Super Admin (inherits admin)

### 2. **Permission Inheritance**
- Automatic inheritance
- Role-based checks
- Matches backend logic

### 3. **Helper Functions**
- Get inherited permissions
- Check if inherited
- Get inherited from role

## Step-by-Step Breakdown

### Role Permissions

```typescript
// Permissions for moderator role (base role)
const MODERATOR_PERMISSIONS = [
    'viewDashboard',
    'viewAnalytics',
    'viewUsers',
    'viewImages',
    'viewCategories',
    'viewCollections',
    'moderateImages',
    'moderateContent',
    'manageFavorites',
    'viewLogs',
] as const;

// Permissions for admin role (includes all moderator permissions)
const ADMIN_PERMISSIONS = [
    ...MODERATOR_PERMISSIONS,
    'editUsers',
    'deleteUsers',
    'banUsers',
    'unbanUsers',
    'editImages',
    'deleteImages',
    'createCategories',
    'editCategories',
    'deleteCategories',
    'manageCollections',
    'exportData',
    'manageSettings',
    'viewAdmins',
] as const;
```

**What this does:**
- Defines base permissions
- Moderator has base set
- Admin includes moderator + more
- Super admin has all

### Get Inherited Permissions

```typescript
export const getInheritedPermissions = (role: 'super_admin' | 'admin' | 'moderator'): string[] => {
    switch (role) {
        case 'moderator':
            // Moderator has no inheritance (base role)
            return [];
        case 'admin':
            // Admin inherits all moderator permissions
            return [...MODERATOR_PERMISSIONS];
        case 'super_admin':
            // Super admin inherits all admin permissions (which includes moderator)
            return [...ADMIN_PERMISSIONS];
        default:
            return [];
    }
};
```

**What this does:**
- Returns inherited permissions
- Moderator: none (base)
- Admin: moderator permissions
- Super admin: admin permissions

### Check if Inherited

```typescript
export const isPermissionInherited = (
    role: 'super_admin' | 'admin' | 'moderator',
    permission: string
): boolean => {
    const inheritedPerms = getInheritedPermissions(role);
    return inheritedPerms.includes(permission);
};
```

**What this does:**
- Checks if permission is inherited
- Returns boolean
- Used for UI display

### Get Inherited From Role

```typescript
export const getInheritedFromRole = (
    role: 'super_admin' | 'admin' | 'moderator',
    permission: string
): 'moderator' | 'admin' | null => {
    if (role === 'admin' && MODERATOR_PERMISSIONS.includes(permission)) {
        return 'moderator';
    }
    if (role === 'super_admin') {
        if (MODERATOR_PERMISSIONS.includes(permission)) {
            return 'moderator';
        }
        if (ADMIN_PERMISSIONS.includes(permission)) {
            return 'admin';
        }
    }
    return null;
};
```

**What this does:**
- Gets role that provides permission
- Returns 'moderator' or 'admin'
- Returns null if not inherited
- Used for UI tooltips

## Role Hierarchy

```
Super Admin
  ├─ Inherits all Admin permissions
  │    └─ Inherits all Moderator permissions
  │
Admin
  └─ Inherits all Moderator permissions
      │
Moderator (base role)
  └─ No inheritance
```

## Usage Examples

### Get Inherited

```typescript
import { getInheritedPermissions } from '@/utils/roleInheritance';

const inherited = getInheritedPermissions('admin');
// Returns all moderator permissions
```

### Check Inherited

```typescript
import { isPermissionInherited } from '@/utils/roleInheritance';

const isInherited = isPermissionInherited('admin', 'viewUsers');
// Returns true (inherited from moderator)
```

### Get Inherited From

```typescript
import { getInheritedFromRole } from '@/utils/roleInheritance';

const fromRole = getInheritedFromRole('super_admin', 'viewUsers');
// Returns 'moderator'
```

## Summary

**roleInheritance** is the role inheritance utility that:
1. ✅ Handles permission inheritance
2. ✅ Role hierarchy
3. ✅ Matches backend logic
4. ✅ Helper functions
5. ✅ Type-safe

It's the "inheritance manager" - managing role permissions!


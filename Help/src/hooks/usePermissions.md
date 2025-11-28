# usePermissions Hook Explanation

## What is usePermissions?

`usePermissions` is a **custom React hook** that provides functions to check user permissions. It reads from the user store and provides convenient methods to check admin permissions.

## Hook Structure

```typescript
export function usePermissions(): {
  hasPermission: (permission: keyof AdminRolePermissions) => boolean;
  hasAnyPermission: (permissions: Array<keyof AdminRolePermissions>) => boolean;
  hasAllPermissions: (permissions: Array<keyof AdminRolePermissions>) => boolean;
  isAdmin: () => boolean;
  isSuperAdmin: () => boolean;
  permissions: AdminRolePermissions | null;
}
```

## Return Values

### `hasPermission(permission)`
- Checks if user has a specific permission
- Super admins have all permissions
- Returns `true` if permission exists and is `true`

### `hasAnyPermission(permissions)`
- Checks if user has ANY of the specified permissions
- Returns `true` if at least one permission is granted

### `hasAllPermissions(permissions)`
- Checks if user has ALL of the specified permissions
- Returns `true` only if all permissions are granted

### `isAdmin()`
- Checks if user is admin (basic or super)
- Returns `true` if `isAdmin` or `isSuperAdmin` is `true`

### `isSuperAdmin()`
- Checks if user is super admin
- Returns `true` only if `isSuperAdmin` is `true`

### `permissions`
- Direct access to user's permissions object
- Returns `null` if user has no permissions

## Step-by-Step Breakdown

### Get User from Store

```typescript
const user = useUserStore((state) => state.user);
```

**What this does:**
- Gets current user from Zustand store
- Uses selector to only subscribe to user changes
- Re-renders when user changes

### Check Single Permission

```typescript
const hasPermission = (permission: keyof AdminRolePermissions): boolean => {
  if (!user) return false;
  
  // Super admin has all permissions
  if (user.isSuperAdmin) return true;
  
  // If no permissions object, user has no permissions
  if (!user.permissions) return false;
  
  // Check specific permission
  return user.permissions[permission] === true;
};
```

**What this does:**
1. Returns `false` if no user
2. Returns `true` if super admin (has all permissions)
3. Returns `false` if no permissions object
4. Returns `true` if specific permission is `true`

**Permission hierarchy:**
- Super Admin → All permissions
- Admin with permissions → Specific permissions
- Regular user → No permissions

### Check Any Permission

```typescript
const hasAnyPermission = (permissions: Array<keyof AdminRolePermissions>): boolean => {
  return permissions.some(perm => hasPermission(perm));
};
```

**What this does:**
- Checks if user has ANY of the specified permissions
- Uses `Array.some()` for short-circuit evaluation
- Returns `true` if at least one permission is granted

**Example:**
```typescript
hasAnyPermission(['manageUsers', 'manageImages'])
// Returns true if user can manage users OR images
```

### Check All Permissions

```typescript
const hasAllPermissions = (permissions: Array<keyof AdminRolePermissions>): boolean => {
  return permissions.every(perm => hasPermission(perm));
};
```

**What this does:**
- Checks if user has ALL of the specified permissions
- Uses `Array.every()` for strict checking
- Returns `true` only if all permissions are granted

**Example:**
```typescript
hasAllPermissions(['manageUsers', 'manageImages'])
// Returns true only if user can manage users AND images
```

### Check Admin Status

```typescript
const isAdmin = (): boolean => {
  return user?.isAdmin === true || user?.isSuperAdmin === true;
};
```

**What this does:**
- Checks if user has any admin role
- Returns `true` for both `isAdmin` and `isSuperAdmin`
- Simple role check

### Check Super Admin

```typescript
const isSuperAdmin = (): boolean => {
  return user?.isSuperAdmin === true;
};
```

**What this does:**
- Checks if user is specifically super admin
- More restrictive than `isAdmin()`
- Only returns `true` for super admins

## Usage Examples

### Check Single Permission

```typescript
function AdminPanel() {
  const { hasPermission } = usePermissions();
  
  if (!hasPermission('manageUsers')) {
    return <div>Access denied</div>;
  }
  
  return <UserManagement />;
}
```

### Check Multiple Permissions

```typescript
function ImageEditor() {
  const { hasAllPermissions } = usePermissions();
  
  const canEdit = hasAllPermissions(['manageImages', 'editImages']);
  
  return (
    <div>
      {canEdit && <EditButton />}
    </div>
  );
}
```

### Conditional Rendering

```typescript
function AdminMenu() {
  const { hasPermission, isSuperAdmin } = usePermissions();
  
  return (
    <nav>
      {hasPermission('manageUsers') && <UsersLink />}
      {hasPermission('manageImages') && <ImagesLink />}
      {isSuperAdmin() && <SettingsLink />}
    </nav>
  );
}
```

### Check Admin Status

```typescript
function ProtectedComponent() {
  const { isAdmin } = usePermissions();
  
  if (!isAdmin()) {
    return <Navigate to="/" />;
  }
  
  return <AdminContent />;
}
```

## Permission Types

Permissions are defined in `AdminRolePermissions` type:

```typescript
interface AdminRolePermissions {
  manageUsers?: boolean;
  manageImages?: boolean;
  manageCollections?: boolean;
  manageCategories?: boolean;
  manageRoles?: boolean;
  viewAnalytics?: boolean;
  // ... more permissions
}
```

## Common Questions

### Q: What's the difference between `isAdmin()` and `isSuperAdmin()`?
**A:** `isAdmin()` returns true for both admin and super admin. `isSuperAdmin()` only returns true for super admin.

### Q: Do super admins have all permissions?
**A:** Yes, `hasPermission()` returns `true` for super admins regardless of permissions object.

### Q: What if user has no permissions object?
**A:** All permission checks return `false` (except super admin check).

### Q: Can I check permissions outside React?
**A:** Yes, use `useUserStore.getState().user` directly, but this hook is more convenient.

### Q: Are permissions cached?
**A:** No, they're read from the store each time. The store is the source of truth.

## Summary

**usePermissions** is a convenient permission checking hook that:
1. ✅ Provides easy permission checks
2. ✅ Handles super admin special case
3. ✅ Supports single, any, and all permission checks
4. ✅ Provides admin status checks
5. ✅ Type-safe with TypeScript

It's the "permission checker" - making authorization easy throughout your app!


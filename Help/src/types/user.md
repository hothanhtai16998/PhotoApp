# user Types Explanation

## What is user Types?

`user` types is a **TypeScript type definitions file** that defines all user-related types and interfaces. It provides type safety for user data, profile updates, and password changes.

## Key Features

### 1. **User Interface**
- Complete user structure
- Admin fields
- Social links
- OAuth support

### 2. **Service Responses**
- Change password response
- Update profile response

### 3. **Type Safety**
- TypeScript interfaces
- Optional fields
- Consistent structure

## Step-by-Step Breakdown

### User Interface

```typescript
export interface User {
  _id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  phone?: string;
  location?: string;
  website?: string;
  instagram?: string;
  twitter?: string;
  facebook?: string;
  isOAuthUser?: boolean;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  permissions?: AdminRolePermissions | null;
  createdAt?: string;
  updatedAt?: string;
}
```

**What this does:**
- Defines complete user structure
- Basic info (username, email, displayName)
- Profile fields (bio, location, social links)
- Admin fields (isAdmin, permissions)
- OAuth flag
- Timestamps

### Change Password Response

```typescript
export interface ChangePasswordResponse {
  success: boolean;
  message?: string;
}
```

**What this does:**
- Defines change password response
- Success flag
- Optional message
- Simple structure

### Update Profile Response

```typescript
export interface UpdateProfileResponse {
  success: boolean;
  message?: string;
  user?: User;
}
```

**What this does:**
- Defines update profile response
- Success flag
- Optional updated user
- Returns new user data

## Usage Examples

### User Type

```typescript
const user: User = {
  _id: '123',
  username: 'johndoe',
  email: 'john@example.com',
  displayName: 'John Doe',
  avatarUrl: 'https://...',
  bio: 'Photographer',
  isAdmin: false,
};
```

### Change Password

```typescript
const response: ChangePasswordResponse = await userService.changePassword(...);
if (response.success) {
  toast.success('Password changed successfully');
}
```

### Update Profile

```typescript
const response: UpdateProfileResponse = await userService.updateProfile(formData);
if (response.user) {
  // Update user in store
  setUser(response.user);
}
```

## Summary

**user types** is the user type definitions file that:
1. ✅ Defines User interface
2. ✅ Service response types
3. ✅ Type safety
4. ✅ Complete user structure
5. ✅ Easy to use

It's the "user types" - ensuring type safety for users!


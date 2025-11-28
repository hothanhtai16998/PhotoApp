# userService Explanation

## What is userService?

`userService` is a **service module** that provides user-related API methods. It handles profile updates, password changes, user search, and fetching public user data.

## Key Features

### 1. **Profile Management**
- Update profile
- Change password
- Upload avatar

### 2. **User Search**
- Search users by query
- Returns search results
- Limited results

### 3. **Public User Data**
- Get user by username
- Get user by ID
- Request cancellation support

## Step-by-Step Breakdown

### Change Password

```typescript
changePassword: async (
  password: string,
  newPassword: string,
  newPasswordMatch: string
): Promise<ChangePasswordResponse> => {
  const res = await api.put<ChangePasswordResponse>(
    '/users/change-password',
    {
      password,
      newPassword,
      newPasswordMatch,
    },
    { withCredentials: true }
  );
  return res.data;
},
```

**What this does:**
- Changes user password
- Requires current password
- Validates password match
- Returns response

### Update Profile

```typescript
updateProfile: async (
  formData: FormData
): Promise<UpdateProfileResponse> => {
  const res = await api.put<UpdateProfileResponse>(
    '/users/change-info',
    formData,
    {
      withCredentials: true,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return res.data;
},
```

**What this does:**
- Updates user profile
- Accepts FormData (for file uploads)
- Sets multipart/form-data header
- Returns updated profile

### Search Users

```typescript
searchUsers: async (
  search: string,
  limit?: number
): Promise<{ users: UserSearchResult[] }> => {
  const res = await api.get('/users/search', {
    params: { search, limit },
    withCredentials: true,
  });
  return res.data;
},
```

**What this does:**
- Searches users by query
- Optional limit parameter
- Returns search results
- Used for autocomplete

### Get User by Username

```typescript
getUserByUsername: async (username: string, signal?: AbortSignal): Promise<PublicUser> => {
  const res = await api.get(`/users/username/${username}`, {
    withCredentials: true,
    signal, // Pass abort signal for request cancellation
  });
  return res.data.user;
},
```

**What this does:**
- Fetches public user data
- Supports request cancellation
- Returns public user profile
- Used for profile pages

### Get User by ID

```typescript
getUserById: async (userId: string, signal?: AbortSignal): Promise<PublicUser> => {
  const res = await api.get(`/users/${userId}`, {
    withCredentials: true,
    signal, // Pass abort signal for request cancellation
  });
  return res.data.user;
},
```

**What this does:**
- Fetches public user data by ID
- Supports request cancellation
- Returns public user profile
- Alternative to username lookup

## Type Definitions

### UserSearchResult

```typescript
export interface UserSearchResult {
  _id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
}
```

### PublicUser

```typescript
export interface PublicUser {
  _id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  location?: string;
  website?: string;
  instagram?: string;
  twitter?: string;
  facebook?: string;
  createdAt: string;
}
```

## Usage Examples

### Change Password

```typescript
await userService.changePassword(
  'oldPassword',
  'newPassword',
  'newPassword'
);
```

### Update Profile

```typescript
const formData = new FormData();
formData.append('displayName', 'John Doe');
formData.append('bio', 'Photographer');
formData.append('avatar', file);

await userService.updateProfile(formData);
```

### Search Users

```typescript
const { users } = await userService.searchUsers('john', 10);
```

### Get User

```typescript
const signal = useRequestCancellation();
const user = await userService.getUserByUsername('johndoe', signal);
```

## Summary

**userService** is the user management service that:
1. ✅ Updates profile and password
2. ✅ Searches users
3. ✅ Fetches public user data
4. ✅ Supports request cancellation
5. ✅ Type-safe interfaces

It's the "user API" - handling all user operations!


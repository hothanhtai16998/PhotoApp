# adminService Explanation

## What is adminService?

`adminService` is a **service module** that provides admin-related API methods. It handles dashboard stats, user management, image moderation, category management, admin roles, and analytics.

## Key Features

### 1. **Dashboard & Analytics**
- Get dashboard stats
- Get analytics data
- User and image statistics

### 2. **User Management**
- Get all users
- Get user by ID
- Update user
- Ban/unban users
- Delete user

### 3. **Image Moderation**
- Get all images
- Moderate images
- Update moderation status
- Delete images

### 4. **Category Management**
- Get all categories
- Create category
- Update category
- Delete category

### 5. **Admin Roles**
- Get all roles
- Create role
- Update role
- Delete role
- Assign permissions

## Step-by-Step Breakdown

### Dashboard Stats

```typescript
getDashboardStats: async (): Promise<DashboardStats> => {
  const res = await api.get('/admin/dashboard/stats', {
    withCredentials: true,
  });
  return res.data;
},
```

**What this does:**
- Fetches dashboard statistics
- Total users, images
- Category stats
- Recent users and images

### Get All Users

```typescript
getAllUsers: async (params?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<{ users: User[]; pagination: Pagination }> => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.search) queryParams.append('search', params.search);

  const queryString = queryParams.toString();
  const url = queryString ? `/admin/users?${queryString}` : '/admin/users';

  const res = await api.get(url, {
    withCredentials: true,
  });
  return res.data;
},
```

**What this does:**
- Fetches all users
- Supports pagination
- Supports search
- Returns users and pagination

### Ban/Unban User

```typescript
banUser: async (userId: string, reason: string): Promise<{ success: boolean }> => {
  const res = await api.post(`/admin/users/${userId}/ban`, { reason }, {
    withCredentials: true,
  });
  return res.data;
},

unbanUser: async (userId: string): Promise<{ success: boolean }> => {
  const res = await api.post(`/admin/users/${userId}/unban`, {}, {
    withCredentials: true,
  });
  return res.data;
},
```

**What this does:**
- Bans user with reason
- Unbans user
- Returns success status

### Moderate Image

```typescript
moderateImage: async (
  imageId: string,
  status: 'approved' | 'rejected' | 'flagged',
  notes?: string
): Promise<{ success: boolean }> => {
  const res = await api.post(
    `/admin/images/${imageId}/moderate`,
    { status, notes },
    { withCredentials: true }
  );
  return res.data;
},
```

**What this does:**
- Moderates image
- Sets moderation status
- Optional notes
- Returns success

### Admin Roles

```typescript
createRole: async (data: {
  userId: string;
  role: 'super_admin' | 'admin' | 'moderator';
  permissions: AdminRolePermissions;
}): Promise<AdminRole> => {
  const res = await api.post('/admin/roles', data, {
    withCredentials: true,
  });
  return res.data.role;
},
```

**What this does:**
- Creates admin role
- Assigns permissions
- Returns created role

## Permission Types

```typescript
export interface AdminRolePermissions {
  // User Management
  viewUsers?: boolean;
  editUsers?: boolean;
  deleteUsers?: boolean;
  banUsers?: boolean;
  unbanUsers?: boolean;
  
  // Image Management
  viewImages?: boolean;
  editImages?: boolean;
  deleteImages?: boolean;
  moderateImages?: boolean;
  
  // ... more permissions
}
```

**What this does:**
- Defines permission structure
- Granular permissions
- Optional boolean flags

## Usage Examples

### Get Dashboard Stats

```typescript
const stats = await adminService.getDashboardStats();
console.log(stats.stats.totalUsers);
```

### Get All Users

```typescript
const { users, pagination } = await adminService.getAllUsers({
  page: 1,
  limit: 20,
  search: 'john',
});
```

### Moderate Image

```typescript
await adminService.moderateImage(imageId, 'approved', 'Looks good');
```

### Create Role

```typescript
const role = await adminService.createRole({
  userId: '123',
  role: 'moderator',
  permissions: {
    viewDashboard: true,
    moderateImages: true,
  },
});
```

## Summary

**adminService** is the admin management service that:
1. ✅ Dashboard and analytics
2. ✅ User management
3. ✅ Image moderation
4. ✅ Category management
5. ✅ Admin roles and permissions

It's the "admin API" - managing all admin operations!


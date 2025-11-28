# admin Types Explanation

## What is admin Types?

`admin` types is a **TypeScript type definitions file** that defines all admin-related types and interfaces. It provides type safety for admin operations, analytics, and user management.

## Key Features

### 1. **Dashboard Types**
- Dashboard stats
- Recent users
- Recent images
- Category statistics

### 2. **Analytics Types**
- Analytics data
- Time series data
- Real-time analytics
- Comparison data

### 3. **User Management Types**
- Admin user interface
- User responses
- Update responses

### 4. **Collection Types**
- Collection responses
- Pagination support

## Step-by-Step Breakdown

### Dashboard Stats

```typescript
export interface DashboardStats {
  stats: {
    totalUsers: number;
    totalImages: number;
    categoryStats: Array<{ _id: string; count: number }>;
  };
  recentUsers: User[];
  recentImages: AdminImage[];
}
```

**What this does:**
- Defines dashboard statistics
- Total counts
- Category breakdown
- Recent activity

### Admin Image

```typescript
export interface AdminImage {
  _id: string;
  imageTitle: string;
  imageUrl: string;
  imageCategory: string | { _id: string; name: string; description?: string } | null;
  uploadedBy: {
    _id: string;
    username: string;
    displayName: string;
    email: string;
  };
  isModerated?: boolean;
  moderationStatus?: 'pending' | 'approved' | 'rejected' | 'flagged';
  moderatedAt?: string;
  moderationNotes?: string;
  createdAt: string;
}
```

**What this does:**
- Defines admin image structure
- Moderation status
- Uploader information
- Used in admin dashboard

### Analytics Data

```typescript
export interface AnalyticsData {
  period: {
    days: number;
    startDate: string;
    endDate: string;
  };
  users: {
    total: number;
    new: number;
    banned: number;
  };
  images: {
    total: number;
    new: number;
    moderated: number;
    pendingModeration: number;
    approved: number;
    rejected: number;
    flagged: number;
  };
  categories: Array<{
    _id: string;
    name: string;
    count: number;
  }>;
  dailyUploads: Array<{
    _id: string;
    count: number;
  }>;
  dailyUsers: Array<{
    _id: string;
    count: number;
  }>;
  // ... more analytics data
}
```

**What this does:**
- Defines analytics structure
- Period information
- User statistics
- Image statistics
- Daily trends
- Category performance

### Real-time Analytics

```typescript
export interface RealtimeAnalyticsResponse {
  usersOnline: number;
  viewsPerSecond: Array<{ second: number; count: number }>;
  mostActivePages: Array<{ path: string; userCount: number }>;
}
```

**What this does:**
- Defines real-time analytics
- Users online
- Views per second
- Active pages

## Usage Examples

### Dashboard Stats

```typescript
import type { DashboardStats } from '@/types/admin';

const stats: DashboardStats = await adminService.getDashboardStats();
console.log(stats.stats.totalUsers);
```

### Analytics Data

```typescript
import type { AnalyticsData } from '@/types/admin';

const analytics: AnalyticsData = await adminService.getAnalytics(30);
console.log(analytics.users.new);
```

## Summary

**admin types** is the admin type definitions file that:
1. ✅ Defines dashboard types
2. ✅ Analytics types
3. ✅ User management types
4. ✅ Type safety
5. ✅ Complete structure

It's the "admin types" - ensuring type safety for admin operations!


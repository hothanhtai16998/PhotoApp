# categoryService Explanation

## What is categoryService?

`categoryService` is a **service module** that provides category-related API methods. It handles fetching, creating, updating, and deleting categories with caching support.

## Key Features

### 1. **Category Management**
- Fetch categories
- Create category (admin)
- Update category (admin)
- Delete category (admin)

### 2. **Caching**
- 5-minute cache
- Prevents duplicate requests
- Force refresh option

### 3. **Admin Operations**
- Full CRUD for admins
- Separate admin endpoints
- Active/inactive status

## Step-by-Step Breakdown

### Category Interface

```typescript
export interface Category {
  _id: string;
  name: string;
  description?: string;
  isActive?: boolean;
  imageCount?: number;
}
```

**What this does:**
- Defines category structure
- Includes metadata
- Optional fields

### Cache Implementation

```typescript
let categoriesCache: { data: Category[]; timestamp: number } | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

fetchCategories: async (forceRefresh = false): Promise<Category[]> => {
  // Return cached data if available and not expired
  if (!forceRefresh && categoriesCache) {
    const now = Date.now();
    if (now - categoriesCache.timestamp < CACHE_DURATION) {
      return categoriesCache.data;
    }
  }

  const res = await get('/categories', {
    withCredentials: true,
  });
  const categories = (res.data as { categories?: Category[] }).categories || [];

  // Update cache
  categoriesCache = {
    data: categories,
    timestamp: Date.now(),
  };

  return categories;
},
```

**What this does:**
- Checks cache first
- Returns cached data if valid
- Fetches from API if expired or forced
- Updates cache with new data
- 5-minute cache duration

### Admin Operations

```typescript
getAllCategoriesAdmin: async (): Promise<Category[]> => {
  const res = await get('/categories/admin', {
    withCredentials: true,
  });
  return (res.data as { categories?: Category[] }).categories || [];
},

createCategory: async (data: {
  name: string;
  description?: string;
}): Promise<Category> => {
  const res = await api.post('/categories/admin', data, {
    withCredentials: true,
  });
  return res.data.category;
},

updateCategory: async (
  categoryId: string,
  data: { name?: string; description?: string; isActive?: boolean }
): Promise<Category> => {
  const res = await api.put(`/categories/admin/${categoryId}`, data, {
    withCredentials: true,
  });
  return res.data.category;
},

deleteCategory: async (categoryId: string): Promise<void> => {
  await api.delete(`/categories/admin/${categoryId}`, {
    withCredentials: true,
  });
},
```

**What this does:**
- Admin-only operations
- Full CRUD support
- Requires authentication
- Returns category data

## Usage Examples

### Fetch Categories

```typescript
const categories = await categoryService.fetchCategories();
```

### Force Refresh

```typescript
const categories = await categoryService.fetchCategories(true);
```

### Create Category (Admin)

```typescript
const category = await categoryService.createCategory({
  name: 'Nature',
  description: 'Nature photography',
});
```

### Update Category (Admin)

```typescript
const updated = await categoryService.updateCategory(categoryId, {
  name: 'Wildlife',
  isActive: true,
});
```

## Summary

**categoryService** is the category management service that:
1. ✅ Fetches categories with caching
2. ✅ Admin CRUD operations
3. ✅ 5-minute cache duration
4. ✅ Force refresh option
5. ✅ Type-safe interfaces

It's the "category API" - managing image categories!


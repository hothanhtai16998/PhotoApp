# AdminRoute Component Explanation

## What is AdminRoute?

`AdminRoute` is a **route guard component** that protects admin-only routes. It ensures only users with admin privileges can access the admin panel.

## Component Structure

```typescript
export default function AdminRoute() {
  const { isInitializing } = useAuthStore();
  const { user, fetchMe } = useUserStore();

  // Fetch user if not loaded
  useEffect(() => {
    if (!user && !isInitializing) {
      fetchMe();
    }
  }, [user, isInitializing, fetchMe]);

  // Show loading while checking
  if (isInitializing) {
    return <div>Đang tải...</div>;
  }

  // Redirect if not logged in
  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  // Check admin access
  const hasAdminAccess =
    user.isAdmin === true ||
    user.isSuperAdmin === true ||
    (user.permissions && Object.keys(user.permissions).length > 0);

  // Redirect if not admin
  if (!hasAdminAccess) {
    return <Navigate to="/" replace />;
  }

  // Allow access - render admin routes
  return <Outlet />;
}
```

## Step-by-Step Breakdown

### Step 1: Get Auth State

```typescript
const { isInitializing } = useAuthStore();
const { user, fetchMe } = useUserStore();
```

- **`isInitializing`**: Checks if auth is still being initialized
- **`user`**: Current user object (null if not logged in)
- **`fetchMe`**: Function to fetch current user data

### Step 2: Fetch User Data if Missing

```typescript
useEffect(() => {
  if (!user && !isInitializing) {
    fetchMe();
  }
}, [user, isInitializing, fetchMe]);
```

**What this does:**

- If user data is not loaded yet (`!user`)
- And auth initialization is complete (`!isInitializing`)
- Then fetch the user data from the API
- This ensures we have user data to check admin status

**Why check `!isInitializing`?**

- Prevents race condition with `AuthInitializer`
- Waits for auth to finish initializing before fetching user

### Step 3: Show Loading State

```typescript
if (isInitializing) {
  return <div>Đang tải...</div>;
}
```

- While auth is initializing, show loading message
- Prevents checking admin status before auth is ready

### Step 4: Check if User is Logged In

```typescript
if (!user) {
  return <Navigate to="/signin" replace />;
}
```

- If no user data exists, user is not logged in
- Redirect to sign-in page
- `replace` prop replaces current history entry (prevents back button issues)

### Step 5: Check Admin Access

```typescript
const hasAdminAccess =
  user.isAdmin === true ||
  user.isSuperAdmin === true ||
  (user.permissions && Object.keys(user.permissions).length > 0);
```

**Three ways to have admin access:**

1. **`isAdmin === true`**: User has basic admin role
2. **`isSuperAdmin === true`**: User has super admin role (highest level)
3. **Has permissions**: User has custom permissions object with entries

**Why check all three?**

- Flexible permission system
- Supports different admin levels
- Allows custom permissions per user

### Step 6: Redirect Non-Admins

```typescript
if (!hasAdminAccess) {
  return <Navigate to="/" replace />;
}
```

- If user doesn't have admin access, redirect to home page
- Prevents unauthorized access to admin panel

### Step 7: Allow Access

```typescript
return <Outlet />;
```

- If all checks pass, render the admin routes
- `<Outlet />` is React Router's way of rendering nested routes

## Flow Diagram

```
User tries to access /admin
    ↓
AdminRoute checks auth state
    ↓
├─ Auth initializing? → Show loading
├─ No user? → Fetch user data
├─ Still no user? → Redirect to /signin
├─ User exists? → Check admin status
│   ├─ isAdmin? → ✅ Allow access
│   ├─ isSuperAdmin? → ✅ Allow access
│   ├─ Has permissions? → ✅ Allow access
│   └─ None of above? → Redirect to /
└─ All checks pass → Render <Outlet /> (admin routes)
```

## Usage in App.tsx

```typescript
<Route element={<AdminRoute />}>
  <Route path="/admin" element={<AdminPage />} />
</Route>
```

**How it works:**

- When user navigates to `/admin`
- `AdminRoute` checks permissions first
- Only renders `<AdminPage />` if user has admin access
- Otherwise redirects to appropriate page

## Admin Access Levels

### 1. Basic Admin (`isAdmin: true`)

- Standard admin privileges
- Can manage most content

### 2. Super Admin (`isSuperAdmin: true`)

- Highest level access
- Can manage everything including other admins

### 3. Custom Permissions

- User has `permissions` object
- Granular control over specific features
- More flexible than role-based access

## Security Considerations

### ✅ What This Component Protects:

- Route-level protection (prevents access to `/admin`)
- Client-side guard (first line of defense)

### ⚠️ Important Notes:

- **This is client-side protection only**
- Backend must also verify admin status
- Never trust client-side checks alone
- Always validate on the server

## Common Scenarios

### Scenario 1: Logged-in Admin

```
User → /admin → AdminRoute → Has admin access → ✅ Shows AdminPage
```

### Scenario 2: Logged-in Non-Admin

```
User → /admin → AdminRoute → No admin access → ❌ Redirects to /
```

### Scenario 3: Not Logged In

```
User → /admin → AdminRoute → No user → ❌ Redirects to /signin
```

### Scenario 4: Auth Still Initializing

```
User → /admin → AdminRoute → isInitializing → ⏳ Shows "Đang tải..."
```

## Common Questions

### Q: Why fetch user if not loaded?

**A:** Sometimes user data isn't loaded yet when route is accessed. This ensures we have it before checking admin status.

### Q: What's the difference between `isAdmin` and `isSuperAdmin`?

**A:** `isSuperAdmin` is the highest level, can manage everything. `isAdmin` is standard admin level.

### Q: Can I customize the redirect destination?

**A:** Yes, change the `to="/"` to any route you want non-admins redirected to.

### Q: What if user has permissions but not isAdmin?

**A:** The component checks permissions too, so if `user.permissions` has entries, they get access.

## Summary

**AdminRoute** is a route guard that:

1. ✅ Checks if user is logged in
2. ✅ Verifies admin privileges (3 ways)
3. ✅ Redirects unauthorized users
4. ✅ Only allows admin access to admin routes
5. ✅ Provides loading state during checks

It's the "bouncer" for your admin panel - only letting authorized users through!

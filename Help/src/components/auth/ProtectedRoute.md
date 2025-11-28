# ProtectedRoute Component Explanation

## What is ProtectedRoute?

`ProtectedRoute` is a **route guard component** that protects routes requiring authentication. It ensures only logged-in users can access protected pages like profile, upload, favorites, etc.

## Component Structure

```typescript
const ProtectedRoute = () => {
  const { accessToken, loading } = useAuthStore();

  // Show loading while checking auth
  if (loading) {
    return <div>Đang tải...</div>;
  }

  // Redirect if not logged in
  if (!accessToken) {
    return <Navigate to="/signin" replace />;
  }

  // Allow access - render protected routes
  return <Outlet />;
};
```

## Step-by-Step Breakdown

### Step 1: Get Auth State
```typescript
const { accessToken, loading } = useAuthStore();
```
- **`accessToken`**: JWT token if user is logged in (null if not)
- **`loading`**: Boolean indicating if auth check is in progress

### Step 2: Show Loading State
```typescript
if (loading) {
  return (
    <div className="flex h-screen items-center justify-center">
      Đang tải...
    </div>
  );
}
```

**What this does:**
- While auth is being checked, show loading message
- Prevents redirecting before we know if user is logged in
- Better UX than flickering redirects

**When is `loading` true?**
- During initial auth check in `AuthInitializer`
- When refreshing tokens
- During sign-in/sign-up process

### Step 3: Check Authentication
```typescript
if (!accessToken) {
  return (
    <Navigate
      to="/signin"
      replace
    />
  );
}
```

**What this does:**
- If no access token exists, user is not logged in
- Redirects to sign-in page
- `replace` prop replaces current history entry

**Why `replace` instead of `push`?**
- Prevents back button from going back to protected route
- User can't navigate back to a route they can't access
- Cleaner navigation history

### Step 4: Allow Access
```typescript
return <Outlet />;
```
- If access token exists, user is authenticated
- Render the protected routes
- `<Outlet />` renders nested routes inside this route guard

## Flow Diagram

```
User tries to access protected route (e.g., /profile)
    ↓
ProtectedRoute checks auth state
    ↓
├─ Auth loading? → Show "Đang tải..."
├─ No accessToken? → Redirect to /signin
└─ Has accessToken? → ✅ Render <Outlet /> (protected routes)
```

## Usage in App.tsx

```typescript
<Route element={<ProtectedRoute />}>
  <Route path="/profile" element={<ProfilePage />} />
  <Route path="/upload" element={<UploadPage />} />
  <Route path="/favorites" element={<FavoritesPage />} />
  <Route path="/collections" element={<CollectionsPage />} />
  {/* ... more protected routes */}
</Route>
```

**How it works:**
- All routes inside `<ProtectedRoute />` are protected
- User must be logged in to access any of them
- If not logged in, redirected to sign-in
- If logged in, routes render normally

## Protected Routes in PhotoApp

### Currently Protected:
- `/profile` - User profile page
- `/profile/:username` - View other user's profile
- `/profile/user/:userId` - View user by ID
- `/profile/edit` - Edit own profile
- `/upload` - Upload images
- `/favorites` - View favorites
- `/favorite-collections` - View favorite collections
- `/collections` - View collections
- `/collections/:collectionId` - View collection details

### Public Routes (Not Protected):
- `/` - Home page
- `/photos/:slug` - View image
- `/signup` - Sign up page
- `/signin` - Sign in page
- `/about` - About page

## Comparison: ProtectedRoute vs AdminRoute

| Feature | ProtectedRoute | AdminRoute |
|---------|----------------|------------|
| **Checks** | Has access token? | Has access token + admin privileges? |
| **Redirect if no auth** | `/signin` | `/signin` |
| **Redirect if no permission** | N/A | `/` (home) |
| **Use case** | General user pages | Admin-only pages |

## Security Considerations

### ✅ What This Component Protects:
- Route-level protection (prevents access to protected routes)
- Client-side guard (first line of defense)

### ⚠️ Important Notes:
- **This is client-side protection only**
- Backend must also verify authentication
- Never trust client-side checks alone
- Always validate tokens on the server

## Common Scenarios

### Scenario 1: Logged-in User
```
User → /profile → ProtectedRoute → Has token → ✅ Shows ProfilePage
```

### Scenario 2: Not Logged In
```
User → /profile → ProtectedRoute → No token → ❌ Redirects to /signin
```

### Scenario 3: Auth Still Loading
```
User → /profile → ProtectedRoute → loading=true → ⏳ Shows "Đang tải..."
```

### Scenario 4: Token Expired
```
User → /profile → ProtectedRoute → Token expired → ❌ Redirects to /signin
```

## Common Questions

### Q: Why check `accessToken` instead of `user`?
**A:** `accessToken` is checked first because it's faster. User data might still be loading, but token presence indicates authentication.

### Q: What if token is expired?
**A:** Backend will reject the request, and the app will redirect to sign-in. The `AuthInitializer` handles token refresh.

### Q: Can I customize the redirect destination?
**A:** Yes, change `to="/signin"` to any route you want (e.g., `to="/login"`).

### Q: Why use `replace` instead of `push`?
**A:** `replace` prevents back button from going to protected route. User can't navigate back to a route they can't access.

### Q: What's the difference between this and AdminRoute?
**A:** `ProtectedRoute` checks if user is logged in. `AdminRoute` checks if user is logged in AND has admin privileges.

## Summary

**ProtectedRoute** is a route guard that:
1. ✅ Checks if user has access token (is logged in)
2. ✅ Shows loading state during auth check
3. ✅ Redirects unauthenticated users to sign-in
4. ✅ Allows authenticated users to access protected routes
5. ✅ Works with React Router's `<Outlet />` pattern

It's the "security guard" for your protected pages - only letting logged-in users through!


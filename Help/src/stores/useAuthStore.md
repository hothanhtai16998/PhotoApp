# useAuthStore Explanation

## What is useAuthStore?

`useAuthStore` is a **Zustand store** that manages authentication state and operations. It handles sign-in, sign-up, sign-out, token refresh, and app initialization.

## Store Structure

```typescript
export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: null,
  loading: false,
  isInitializing: true,

  setAccessToken: (accessToken) => { /* ... */ },
  clearAuth: () => { /* ... */ },
  signUp: async (...) => { /* ... */ },
  signIn: async (...) => { /* ... */ },
  signOut: async () => { /* ... */ },
  refresh: async () => { /* ... */ },
  initializeApp: async () => { /* ... */ },
}))
```

## State Properties

### `accessToken: string | null`
- JWT token for authenticated requests
- `null` when user is not logged in
- Set after successful sign-in or refresh

### `loading: boolean`
- Indicates if an auth operation is in progress
- Used to show loading states in UI
- Set to `true` during sign-in/sign-up/refresh

### `isInitializing: boolean`
- Indicates if app is checking for existing session
- Starts as `true`, becomes `false` after initialization
- Used by `AuthInitializer` to show loading screen

## Methods Breakdown

### `setAccessToken(accessToken: string)`

```typescript
setAccessToken: (accessToken) => {
  set({ accessToken });
}
```

**What it does:**
- Updates the access token in store
- Used internally after sign-in or refresh
- Other components can read `accessToken` to check auth status

**When to use:**
- After successful sign-in
- After token refresh
- When restoring session

### `clearAuth()`

```typescript
clearAuth: () => {
  set({
    accessToken: null,
    loading: false,
  });
  // Also clear user state
  useUserStore.getState().clearUser();
}
```

**What it does:**
- Clears access token
- Resets loading state
- Also clears user data from `useUserStore`
- Used on sign-out or when session expires

**Why clear user data?**
- User data is tied to authentication
- Prevents stale user data after logout
- Ensures clean state

### `signUp(...)`

```typescript
signUp: async (username, password, email, firstName, lastName, phone, bio) => {
  try {
    set({ loading: true });
    
    await authService.signUp(username, password, email, firstName, lastName, phone, bio);
    
    toast.success('Đăng ký thành công! Bạn sẽ được chuyển sang trang đăng nhập.');
  } catch (error: unknown) {
    const message = (error as ApiErrorResponse)?.response?.data?.message ?? 
      'Đăng ký thất bại. Vui lòng thử lại.';
    toast.error(message);
  } finally {
    set({ loading: false });
  }
}
```

**What it does:**
- Calls sign-up API
- Shows success message
- Handles errors with user-friendly messages
- Does NOT set access token (user must sign in after sign-up)

**Flow:**
1. Set loading to `true`
2. Call API
3. Show success toast
4. Set loading to `false`
5. User is redirected to sign-in page

### `signIn(username, password)`

```typescript
signIn: async (username, password) => {
  try {
    set({ loading: true });
    
    const response = await authService.signIn(username, password);
    
    // Set access token
    if (response.accessToken) {
      get().setAccessToken(response.accessToken);
    }
    
    // Always fetch full user data with permissions
    await useUserStore.getState().fetchMe();
    
    toast.success('Chào mừng bạn quay lại 🎉');
  } catch (error: unknown) {
    // Handle validation errors
    if (errorResponse.response?.data?.errors && Array.isArray(...)) {
      const validationErrors = errorResponse.response.data.errors
        .map(err => err.msg ?? err.message ?? 'Validation failed')
        .join(', ');
      toast.error(`Lỗi xác thực: ${validationErrors}`);
    } else {
      toast.error('Đăng nhập thất bại...');
    }
    throw error; // Re-throw for form handling
  } finally {
    set({ loading: false });
  }
}
```

**What it does:**
- Calls sign-in API
- Sets access token from response
- Fetches full user data (including permissions)
- Shows success message
- Handles validation errors specially
- Re-throws error for form to handle navigation

**Why fetch user data?**
- Access token alone doesn't have user info
- Need user data for UI (avatar, name, permissions)
- Permissions are important for authorization

**Error handling:**
- Validation errors: Shows all validation messages
- Other errors: Shows generic message
- Re-throws so form can navigate on success

### `signOut()`

```typescript
signOut: async () => {
  try {
    get().clearAuth();
    await authService.signOut();
    toast.success('Đăng xuất thành công!');
  } catch {
    // Don't show error toast on logout failure
    // User is already logged out locally
  }
}
```

**What it does:**
- Clears auth state immediately (optimistic)
- Calls sign-out API (clears refresh token cookie)
- Shows success message
- Silently handles errors (user is already logged out locally)

**Why clear immediately?**
- Better UX - user sees logout instantly
- If API call fails, user is still logged out locally
- Refresh token cookie is cleared on backend

### `refresh()`

```typescript
refresh: async () => {
  try {
    const { setAccessToken } = get();
    const { user, fetchMe } = useUserStore.getState();
    const accessToken = await authService.refresh();
    
    setAccessToken(accessToken);
    
    if (!user) {
      await fetchMe();
    }
  } catch (error: unknown) {
    const errorStatus = (error as HttpErrorResponse)?.response?.status;
    // Only show error if it's not a 401/403 (expected when not logged in)
    if (errorStatus !== 401 && errorStatus !== 403) {
      toast.error('Session hết hạn. Vui lòng đăng nhập lại.');
    }
    get().clearAuth();
  }
}
```

**What it does:**
- Calls refresh API (uses refresh token from cookie)
- Gets new access token
- Sets new access token
- Fetches user data if not already loaded
- Handles errors gracefully

**When is this called?**
- On app initialization (`initializeApp`)
- When access token expires (via axios interceptor)
- When restoring session

**Error handling:**
- 401/403: Expected if user not logged in (no error shown)
- Other errors: Shows error message
- Always clears auth on error

### `initializeApp()`

```typescript
initializeApp: async () => {
  try {
    await get().refresh();
  } catch {
    // Silently handle initialization errors
    // User might not be logged in
  } finally {
    set({ isInitializing: false });
  }
}
```

**What it does:**
- Tries to refresh session on app start
- Silently handles errors (user might not be logged in)
- Always sets `isInitializing: false` when done

**Why silent error handling?**
- User might not be logged in (expected)
- Don't show error for normal case
- Only show errors for unexpected failures

**Used by:**
- `AuthInitializer` component
- Called once on app start

## Usage Examples

### Check if User is Logged In

```typescript
const { accessToken } = useAuthStore();
const isLoggedIn = !!accessToken;
```

### Sign In

```typescript
const { signIn, loading } = useAuthStore();

const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    await signIn(username, password);
    navigate('/profile');
  } catch (error) {
    // Error already shown in toast
  }
};
```

### Sign Out

```typescript
const { signOut } = useAuthStore();

const handleSignOut = async () => {
  await signOut();
  navigate('/');
};
```

### Check Loading State

```typescript
const { loading } = useAuthStore();

if (loading) {
  return <Spinner />;
}
```

## Integration with Other Stores

### useUserStore
- Clears user data on `clearAuth()`
- Fetches user data after `signIn()`
- Fetches user data after `refresh()` if not loaded

### axios Interceptor
- Reads `accessToken` for Authorization header
- Calls `refresh()` when token expires
- Calls `clearAuth()` when refresh fails

## Common Questions

### Q: Why separate `accessToken` and user data?
**A:** Token is for authentication, user data is for UI. They're separate concerns.

### Q: What's the difference between `loading` and `isInitializing`?
**A:** 
- `loading`: Any auth operation in progress
- `isInitializing`: Specifically app initialization

### Q: Why clear user data on `clearAuth()`?
**A:** User data is tied to authentication. Prevents stale data after logout.

### Q: Can I use this store outside React?
**A:** Yes! `useAuthStore.getState()` works anywhere.

### Q: How does token refresh work?
**A:** Refresh token is in HTTP-only cookie. Backend validates it and returns new access token.

## Summary

**useAuthStore** is the authentication state manager that:
1. ✅ Manages access token
2. ✅ Handles sign-in/sign-up/sign-out
3. ✅ Refreshes tokens automatically
4. ✅ Initializes app on startup
5. ✅ Integrates with user store
6. ✅ Provides loading states
7. ✅ Handles errors gracefully

It's the "security guard" for your app - managing who's logged in and keeping sessions alive!


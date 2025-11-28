# useUserStore Explanation

## What is useUserStore?

`useUserStore` is a **Zustand store** that manages the current user's profile data. It provides methods to fetch and clear user information, with proper error handling for authentication states.

## Key Features

### 1. **User State Management**
- Stores current user data
- Loading state
- Error handling

### 2. **Authentication-Aware**
- Clears user on 401/403
- Clears auth token
- Handles unauthenticated state

### 3. **Error Handling**
- Distinguishes auth errors
- Preserves user data on network errors
- Silent failures during initialization

## Step-by-Step Breakdown

### Store Structure

```typescript
export const useUserStore = create(
  immer<UserState>((set) => ({
    user: null,
    loading: false,

    fetchMe: async () => { /* ... */ },
    clearUser: () => { /* ... */ },
  }))
);
```

**What this does:**
- Uses Zustand with Immer
- Stores user and loading state
- Provides fetch and clear methods

### Fetch Me

```typescript
fetchMe: async () => {
  try {
    set((state) => {
      state.loading = true;
    });

    const user = await authService.fetchMe();

    set((state) => {
      state.user = user;
      state.loading = false;
    });
  } catch (error) {
    const errorStatus = (error as HttpErrorResponse)?.response?.status;

    if (errorStatus === 401 || errorStatus === 403) {
      // User is not authenticated
      set((state) => {
        state.user = null;
        state.loading = false;
      });
      useAuthStore.getState().clearAuth();
    } else {
      // Network/500 errors - keep existing user data
      set((state) => {
        state.loading = false;
      });
    }
  }
},
```

**What this does:**
- Fetches current user from API
- Sets loading state
- Handles auth errors (401/403)
- Clears auth on unauthorized
- Preserves user data on other errors
- Silent failure (no toast) during init

**Why silent?**
- Expected if user not logged in
- Prevents error spam
- Better UX

### Clear User

```typescript
clearUser: () => {
  set((state) => {
    state.user = null;
  });
},
```

**What this does:**
- Clears user data
- Used on logout
- Simple state update

## Usage Examples

### Fetch User

```typescript
const { user, loading, fetchMe } = useUserStore();

useEffect(() => {
  fetchMe();
}, []);
```

### Access User Data

```typescript
const { user } = useUserStore();

if (user) {
  console.log(user.username);
  console.log(user.email);
}
```

### Clear on Logout

```typescript
const { clearUser } = useUserStore();

const handleLogout = () => {
  clearUser();
  // ... other logout logic
};
```

## Summary

**useUserStore** is the user state management store that:
1. ✅ Manages current user data
2. ✅ Handles authentication errors
3. ✅ Preserves data on network errors
4. ✅ Silent failures during init
5. ✅ Easy to use

It's the "user manager" - keeping track of who's logged in!


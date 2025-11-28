# GoogleCallbackPage Component Explanation

## What is GoogleCallbackPage?

`GoogleCallbackPage` is the **OAuth callback handler** that processes Google OAuth authentication. It receives the access token from the backend and sets up the user session.

## Component Structure

```typescript
function GoogleCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setAccessToken } = useAuthStore();
  const { fetchMe } = useUserStore();

  useEffect(() => {
    // Handle OAuth callback
  }, [searchParams, navigate, setAccessToken, fetchMe]);

  return <div>Completing sign in...</div>;
}
```

## Key Features

### 1. **Token Extraction**
- Gets token from URL query parameter
- Sets token in auth store

### 2. **User Data Fetch**
- Fetches user data after token is set
- Ensures user is logged in

### 3. **Navigation**
- Redirects to home on success
- Redirects to sign-in on failure

## Step-by-Step Breakdown

### Token Processing

```typescript
useEffect(() => {
  const token = searchParams.get('token');

  if (token) {
    // Set the access token
    setAccessToken(token);

    // Fetch user data
    fetchMe().then(() => {
      // Redirect to home page
      navigate('/');
    }).catch(() => {
      // If fetch fails, still redirect but token might be invalid
      navigate('/signin');
    });
  } else {
    // No token, redirect to signin
    navigate('/signin');
  }
}, [searchParams, navigate, setAccessToken, fetchMe]);
```

**What this does:**
1. **Extracts token**: Gets `token` from URL query params
2. **Sets token**: Stores token in auth store
3. **Fetches user**: Gets user data from API
4. **Success**: Navigates to home page
5. **Failure**: Navigates to sign-in page
6. **No token**: Redirects to sign-in

**Flow:**
```
User clicks "Sign in with Google"
    ↓
Redirected to Google OAuth
    ↓
User authorizes
    ↓
Google redirects to backend callback
    ↓
Backend processes OAuth
    ↓
Backend redirects to /auth/google/callback?token=...
    ↓
GoogleCallbackPage extracts token
    ↓
Sets token in store
    ↓
Fetches user data
    ↓
Navigates to home
```

### Loading State

```typescript
return (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    fontSize: '1.125rem',
    color: '#767676'
  }}>
    Completing sign in...
  </div>
);
```

**What this does:**
- Shows loading message
- Centered on screen
- Simple text display
- User feedback during processing

## Error Handling

The component handles several error cases:

1. **No token in URL**: Redirects to sign-in
2. **Token invalid**: `fetchMe()` fails, redirects to sign-in
3. **Network error**: `fetchMe()` fails, redirects to sign-in

**Why redirect to sign-in on error?**
- Token might be invalid
- User needs to try again
- Better UX than showing error

## Security Considerations

### ✅ What's Secure:
- Token comes from backend (not frontend)
- Token is set in secure store
- User data is fetched after token is set

### ⚠️ Potential Issues:
- Token in URL (visible in browser history)
- No token expiration check
- No token validation before setting

**Note:** These are handled by the backend and auth store.

## Common Questions

### Q: Why is token in URL?
**A:** OAuth flow requires redirect with token. Backend sets it, frontend reads it.

### Q: What if token is invalid?
**A:** `fetchMe()` will fail, user is redirected to sign-in.

### Q: Can I add error messages?
**A:** Yes, check for `error` query param and show message.

### Q: Why fetch user data?
**A:** Token alone doesn't have user info. Need to fetch user data for UI.

## Summary

**GoogleCallbackPage** is the OAuth callback handler that:
1. ✅ Extracts token from URL
2. ✅ Sets token in auth store
3. ✅ Fetches user data
4. ✅ Navigates appropriately
5. ✅ Handles errors gracefully
6. ✅ Shows loading state

It's the "OAuth bridge" - connecting Google authentication to your app!


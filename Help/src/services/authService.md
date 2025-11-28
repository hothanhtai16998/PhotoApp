# authService Explanation

## What is authService?

`authService` is a **service module** that provides authentication-related API methods. It handles sign up, sign in, sign out, token refresh, and user profile fetching.

## Key Features

### 1. **Authentication Methods**
- Sign up
- Sign in
- Sign out
- Token refresh

### 2. **User Profile**
- Fetch current user
- Check email/username availability

### 3. **Cookie-Based Auth**
- Uses `withCredentials: true`
- HttpOnly cookies for security
- CSRF protection

## Step-by-Step Breakdown

### Sign Up

```typescript
signUp: async (
  username: string,
  password: string,
  email: string,
  firstName: string,
  lastName: string,
  phone?: string,
  bio?: string
): Promise<SignUpResponse> => {
  const res = await api.post<SignUpResponse>(
    '/auth/signup',
    {
      username,
      password,
      email,
      firstName,
      lastName,
      phone,
      bio,
    },
    { withCredentials: true }
  );

  return res.data;
},
```

**What this does:**
- Creates new user account
- Sends user data to backend
- Returns sign up response
- Uses credentials for cookies

### Sign In

```typescript
signIn: async (
  username: string,
  password: string
): Promise<SignInResponse> => {
  const res = await api.post<SignInResponse>(
    '/auth/signin',
    { username, password },
    { withCredentials: true }
  );
  return res.data;
},
```

**What this does:**
- Authenticates user
- Sends credentials
- Returns sign in response
- Sets auth cookies

### Sign Out

```typescript
signOut: async (): Promise<SignOutResponse> => {
  const res = await api.post<SignOutResponse>(
    '/auth/signout',
    {},
    { withCredentials: true }
  );
  return res.data;
},
```

**What this does:**
- Logs out user
- Clears auth cookies
- Returns sign out response

### Fetch Me

```typescript
fetchMe: async (): Promise<User> => {
  const res = await api.get<FetchMeResponse>(
    '/users/me',
    { withCredentials: true }
  );
  return res.data.user;
},
```

**What this does:**
- Fetches current user profile
- Requires authentication
- Returns user data

### Refresh Token

```typescript
refresh: async (): Promise<string> => {
  const res = await api.post<RefreshTokenResponse>(
    '/auth/refresh',
    {},
    { withCredentials: true }
  );
  return res.data.accessToken;
},
```

**What this does:**
- Refreshes access token
- Uses refresh token from cookie
- Returns new access token

### Check Availability

```typescript
checkEmailAvailability: async (email: string): Promise<CheckEmailAvailabilityResponse> => {
  const res = await api.get<CheckEmailAvailabilityResponse>(
    `/auth/check-email?email=${encodeURIComponent(email)}`,
    { withCredentials: true }
  );
  return res.data;
},

checkUsernameAvailability: async (username: string): Promise<CheckUsernameAvailabilityResponse> => {
  const res = await api.get<CheckUsernameAvailabilityResponse>(
    `/auth/check-username?username=${encodeURIComponent(username)}`,
    { withCredentials: true }
  );
  return res.data;
},
```

**What this does:**
- Checks if email is available
- Checks if username is available
- Used during sign up
- URL-encodes parameters

## Usage Examples

### Sign Up

```typescript
const response = await authService.signUp(
  'johndoe',
  'password123',
  'john@example.com',
  'John',
  'Doe'
);
```

### Sign In

```typescript
const response = await authService.signIn('johndoe', 'password123');
```

### Fetch Current User

```typescript
const user = await authService.fetchMe();
console.log(user.username);
```

### Check Username

```typescript
const response = await authService.checkUsernameAvailability('johndoe');
if (response.available) {
  // Username is available
}
```

## Summary

**authService** is the authentication service that:
1. ✅ Handles sign up/in/out
2. ✅ Manages token refresh
3. ✅ Fetches user profile
4. ✅ Checks availability
5. ✅ Cookie-based auth

It's the "auth handler" - managing all authentication!


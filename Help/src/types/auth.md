# auth Types Explanation

## What is auth Types?

`auth` types is a **TypeScript type definitions file** that defines all authentication-related types and interfaces. It provides type safety for sign up, sign in, sign out, and token refresh operations.

## Key Features

### 1. **Response Types**
- Sign up response
- Sign in response
- Sign out response
- Token refresh response

### 2. **Availability Checks**
- Email availability
- Username availability

### 3. **Type Safety**
- TypeScript interfaces
- Optional fields
- Consistent structure

## Step-by-Step Breakdown

### Sign Up Response

```typescript
export interface SignUpResponse {
    success: boolean;
    message?: string;
    user?: User;
    accessToken?: string;
}
```

**What this does:**
- Defines sign up response structure
- Success flag
- Optional user data
- Optional access token

### Sign In Response

```typescript
export interface SignInResponse {
    success: boolean;
    message?: string;
    user?: User;
    accessToken?: string;
}
```

**What this does:**
- Defines sign in response structure
- Same structure as sign up
- Returns user and token

### Sign Out Response

```typescript
export interface SignOutResponse {
    success: boolean;
    message?: string;
}
```

**What this does:**
- Defines sign out response
- Simple success/message
- No user data needed

### Refresh Token Response

```typescript
export interface RefreshTokenResponse {
    accessToken: string;
}
```

**What this does:**
- Defines refresh response
- Returns new access token
- Simple structure

### Availability Responses

```typescript
export interface CheckEmailAvailabilityResponse {
    available: boolean;
    message?: string;
}

export interface CheckUsernameAvailabilityResponse {
    available: boolean;
    message?: string;
}
```

**What this does:**
- Defines availability check responses
- Available flag
- Optional message
- Used during sign up

### Fetch Me Response

```typescript
export interface FetchMeResponse {
    user: User;
}
```

**What this does:**
- Defines fetch current user response
- Returns user object
- Used for profile data

## Usage Examples

### Sign Up

```typescript
const response: SignUpResponse = await authService.signUp(...);
if (response.success && response.user) {
  console.log(response.user.username);
}
```

### Sign In

```typescript
const response: SignInResponse = await authService.signIn(...);
if (response.accessToken) {
  // Store token
}
```

### Check Availability

```typescript
const response: CheckUsernameAvailabilityResponse = await authService.checkUsernameAvailability('johndoe');
if (response.available) {
  // Username is available
}
```

## Summary

**auth types** is the authentication type definitions file that:
1. ✅ Defines auth response types
2. ✅ Availability check types
3. ✅ Type safety
4. ✅ Consistent structure
5. ✅ Easy to use

It's the "auth types" - ensuring type safety for authentication!


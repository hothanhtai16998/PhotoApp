# SignInPage Component Explanation

## What is SignInPage?

`SignInPage` is the **sign-in page** where users can log in with username/password or social providers (Google, Facebook, Apple). It handles form validation and OAuth redirects.

## Key Features

### 1. **Multiple Login Methods**
- Username/password login
- Google OAuth
- Facebook (coming soon)
- Apple (coming soon)

### 2. **Form Validation**
- Uses Zod schema validation
- Real-time error messages
- Password visibility toggle

### 3. **OAuth Error Handling**
- Handles OAuth callback errors
- Shows error messages from URL params
- Cleans up URL after showing error

### 4. **Password Visibility**
- Toggle show/hide password
- Eye icon indicator

## Step-by-Step Breakdown

### Form Setup

```typescript
const { register, handleSubmit, formState: { errors } } = useForm<SignInFormValue>({
  resolver: zodResolver(signInSchema),
});
```

**What this does:**
- Sets up React Hook Form
- Uses Zod for validation
- Provides form state and errors

### OAuth Error Handling

```typescript
useEffect(() => {
  const error = searchParams.get('error');
  if (error) {
    toast.error(decodeURIComponent(error));
    searchParams.delete('error');
    setSearchParams(searchParams, { replace: true });
  }
}, [searchParams, setSearchParams]);
```

**What this does:**
- Checks URL for error parameter
- Shows error toast message
- Decodes URL-encoded error
- Removes error from URL
- Handles OAuth callback errors

### Sign In Handler

```typescript
const onSubmit = async (data: SignInFormValue) => {
  setIsSubmitting(true);
  try {
    const username = data.username.trim();
    const password = data.password.trim();

    if (!username || !password) {
      return;
    }

    await signIn(username, password);
    navigate("/");
  } catch {
    // Error is handled by the store
  } finally {
    setIsSubmitting(false);
  }
};
```

**What this does:**
- Trims input values
- Validates input
- Calls auth store's signIn
- Navigates to home on success
- Handles errors (shown by store)

### Social Login

```typescript
const handleSocialLogin = (provider: string) => {
  if (provider === 'google') {
    const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
    window.location.href = `${apiUrl}/api/auth/google`;
  } else {
    alert(`Đăng nhập ${provider} sẽ sớm ra mắt!`);
  }
};
```

**What this does:**
- Redirects to OAuth provider
- Uses backend OAuth endpoint
- Shows "coming soon" for other providers
- Full page redirect (required for OAuth)

### Password Visibility Toggle

```typescript
const [showPassword, setShowPassword] = useState(false);

<Input
  type={showPassword ? "text" : "password"}
  {...register('password')}
/>
<button
  type="button"
  className="password-toggle"
  onClick={() => setShowPassword(!showPassword)}
>
  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
</button>
```

**What this does:**
- Toggles input type between text/password
- Shows/hides password text
- Updates icon based on state
- Better UX for password entry

## Form Structure

```typescript
<form onSubmit={handleSubmit(onSubmit)}>
  <Input {...register('username')} />
  {errors.username && <p>{errors.username.message}</p>}
  
  <div className="password-input-wrapper">
    <Input type={showPassword ? "text" : "password"} {...register('password')} />
    <button type="button" onClick={() => setShowPassword(!showPassword)}>
      {showPassword ? <EyeOff /> : <Eye />}
    </button>
  </div>
  {errors.password && <p>{errors.password.message}</p>}
  
  <Button type="submit" disabled={isSubmitting}>
    {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
  </Button>
</form>
```

## Summary

**SignInPage** is the authentication entry point that:
1. ✅ Supports username/password login
2. ✅ Supports OAuth (Google)
3. ✅ Validates form input
4. ✅ Handles OAuth errors
5. ✅ Password visibility toggle
6. ✅ Loading states

It's the "login gateway" - welcoming users back to the app!


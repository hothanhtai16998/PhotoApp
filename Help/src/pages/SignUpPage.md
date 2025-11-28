# SignUpPage Component Explanation

## What is SignUpPage?

`SignUpPage` is the **sign-up page** where new users can create accounts. It supports social sign-up (Google) and email/password registration with real-time validation.

## Key Features

### 1. **Multiple Sign-Up Methods**
- Email/password registration
- Google OAuth
- Facebook (coming soon)
- Apple (coming soon)

### 2. **Real-Time Validation**
- Email availability check
- Username availability check
- Visual validation status
- Prevents duplicate accounts

### 3. **Form Validation**
- Uses Zod schema
- Comprehensive validation rules
- Clear error messages

### 4. **Validation Status Display**
- Shows checking/available/unavailable status
- Visual indicators
- Real-time feedback

## Step-by-Step Breakdown

### Form Setup

```typescript
const { register, handleSubmit, watch, formState: { errors } } = useForm<SignUpFormValue>({
  resolver: zodResolver(signUpSchema),
});

const email = watch('email') || '';
const username = watch('username') || '';
```

**What this does:**
- Sets up React Hook Form
- Watches email and username for validation
- Uses Zod for schema validation

### Real-Time Validation

```typescript
const { emailStatus, usernameStatus } = useSignUpValidation(email, username);
```

**What this does:**
- Checks email availability as user types
- Checks username availability as user types
- Returns validation status (checking/available/unavailable)
- Debounced to reduce API calls

### Sign Up Handler

```typescript
const onSubmit = async (data: SignUpFormValue) => {
  setIsSubmitting(true);
  try {
    await signUp(
      data.username,
      data.password,
      data.email,
      data.firstName,
      data.lastName
    );
    navigate("/signin");
  } catch {
    // Error is handled by the store
  } finally {
    setIsSubmitting(false);
  }
};
```

**What this does:**
- Calls auth store's signUp
- Passes all form data
- Navigates to sign-in on success
- Handles errors (shown by store)

### Social Sign-Up

```typescript
const handleSocialLogin = (provider: string) => {
  if (provider === 'google') {
    const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
    window.location.href = `${apiUrl}/api/auth/google`;
  } else {
    alert(`Đăng nhập bằng ${provider} chưa khả dụng!`);
  }
};
```

**What this does:**
- Redirects to OAuth provider
- Uses backend OAuth endpoint
- Shows "coming soon" for other providers

### SignUpForm Component

The actual form is in a separate component:

```typescript
<SignUpForm
  register={register}
  handleSubmit={handleSubmit}
  watch={watch}
  errors={errors}
  onSubmit={onSubmit}
  isSubmitting={isSubmitting}
  emailStatus={emailStatus}
  usernameStatus={usernameStatus}
/>
```

**What this does:**
- Separates form UI from page logic
- Passes all necessary props
- Shows validation status
- Handles form submission

## Validation Status

The `useSignUpValidation` hook provides:

```typescript
{
  emailStatus: 'idle' | 'checking' | 'available' | 'unavailable' | 'invalid',
  usernameStatus: 'idle' | 'checking' | 'available' | 'unavailable' | 'invalid'
}
```

**Status meanings:**
- `idle`: Not checked yet
- `checking`: Currently checking
- `available`: Available to use
- `unavailable`: Already taken
- `invalid`: Invalid format

## Summary

**SignUpPage** is the account creation page that:
1. ✅ Supports email/password sign-up
2. ✅ Supports OAuth (Google)
3. ✅ Real-time validation
4. ✅ Visual validation status
5. ✅ Comprehensive form validation
6. ✅ Clear error messages

It's the "registration gateway" - helping new users join the platform!


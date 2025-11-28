# EditProfilePage Component Explanation

## What is EditProfilePage?

`EditProfilePage` is the **profile settings page** where users can edit their profile information and change their password. It features a sidebar navigation and section-based content.

## Key Features

### 1. **Section-Based Navigation**
- Edit Profile section
- Change Password section
- Download History (coming soon)
- Sidebar navigation

### 2. **OAuth User Handling**
- Hides password change for OAuth users
- Different menu items based on user type
- Prevents password changes for social logins

### 3. **Profile Editing**
- Edit personal information
- Upload avatar
- Edit bio, location, social links
- Character count for bio

### 4. **Password Change**
- Change password form
- Current password required
- New password validation
- Success/error messages

## Step-by-Step Breakdown

### Section Management

```typescript
const SECTION_IDS = {
  EDIT_PROFILE: 'edit-profile',
  CHANGE_PASSWORD: 'change-password',
  DOWNLOAD_HISTORY: 'download-history',
} as const;

const [activeSection, setActiveSection] = useState<SectionId>(SECTION_IDS.EDIT_PROFILE);
```

**What this does:**
- Defines available sections
- Tracks active section
- Type-safe section IDs

### OAuth User Check

```typescript
function shouldShowMenuItem(itemId: string, isOAuthUser: boolean): boolean {
  if (isOAuthUser && itemId === SECTION_IDS.CHANGE_PASSWORD) {
    return false;
  }
  return true;
}

const menuItems = allMenuItems.filter(item =>
  shouldShowMenuItem(item.id, user?.isOAuthUser ?? false)
);
```

**What this does:**
- Hides password change for OAuth users
- Filters menu items based on user type
- OAuth users can't change password (managed by provider)

### Form Initialization

```typescript
useEffect(() => {
  if (!user) {
    navigate(ROUTES.SIGNIN);
    return;
  }
  
  // Initialize form with user data
  const nameParts = user.displayName?.split(' ') ?? [];
  setValue('firstName', nameParts[0] ?? '');
  setValue('lastName', nameParts.slice(1).join(' ') ?? '');
  setValue('email', user.email ?? '');
  setValue('username', user.username ?? '');
  setValue('bio', user.bio ?? '');
  setValue('location', user.location ?? '');
  // ... more fields
}, [user, navigate, setValue]);
```

**What this does:**
- Redirects if not logged in
- Initializes form with user data
- Splits displayName into firstName/lastName
- Sets all form fields from user object

### Profile Edit Hook

```typescript
const {
  isSubmitting,
  avatarPreview,
  isUploadingAvatar,
  fileInputRef,
  register,
  handleSubmit,
  setValue,
  watch,
  bioCharCount,
  handleAvatarChange,
  handleAvatarButtonClick,
  onSubmit,
} = useProfileEdit();
```

**What this does:**
- Provides all profile edit functionality
- Handles avatar upload
- Manages form state
- Tracks bio character count
- Handles form submission

### Password Change Hook

```typescript
const {
  passwordError,
  passwordSuccess,
  registerPassword,
  handlePasswordSubmit,
  passwordErrors,
  onPasswordSubmit,
} = useProfileEdit();
```

**What this does:**
- Provides password change functionality
- Handles password form
- Shows success/error messages
- Validates password input

## Section Rendering

```typescript
{activeSection === SECTION_IDS.EDIT_PROFILE && user && (
  <ProfileForm
    user={user}
    avatarPreview={avatarPreview}
    isUploadingAvatar={isUploadingAvatar}
    fileInputRef={fileInputRef}
    bioCharCount={bioCharCount}
    register={register}
    handleSubmit={handleSubmit}
    watch={watch}
    handleAvatarChange={handleAvatarChange}
    handleAvatarButtonClick={handleAvatarButtonClick}
    onSubmit={onSubmit}
    isSubmitting={isSubmitting}
  />
)}

{activeSection === SECTION_IDS.CHANGE_PASSWORD && canChangePassword(user) && (
  <PasswordForm
    register={registerPassword}
    handleSubmit={handlePasswordSubmit}
    errors={passwordErrors}
    onSubmit={onPasswordSubmit}
    isSubmitting={isSubmitting}
    passwordError={passwordError}
    passwordSuccess={passwordSuccess}
  />
)}
```

**What this does:**
- Conditionally renders sections
- Shows profile form when active
- Shows password form when active (if allowed)
- Passes all necessary props

## Summary

**EditProfilePage** is the profile settings page that:
1. ✅ Section-based navigation
2. ✅ Profile editing with avatar upload
3. ✅ Password change (for non-OAuth users)
4. ✅ OAuth user handling
5. ✅ Form initialization from user data
6. ✅ Character count for bio

It's the "profile editor" - giving users control over their account settings!


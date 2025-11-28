# Header Component Explanation

## What is Header?

`Header` is the **main navigation component** that appears at the top of every page. It provides navigation, search, user menu, notifications, and upload functionality.

## Component Structure

```typescript
export const Header = memo(function Header() {
  const { accessToken, signOut } = useAuthStore()
  const { user } = useUserStore()
  const { fetchImages } = useImageStore()
  const navigate = useNavigate()
  
  // State management
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [logoStyle, setLogoStyle] = useState<LogoStyle>(getStoredLogoStyle())
  const [logoSelectorOpen, setLogoSelectorOpen] = useState(false)
  const searchBarRef = useRef<SearchBarRef>(null)

  // Effects and handlers
  // ... render JSX
})
```

## Key Features

### 1. **Responsive Design**
- Desktop: Full navigation bar with all features
- Mobile: Hamburger menu with collapsible navigation

### 2. **Authentication-Aware**
- Shows different UI for logged-in vs logged-out users
- Displays user avatar and menu when authenticated
- Shows sign-in button when not authenticated

### 3. **Logo Customization**
- Allows users to change logo style
- Updates favicon when logo changes
- Persists logo preference in storage

### 4. **Quick Actions**
- Upload button (opens upload modal)
- Notification bell
- User menu dropdown
- Search bar

## Step-by-Step Breakdown

### State Management

```typescript
const [uploadModalOpen, setUploadModalOpen] = useState(false)
const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
const [logoStyle, setLogoStyle] = useState<LogoStyle>(getStoredLogoStyle())
const [logoSelectorOpen, setLogoSelectorOpen] = useState(false)
const searchBarRef = useRef<SearchBarRef>(null)
```

**State purposes:**
- `uploadModalOpen`: Controls upload modal visibility
- `mobileMenuOpen`: Controls mobile menu visibility
- `logoStyle`: Current logo style (light/dark/custom)
- `logoSelectorOpen`: Controls logo selector modal
- `searchBarRef`: Reference to search bar for programmatic control

### Logo Style Management

```typescript
useEffect(() => {
  // Update favicon on initial load
  updateFavicon(logoStyle)
  
  const handleLogoStyleChange = (event: CustomEvent) => {
    const newStyle = event.detail as LogoStyle
    setLogoStyle(newStyle)
    updateFavicon(newStyle)
  }

  window.addEventListener('logoStyleChanged', handleLogoStyleChange as EventListener)
  return () => {
    window.removeEventListener('logoStyleChanged', handleLogoStyleChange as EventListener)
  }
}, [])
```

**What this does:**
- Updates favicon when component mounts
- Listens for `logoStyleChanged` custom event
- Updates logo style and favicon when event fires
- Cleans up event listener on unmount

**Why custom event?**
- Logo style can change from `LogoSelector` component
- Custom event allows cross-component communication
- Decouples Header from LogoSelector

### Logo Click Handler

```typescript
const handleLogoClick = () => {
  if (window.location.pathname !== '/') {
    navigate('/')
  } else {
    // If already on homepage, refresh images
    fetchImages()
  }
}
```

**What this does:**
- If not on homepage → navigate to homepage
- If already on homepage → refresh images
- Provides intuitive navigation behavior

### Sign Out Handler

```typescript
const handleSignOut = async () => {
  await signOut()
  navigate("/")
}
```

**What this does:**
- Calls auth store's `signOut()` function
- Navigates to homepage after sign out
- Clears auth state and cookies

## Desktop Header Layout

```
┌─────────────────────────────────────────────────────────┐
│ [Logo] [Search Bar]              [Upload] [🔔] [Avatar] │
└─────────────────────────────────────────────────────────┘
```

**Components:**
1. **Logo**: Clickable, navigates to home
2. **Search Bar**: Full-width search with suggestions
3. **Upload Button**: Opens upload modal
4. **Notification Bell**: Shows notification count
5. **User Avatar**: Opens dropdown menu

## Mobile Header Layout

```
┌─────────────────────────────────────┐
│ [☰] [Logo]              [🔔] [Avatar] │
└─────────────────────────────────────┘
         ↓ (when menu open)
┌─────────────────────────────────────┐
│ • Về chúng tôi                      │
│ • Thêm ảnh                          │
│ • Yêu thích                         │
│ • Admin (if admin)                  │
│ • Tài khoản                         │
│ • Đăng xuất                         │
└─────────────────────────────────────┘
```

## User Menu Dropdown

### When Logged In:
- **Yêu thích**: Link to favorites page
- **Admin**: Link to admin panel (if user is admin)
- **Về chúng tôi**: Link to about page
- **Tài khoản**: Link to profile page
- **Đăng xuất**: Sign out button

### When Logged Out:
- **Đăng nhập**: Link to sign-in page
- **Thêm ảnh**: Button that navigates to sign-in

## Mobile Menu

```typescript
{mobileMenuOpen && (
  <div className="mobile-menu">
    <div className="mobile-menu-content">
      <Link to="/about">Về chúng tôi</Link>
      {accessToken ? (
        <>
          <button onClick={() => { setUploadModalOpen(true); setMobileMenuOpen(false); }}>
            Thêm ảnh
          </button>
          <NotificationBell />
          <Link to="/favorites">Yêu thích</Link>
          {user?.isAdmin && <Link to="/admin">Admin</Link>}
          <Link to="/profile">Tài khoản</Link>
          <button onClick={() => { handleSignOut(); setMobileMenuOpen(false); }}>
            Đăng xuất
          </button>
        </>
      ) : (
        <>
          <Link to="/signin">Đăng nhập</Link>
          <button onClick={() => { navigate('/signin'); setMobileMenuOpen(false); }}>
            Thêm ảnh
          </button>
        </>
      )}
    </div>
  </div>
)}
```

**What this does:**
- Shows/hides based on `mobileMenuOpen` state
- Closes menu when link is clicked
- Shows different content based on auth status
- Includes all navigation options

## Logo Selector Integration

```typescript
<button
  className="header-logo-selector-btn"
  onClick={() => setLogoSelectorOpen(true)}
  aria-label="Change logo style"
  title="Change logo style"
>
  <Palette size={14} />
</button>

{logoSelectorOpen && (
  <LogoSelector onClose={() => setLogoSelectorOpen(false)} />
)}
```

**What this does:**
- Small palette icon next to logo
- Opens logo selector modal
- Allows users to change logo style
- Updates favicon automatically

## Performance Optimizations

### 1. **React.memo**
```typescript
export const Header = memo(function Header() {
  // ...
})
```

**Why?**
- Prevents unnecessary re-renders
- Header doesn't need to re-render on every state change
- Only re-renders when props/state actually change

### 2. **Conditional Rendering**
- Only renders mobile menu when open
- Only renders modals when needed
- Reduces DOM nodes when not visible

## Common Questions

### Q: Why use `memo`?
**A:** Header is a complex component. `memo` prevents re-renders when parent components update but Header's props don't change.

### Q: How does logo style persistence work?
**A:** `getStoredLogoStyle()` reads from localStorage. When changed, it's saved and custom event is dispatched.

### Q: Why separate mobile menu?
**A:** Mobile screens are too small for full desktop navigation. Hamburger menu provides better UX.

### Q: Can I add more menu items?
**A:** Yes! Add `<DropdownMenuItem>` or mobile menu links as needed.

### Q: How does search bar ref work?
**A:** `searchBarRef` allows Header to programmatically control SearchBar (e.g., focus on keyboard shortcut).

## Summary

**Header** is the main navigation component that:
1. ✅ Provides responsive navigation (desktop + mobile)
2. ✅ Shows authentication-aware UI
3. ✅ Integrates search, upload, notifications
4. ✅ Allows logo customization
5. ✅ Optimized with React.memo
6. ✅ Handles user menu and sign out

It's the "control center" of your app - providing access to all major features from anywhere!


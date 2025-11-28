# FloatingContactButton Component Explanation

## What is FloatingContactButton?

`FloatingContactButton` is a **floating contact button** that displays contact information and social media links. It auto-expands on page load and can be clicked to show a modal with full contact details.

## Key Features

### 1. **Floating Design**
- Fixed position on screen
- Auto-expands on load
- Auto-shrinks after 5 seconds
- Hover to expand

### 2. **Social Media Links**
- Instagram
- Facebook
- TikTok
- GitHub
- Quick access icons

### 3. **Contact Modal**
- Full contact information
- Email, phone, address
- Website link
- Bio section
- Social links

### 4. **Page-Specific Display**
- Hides on sign-in/sign-up pages
- Shows on all other pages
- Better UX

## Step-by-Step Breakdown

### Auto-Expand on Load

```typescript
useEffect(() => {
  const initTimeout = setTimeout(() => {
    setIsHovered(true);
    // Auto-shrink after 5 seconds if not hovered
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 5000);
  }, 0);

  return () => {
    clearTimeout(initTimeout);
  };
}, []);
```

**What this does:**
- Auto-expands on page load
- Shows social icons immediately
- Auto-shrinks after 5 seconds
- Better discoverability

### Hover Handlers

```typescript
const handleMouseEnter = () => {
  setIsHovered(true);
  if (hoverTimeoutRef.current) {
    clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = null;
  }
};

const handleMouseLeave = () => {
  if (hoverTimeoutRef.current) {
    clearTimeout(hoverTimeoutRef.current);
  }
  hoverTimeoutRef.current = setTimeout(() => {
    setIsHovered(false);
  }, 5000);
};
```

**What this does:**
- Expands on hover
- Cancels auto-shrink timer
- Shrinks 5 seconds after mouse leave
- Smooth interactions

### Page-Specific Display

```typescript
const isAuthPage = location.pathname === '/signin' || location.pathname === '/signup';

if (isAuthPage) {
  return null;
}
```

**What this does:**
- Hides on authentication pages
- Shows on all other pages
- Better UX (doesn't interfere with login)

### Contact Modal

```typescript
{isOpen && (
  <div className="contact-modal-overlay" onClick={() => setIsOpen(false)}>
    <div className="contact-modal" onClick={(e) => e.stopPropagation()}>
      <ContactInfoContent />
    </div>
  </div>
)}
```

**What this does:**
- Shows modal when clicked
- Displays full contact info
- Closes on overlay click
- Prevents event bubbling

## Summary

**FloatingContactButton** is the floating contact widget that:
1. ✅ Auto-expands on load
2. ✅ Shows social media links
3. ✅ Opens contact modal
4. ✅ Hides on auth pages
5. ✅ Hover interactions

It's the "contact hub" - making it easy for users to reach out!


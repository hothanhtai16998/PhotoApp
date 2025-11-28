# Avatar Component Explanation

## What is Avatar?

`Avatar` is a **simple avatar display component** that shows user profile pictures or initials. It handles missing avatars gracefully with fallback initials.

## Component Structure

```typescript
export function Avatar({
  user,
  size = 32,
  className = '',
  fallbackClassName = '',
  showName = false,
}: AvatarProps)
```

## Key Features

### 1. **Image Display**
- Shows user avatar if available
- Falls back to initials if not

### 2. **Initials Generation**
- Uses displayName or username
- First character uppercase
- Fallback to "U" if no name

### 3. **Error Handling**
- Hides broken images
- Shows placeholder on error
- Graceful degradation

## Step-by-Step Breakdown

### Extract User Data

```typescript
const displayName = 'displayName' in user ? user.displayName : undefined;
const username = 'username' in user ? user.username : undefined;
const avatarUrl = 'avatarUrl' in user ? user.avatarUrl : undefined;
```

**What this does:**
- Safely extracts user properties
- Handles different user object shapes
- Type-safe property access

### Generate Initials

```typescript
const initials = (
  displayName?.trim() || username || 'U'
).charAt(0).toUpperCase();
```

**What this does:**
- Uses displayName if available
- Falls back to username
- Falls back to "U"
- Always uppercase

### Size Styling

```typescript
const sizeStyle =
  typeof size === 'number' ? { width: size, height: size } : {};
```

**What this does:**
- Supports number (pixels) or string (CSS)
- Applies size to both width and height
- Square avatars

### Image with Error Handling

```typescript
{avatarUrl ? (
  <img
    src={avatarUrl}
    alt={displayName || username || 'User'}
    className={`avatar-image ${className}`}
    style={sizeStyle}
    onError={(e) => {
      e.currentTarget.style.display = 'none';
    }}
  />
) : (
  <div
    className={`avatar-placeholder ${fallbackClassName || className}`}
    style={sizeStyle}
  >
    {initials}
  </div>
)}
```

**What this does:**
- Shows image if URL exists
- Hides image on error
- Shows placeholder with initials
- Applies size styling

## Usage Examples

### Basic Usage

```typescript
<Avatar user={user} size={32} />
```

### With Custom Class

```typescript
<Avatar 
  user={user} 
  size={48} 
  className="header-avatar"
  fallbackClassName="header-avatar-placeholder"
/>
```

### With Name

```typescript
<Avatar 
  user={user} 
  size={32} 
  showName={true}
/>
```

## Summary

**Avatar** is a simple but essential component that:
1. ✅ Displays user avatars
2. ✅ Falls back to initials
3. ✅ Handles errors gracefully
4. ✅ Supports custom sizing
5. ✅ Optional name display

It's the "user identifier" - showing who users are at a glance!


# ImageModalHeader Component Explanation

## What is ImageModalHeader?

`ImageModalHeader` is a **component** that renders the header section of the image modal. It displays user info, favorite button, download button, and collection button.

## Key Features

### 1. **User Information**
- Avatar and name
- User profile card on hover
- Click to view profile
- Verified badge

### 2. **Actions**
- Favorite button
- Download size selector
- Add to collection
- Close button (mobile)

### 3. **Responsive Design**
- Desktop header
- Mobile header
- Different layouts

### 4. **User Profile Card**
- Hover to show
- User images preview
- Follow button
- Profile stats

## Step-by-Step Breakdown

### Component Props

```typescript
interface ImageModalHeaderProps {
  image: Image;
  user: User | null;
  isMobile: boolean;
  renderAsPage: boolean;
  isFavorited: boolean;
  handleToggleFavorite: () => void;
  handleDownloadWithSize: (size: DownloadSize) => void;
  handleViewProfile: (e: React.MouseEvent) => void;
  handleOpenCollection: () => void;
  onClose: () => void;
  modalContentRef: React.RefObject<HTMLDivElement | null>;
  onImageSelect: (image: Image) => void;
}
```

**What this does:**
- Receives image and handlers
- Different layouts for mobile/desktop
- User profile card integration

### User Profile Card Hook

```typescript
const {
  showUserProfileCard,
  isClosingProfileCard,
  userImages,
  isLoadingUserImages,
  userInfoRef,
  userProfileCardRef,
  handleMouseEnter,
  handleMouseLeave,
  handleUserImageClick,
} = useUserProfileCard({
  image,
  modalContentRef,
  onImageSelect,
});
```

**What this does:**
- Manages profile card state
- Loads user images
- Handles hover interactions

### Desktop Header

```typescript
if (!isMobile && !renderAsPage) {
  return (
    <div className="image-modal-header">
      {/* Left: User Info */}
      <div
        className="modal-header-left clickable-user-info"
        ref={userInfoRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleViewProfile}
      >
        <Avatar user={image.uploadedBy} size={40} />
        <div className="modal-user-info">
          <div className="modal-user-name">
            {image.uploadedBy.displayName || image.uploadedBy.username}
            <CheckCircle2 className="verified-badge" />
          </div>
        </div>
        {/* User Profile Card */}
        {showUserProfileCard && (
          <div ref={userProfileCardRef} className="user-profile-card">
            {/* Profile card content */}
          </div>
        )}
      </div>
      {/* Right: Actions */}
      <div className="modal-header-right">
        {/* Favorite, Download, Collection buttons */}
      </div>
    </div>
  );
}
```

**What this does:**
- Desktop layout
- User info on left
- Actions on right
- Profile card on hover

### Mobile Header

```typescript
if (isMobile || renderAsPage) {
  return (
    <div className="image-modal-header mobile">
      {/* Simplified mobile layout */}
      {/* Close button, user info, actions */}
    </div>
  );
}
```

**What this does:**
- Mobile layout
- Simplified design
- Close button visible

## Usage Examples

### In ImageModal

```typescript
<ImageModalHeader
  image={image}
  user={user}
  isMobile={isMobile}
  renderAsPage={renderAsPage}
  isFavorited={isFavorited}
  handleToggleFavorite={handleToggleFavorite}
  handleDownloadWithSize={handleDownloadWithSize}
  handleViewProfile={handleViewProfile}
  handleOpenCollection={handleOpenCollection}
  onClose={onClose}
  modalContentRef={modalContentRef}
  onImageSelect={onImageSelect}
/>
```

## Summary

**ImageModalHeader** is the image modal header component that:
1. ✅ User information display
2. ✅ Favorite and download actions
3. ✅ User profile card
4. ✅ Responsive design
5. ✅ Collection button

It's the "modal header" - providing actions and user info!


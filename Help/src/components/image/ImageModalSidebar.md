# ImageModalSidebar Component Explanation

## What is ImageModalSidebar?

`ImageModalSidebar` is a **component** that renders the sidebar/footer section of the image modal. It displays image stats, info, tags, and action buttons.

## Key Features

### 1. **Image Statistics**
- Views count
- Downloads count
- Formatted numbers

### 2. **Image Information**
- Title
- Location (with Google Maps link)
- Camera model
- Upload date
- Tags

### 3. **Actions**
- Favorite button
- Add to collection
- Edit button (owner only)
- Report button
- Share button

### 4. **Share and Info Modals**
- Share menu
- Info modal with charts
- Positioned dynamically

## Step-by-Step Breakdown

### Component Props

```typescript
interface ImageModalSidebarProps {
  image: Image;
  views: number;
  downloads: number;
  isFavorited: boolean;
  isTogglingFavorite: boolean;
  user: User | null;
  handleToggleFavorite: () => void;
  handleOpenCollection: () => void;
  handleEdit: () => void;
  onClose: () => void;
}
```

**What this does:**
- Receives image and stats
- Handlers for actions
- User info for permissions

### Statistics Display

```typescript
<div className="modal-footer-left-stats">
  <div className="modal-stat">
    <span className="stat-label">Lượt xem</span>
    <span className="stat-value">{views.toLocaleString()}</span>
  </div>
  <div className="modal-stat">
    <span className="stat-label">Lượt tải</span>
    <span className="stat-value">{downloads.toLocaleString()}</span>
  </div>
</div>
```

**What this does:**
- Displays views and downloads
- Formatted with locale string
- Vietnamese labels

### Location Display

```typescript
{image.location && (
  <span>
    <MapPin size={14} />
    {image.coordinates ? (
      <a
        href={`https://www.google.com/maps?q=${image.coordinates.latitude},${image.coordinates.longitude}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        {image.location}
        <ExternalLink size={12} />
      </a>
    ) : (
      <span>{image.location}</span>
    )}
  </span>
)}
```

**What this does:**
- Shows location
- Links to Google Maps if coordinates available
- External link icon

### Tags Display

```typescript
{image.tags && Array.isArray(image.tags) && image.tags.length > 0 && (
  <div className="image-info-tags">
    {image.tags.map((tag, index) => (
      <span key={index} className="image-tag">
        <Tag size={12} />
        {tag}
      </span>
    ))}
  </div>
)}
```

**What this does:**
- Displays tags
- Tag icon for each
- Clickable (can navigate to tag search)

### Action Buttons

```typescript
<div className="modal-footer-right">
  <button onClick={handleToggleFavorite}>
    <Heart className={isFavorited ? 'filled' : ''} />
    {isFavorited ? 'Đã thích' : 'Thích'}
  </button>
  <button onClick={handleOpenCollection}>
    <FolderPlus />
    Thêm vào bộ sưu tập
  </button>
  {user?._id === image.uploadedBy?._id && (
    <button onClick={handleEdit}>
      <Edit2 />
      Chỉnh sửa
    </button>
  )}
  <ReportButton image={image} />
  <ImageModalShare image={image} />
  <ImageModalInfo image={image} />
</div>
```

**What this does:**
- Favorite button with state
- Collection button
- Edit button (owner only)
- Report, share, info buttons

## Usage Examples

### In ImageModal

```typescript
<ImageModalSidebar
  image={image}
  views={views}
  downloads={downloads}
  isFavorited={isFavorited}
  isTogglingFavorite={isTogglingFavorite}
  user={user}
  handleToggleFavorite={handleToggleFavorite}
  handleOpenCollection={handleOpenCollection}
  handleEdit={handleEdit}
  onClose={onClose}
/>
```

## Summary

**ImageModalSidebar** is the image modal sidebar component that:
1. ✅ Displays image statistics
2. ✅ Image information and tags
3. ✅ Action buttons
4. ✅ Share and info modals
5. ✅ Location with maps link

It's the "modal sidebar" - providing image details and actions!


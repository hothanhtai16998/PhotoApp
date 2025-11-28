# CollectionHeader Component Explanation

## What is CollectionHeader?

`CollectionHeader` is a **component** that renders the header section of the collection detail page. It displays collection info, actions, and navigation.

## Key Features

### 1. **Collection Information**
- Collection name
- Description
- Image count
- Views count
- Creator info

### 2. **Actions**
- Favorite button
- Share button
- Export button
- Selection mode toggle
- Report button

### 3. **Navigation**
- Back button
- Navigate to collections list

### 4. **Permissions**
- Edit button (owner only)
- Selection mode (owner only)
- Report button (non-owner)

## Step-by-Step Breakdown

### Component Props

```typescript
interface CollectionHeaderProps {
  collection: Collection | null;
  imagesCount: number;
  user: User | null;
  isFavorited: boolean;
  togglingFavorite: boolean;
  selectionMode: boolean;
  canEdit: boolean;
  handleToggleFavorite: () => void;
  handleExportCollection: () => void;
  toggleSelectionMode: () => void;
}
```

**What this does:**
- Receives collection and user
- State and handlers
- Permission flags

### Back Button

```typescript
<button
  className="collection-detail-back"
  onClick={() => navigate('/collections')}
>
  ← Quay lại
</button>
```

**What this does:**
- Navigates back
- Vietnamese text
- Arrow icon

### Collection Info

```typescript
<div className="collection-detail-info">
  <h1>{collection?.name || 'Bộ sưu tập'}</h1>
  {collection?.description && (
    <p className="collection-detail-description">
      {collection.description}
    </p>
  )}
  <div className="collection-detail-meta">
    <span>{imagesCount} ảnh</span>
    {collection?.views !== undefined && collection.views > 0 && (
      <span>{collection.views} lượt xem</span>
    )}
    {typeof collection?.createdBy === 'object' && collection.createdBy && (
      <span>
        bởi {collection.createdBy.displayName || collection.createdBy.username}
      </span>
    )}
  </div>
</div>
```

**What this does:**
- Displays name and description
- Shows image count
- Shows views if available
- Shows creator info

### Actions

```typescript
<div className="collection-detail-actions">
  <button
    className={`collection-favorite-btn ${isFavorited ? 'favorited' : ''}`}
    onClick={handleToggleFavorite}
    disabled={togglingFavorite}
  >
    <Heart size={18} fill={isFavorited ? 'currentColor' : 'none'} />
    <span>{isFavorited ? 'Đã yêu thích' : 'Yêu thích'}</span>
  </button>
  {collection?.isPublic && (
    <CollectionShare collection={collection} />
    {user && user._id !== collection.createdBy._id && (
      <ReportButton
        type="collection"
        targetId={collection._id}
        targetName={collection.name}
      />
    )}
  )}
  {imagesCount > 0 && collection && (
    <button onClick={handleExportCollection}>
      <Download size={18} />
      <span>Xuất</span>
    </button>
  )}
  {canEdit && imagesCount > 0 && (
    <button
      className={`collection-selection-mode-btn ${selectionMode ? 'active' : ''}`}
      onClick={toggleSelectionMode}
    >
      <CheckSquare2 size={18} />
      <span>Chọn ảnh</span>
    </button>
  )}
</div>
```

**What this does:**
- Favorite button with state
- Share and report (public only)
- Export button (if images exist)
- Selection mode (owner only)

## Usage Examples

### In CollectionDetailPage

```typescript
<CollectionHeader
  collection={collection}
  imagesCount={images.length}
  user={user}
  isFavorited={isFavorited}
  togglingFavorite={togglingFavorite}
  selectionMode={selectionMode}
  canEdit={canEdit}
  handleToggleFavorite={handleToggleFavorite}
  handleExportCollection={handleExportCollection}
  toggleSelectionMode={toggleSelectionMode}
/>
```

## Summary

**CollectionHeader** is the collection header component that:
1. ✅ Collection information display
2. ✅ Favorite and share actions
3. ✅ Export functionality
4. ✅ Selection mode toggle
5. ✅ Permission-based actions

It's the "collection header" - providing collection info and actions!


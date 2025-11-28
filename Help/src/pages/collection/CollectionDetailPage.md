# CollectionDetailPage Component Explanation

## What is CollectionDetailPage?

`CollectionDetailPage` is the **collection detail page** where users can view, manage, and interact with a specific collection. It includes image grid, collaboration management, version history, and bulk actions.

## Key Features

### 1. **Collection Management**
- View collection details
- Edit collection
- Delete collection
- Set cover image

### 2. **Image Management**
- View all images in collection
- Drag and drop reordering
- Bulk selection and removal
- Image modal (desktop)

### 3. **Collaboration**
- View collaborators
- Manage permissions
- Invite collaborators

### 4. **Version History**
- View collection versions
- Restore previous versions
- Track changes over time

## Step-by-Step Breakdown

### Mobile Detection

```typescript
const [isMobile, setIsMobile] = useState(() => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= appConfig.mobileBreakpoint;
});

useEffect(() => {
  const handleResize = () => {
    setIsMobile(window.innerWidth <= appConfig.mobileBreakpoint);
  };
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

**What this does:**
- Detects mobile viewport
- Updates on window resize
- Used for conditional rendering

### Collection Detail Hook

```typescript
const {
  collectionId,
  collection,
  loading,
  user,
  isOwner,
  userPermission,
  canEdit,
  coverImageId,
} = useCollectionDetail();
```

**What this does:**
- Gets collection ID from URL
- Fetches collection data
- Determines user permissions
- Checks if user is owner
- Provides edit permissions

### Collection Store

```typescript
const {
  isFavorited,
  togglingFavorite,
  versions,
  loadingVersions,
  updatingCover,
  fetchCollection,
  setCoverImage,
  toggleFavorite,
  fetchVersions,
  restoreVersion,
} = useCollectionStore();
```

**What this does:**
- Manages collection state
- Handles favorite toggle
- Manages version history
- Handles cover image updates

### Collection Images Hook

```typescript
const {
  images,
  imageTypes,
  draggedImageId,
  dragOverImageId,
  isReordering,
  selectionMode,
  selectedImageIds,
  isBulkRemoving,
  selectedImage,
  currentImageIds,
  processedImages,
  handleImageLoad,
  handleImageUpdate,
  handleDragStart,
  handleDragOver,
  handleDragLeave,
  handleDrop,
  handleDragEnd,
  handleImageClick,
  handleBulkRemove,
  toggleSelectionMode,
  toggleImageSelection,
  selectAllImages,
  deselectAllImages,
  setSearchParams,
} = useCollectionImages({
  collection,
  collectionId,
  isOwner,
  isMobile,
  fetchCollection,
});
```

**What this does:**
- Manages collection images
- Handles drag and drop
- Manages selection mode
- Handles bulk actions
- Detects image types

### Set Cover Image

```typescript
const handleSetCoverImage = useCallback(async (imageId: string, e: React.MouseEvent) => {
  e.stopPropagation();
  if (!collectionId || !isOwner) return;
  
  try {
    await setCoverImage(collectionId, imageId);
    await fetchCollection(collectionId);
    toast.success('Đã đặt ảnh bìa');
  } catch (error) {
    toast.error('Không thể đặt ảnh bìa');
  }
}, [collectionId, isOwner, setCoverImage, fetchCollection]);
```

**What this does:**
- Sets image as collection cover
- Only works for owners
- Refreshes collection after update
- Shows success/error messages

## Component Structure

The page is composed of several sub-components:

1. **CollectionHeader**: Title, description, actions
2. **CollectionImageGrid**: Image grid with drag and drop
3. **CollectionBulkActions**: Bulk selection actions
4. **CollectionCollaborators**: Collaboration management
5. **CollectionVersionHistory**: Version history viewer
6. **ImageModal**: Image viewer (desktop only)

## Summary

**CollectionDetailPage** is the comprehensive collection management page that:
1. ✅ Displays collection details
2. ✅ Manages collection images
3. ✅ Supports drag and drop reordering
4. ✅ Handles bulk actions
5. ✅ Manages collaborators
6. ✅ Shows version history
7. ✅ Responsive design (mobile/desktop)

It's the "collection hub" - providing full control over collections!


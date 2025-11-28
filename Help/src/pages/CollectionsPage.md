# CollectionsPage Component Explanation

## What is CollectionsPage?

`CollectionsPage` is the **collections management page** where users can view, search, filter, and manage all their collections. It includes features like search, filtering by tags, sorting, and collection actions.

## Key Features

### 1. **Search and Filtering**
- Search collections by name
- Filter by tags
- Filter by public/private status
- Sort by various criteria

### 2. **Collection Actions**
- View collection
- Edit collection
- Delete collection
- Duplicate collection
- Toggle public/private
- Save as template
- Favorite/unfavorite

### 3. **Collection Grid**
- Displays collections with cover images
- Shows collection metadata
- Responsive grid layout

## Step-by-Step Breakdown

### Authentication Check

```typescript
useEffect(() => {
  if (!accessToken) {
    toast.info('Vui lòng đăng nhập để xem bộ sưu tập');
    navigate('/');
    return;
  }
  
  const loadCollections = async () => {
    await fetchCollections();
    const currentCollections = useCollectionsListStore.getState().collections;
    if (currentCollections.length > 0) {
      const collectionIds = currentCollections.map((c) => c._id).filter(Boolean);
      await checkFavorites(collectionIds);
    }
  };
  
  loadCollections();
}, [accessToken, navigate, fetchCollections, checkFavorites]);
```

**What this does:**
- Checks authentication
- Fetches collections
- Checks favorite statuses for all collections
- Handles errors gracefully

### Tag Extraction

```typescript
const allTags = useMemo(() => {
  const tagSet = new Set<string>();
  collections.forEach(collection => {
    if (collection.tags && Array.isArray(collection.tags)) {
      collection.tags.forEach(tag => tagSet.add(tag));
    }
  });
  return Array.from(tagSet).sort();
}, [collections]);
```

**What this does:**
- Extracts all unique tags from collections
- Uses Set to avoid duplicates
- Sorts tags alphabetically
- Updates when collections change

### Delete Collection

```typescript
const handleDeleteCollection = async (collectionId: string) => {
  if (!confirm('Bạn có chắc chắn muốn xóa bộ sưu tập này?')) {
    return;
  }
  await deleteCollection(collectionId);
};
```

**What this does:**
- Confirms before deletion
- Calls store's delete function
- Handles errors in store

### Duplicate Collection

```typescript
const handleDuplicateCollection = async (e: React.MouseEvent, collection: Collection) => {
  e.stopPropagation();
  if (!confirm(`Tạo bản sao của "${collection.name}"?`)) {
    return;
  }
  
  const newCollection = await collectionService.createCollection({
    name: `${collection.name} (Bản sao)`,
    description: collection.description || undefined,
    isPublic: false,
  });
  
  // Copy images if any
  if (collection.images && collection.images.length > 0) {
    const imageIds = collection.images
      .filter((img): img is string => typeof img === 'string')
      .concat(
        collection.images
          .filter((img): img is Image => typeof img === 'object' && '_id' in img)
          .map(img => img._id)
      );
    
    for (const imageId of imageIds) {
      try {
        await collectionService.addImageToCollection(newCollection._id, imageId);
      } catch (err) {
        console.warn('Failed to add image to duplicate:', err);
      }
    }
  }
  
  await refreshCollections();
  toast.success('Đã tạo bản sao bộ sưu tập');
};
```

**What this does:**
- Creates duplicate collection
- Copies name with "(Bản sao)" suffix
- Copies description
- Sets as private by default
- Copies all images from original
- Handles errors gracefully

### Save as Template

```typescript
const handleSaveAsTemplate = async (e: React.MouseEvent, collection: Collection) => {
  e.stopPropagation();
  const templateName = prompt(`Nhập tên mẫu cho "${collection.name}":`, collection.name);
  if (!templateName?.trim()) {
    return;
  }
  
  setSavingAsTemplate(collection._id);
  try {
    await collectionTemplateService.saveCollectionAsTemplate(collection._id, {
      templateName: templateName.trim(),
    });
    toast.success('Đã lưu bộ sưu tập thành mẫu');
  } catch (error) {
    toast.error('Không thể lưu mẫu. Vui lòng thử lại.');
  } finally {
    setSavingAsTemplate(null);
  }
};
```

**What this does:**
- Prompts for template name
- Saves collection as template
- Shows loading state
- Handles errors

## Filtering and Sorting

Filtering and sorting are handled by the store:

```typescript
const {
  filteredCollections,
  searchQuery,
  showPublicOnly,
  sortBy,
  selectedTag,
  setSearchQuery,
  setShowPublicOnly,
  setSortBy,
  setSelectedTag,
  clearFilters,
} = useCollectionsListStore();
```

**Available filters:**
- Search query (name search)
- Public only toggle
- Tag filter
- Sort by: newest, oldest, name, images count

## Summary

**CollectionsPage** is the collections management hub that:
1. ✅ Displays all user collections
2. ✅ Provides search and filtering
3. ✅ Supports collection actions (edit, delete, duplicate, etc.)
4. ✅ Shows favorite status
5. ✅ Handles empty states
6. ✅ Responsive grid layout

It's the "collections manager" - giving users full control over their collections!


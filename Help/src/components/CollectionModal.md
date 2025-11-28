# CollectionModal Component Explanation

## What is CollectionModal?

`CollectionModal` is the **collection management modal** that allows users to create new collections, edit existing ones, add images to collections, and use collection templates.

## Key Features

### 1. **Dual Mode**
- Create mode: Create new collection
- Edit mode: Edit existing collection

### 2. **Image Management**
- Add image to collection
- Remove image from collection
- Shows which collections contain image

### 3. **Collection Templates**
- Use templates to create collections
- Pre-filled with template data
- Saves time

### 4. **Tags Management**
- Add/remove tags
- Max 10 tags
- Comma-separated input

## Step-by-Step Breakdown

### Mode Detection

```typescript
const isEditMode = !!collectionToEdit;
```

**What this does:**
- Determines if editing or creating
- Affects UI and behavior
- Different forms for each mode

### Initialize Edit Form

```typescript
useEffect(() => {
  if (collectionToEdit) {
    setEditCollectionName(collectionToEdit.name || '');
    setEditCollectionDescription(collectionToEdit.description || '');
    setEditCollectionPublic(collectionToEdit.isPublic !== false);
    setEditCollectionTags(collectionToEdit.tags || []);
    setShowCreateForm(false);
  }
}, [collectionToEdit]);
```

**What this does:**
- Populates form when editing
- Sets initial values
- Hides create form

### Load Collections

```typescript
useEffect(() => {
  if (!isOpen || isEditMode || !imageId) return;

  const loadData = async () => {
    const [userCollections, containingCollections] = await Promise.all([
      collectionService.getUserCollections(),
      collectionService.getCollectionsContainingImage(imageId),
    ]);

    setCollections(userCollections);
    const containingIds = new Set(containingCollections.map((c) => c._id));
    setCollectionsContainingImage(containingIds);
  };

  loadData();
}, [isOpen, imageId, isEditMode]);
```

**What this does:**
- Loads user's collections
- Checks which contain the image
- Only in create mode with imageId
- Parallel loading for performance

### Tags Management

```typescript
const addTag = (tag: string, isEdit: boolean) => {
  const trimmedTag = tag.trim().toLowerCase();
  if (!trimmedTag) return;
  
  if (isEdit) {
    if (!editCollectionTags.includes(trimmedTag) && editCollectionTags.length < 10) {
      setEditCollectionTags([...editCollectionTags, trimmedTag]);
      setEditTagInput('');
    }
  } else {
    if (!newCollectionTags.includes(trimmedTag) && newCollectionTags.length < 10) {
      setNewCollectionTags([...newCollectionTags, trimmedTag]);
      setNewTagInput('');
    }
  }
};
```

**What this does:**
- Adds tag to collection
- Prevents duplicates
- Limits to 10 tags
- Normalizes to lowercase

### Create Collection

```typescript
const handleCreate = async () => {
  setCreating(true);
  try {
    const newCollection = await collectionService.createCollection({
      name: newCollectionName.trim(),
      description: newCollectionDescription.trim() || undefined,
      isPublic: newCollectionPublic,
      tags: newCollectionTags.length > 0 ? newCollectionTags : undefined,
    });

    // Add image if provided
    if (imageId) {
      await collectionService.addImageToCollection(newCollection._id, imageId);
    }

    toast.success('Đã tạo bộ sưu tập');
    onCollectionUpdate?.();
    onClose();
  } catch (error) {
    toast.error('Không thể tạo bộ sưu tập');
  } finally {
    setCreating(false);
  }
};
```

**What this does:**
- Creates new collection
- Adds image if provided
- Shows success message
- Calls update callback
- Closes modal

### Use Template

```typescript
const handleUseTemplate = (template: CollectionTemplate) => {
  setSelectedTemplate(template);
  setNewCollectionName(template.name || '');
  setNewCollectionDescription(template.description || '');
  setNewCollectionTags(template.tags || []);
  setShowTemplates(false);
  setShowCreateForm(true);
};
```

**What this does:**
- Applies template data
- Pre-fills form fields
- Hides template list
- Shows create form

## Summary

**CollectionModal** is the collection management interface that:
1. ✅ Creates new collections
2. ✅ Edits existing collections
3. ✅ Adds images to collections
4. ✅ Uses collection templates
5. ✅ Manages tags
6. ✅ Shows collection status

It's the "collection manager" - making it easy to organize images into collections!


# useCollectionImageStore Explanation

## What is useCollectionImageStore?

`useCollectionImageStore` is a **Zustand store** that manages images within a collection. It handles image management, drag-and-drop reordering, selection mode, and bulk operations.

## Key Features

### 1. **Image Management**
- Set images
- Update image
- Remove image
- Reorder images

### 2. **Drag and Drop**
- Drag state
- Drag over state
- Reordering state
- Optimistic updates

### 3. **Selection Mode**
- Toggle selection mode
- Select/deselect images
- Select all
- Bulk operations

### 4. **Image Types**
- Portrait/landscape tracking
- Layout optimization

## Step-by-Step Breakdown

### Set Images

```typescript
setImages: (images: Image[]) => {
  set((state) => {
    state.images = images;
  });
},
```

**What this does:**
- Sets collection images
- Replaces entire array
- Used when loading collection

### Reorder Images

```typescript
reorderImages: async (collectionId: string, newOrder: string[]) => {
  set((state) => {
    state.isReordering = true;
    // Optimistically update UI
    const reorderedImages = newOrder
      .map((id) => state.images.find((img) => img._id === id))
      .filter((img): img is Image => img !== undefined);
    state.images = reorderedImages;
  });

  try {
    const updatedCollection = await collectionService.reorderCollectionImages(
      collectionId,
      newOrder
    );
    
    // Update from server response
    set((state) => {
      state.images = imageArray;
      state.isReordering = false;
    });
  } catch (error) {
    // Reload collection to revert optimistic update
    // ...
  }
},
```

**What this does:**
- Reorders images optimistically
- Updates server
- Reverts on error
- Shows loading state

### Selection Mode

```typescript
toggleSelectionMode: () => {
  set((state) => {
    state.selectionMode = !state.selectionMode;
    if (!state.selectionMode) {
      state.selectedImageIds.clear();
    }
  });
},

toggleImageSelection: (imageId: string) => {
  set((state) => {
    if (state.selectedImageIds.has(imageId)) {
      state.selectedImageIds.delete(imageId);
    } else {
      state.selectedImageIds.add(imageId);
    }
  });
},

selectAllImages: () => {
  set((state) => {
    state.selectedImageIds = new Set(state.images.map((img) => img._id));
  });
},
```

**What this does:**
- Toggles selection mode
- Selects/deselects images
- Selects all images
- Clears on mode exit

### Bulk Remove

```typescript
bulkRemoveImages: async (collectionId: string, imageIds: string[]) => {
  set((state) => {
    state.isBulkRemoving = true;
  });

  try {
    // Remove images one by one
    for (const imageId of imageIds) {
      await collectionService.removeImageFromCollection(collectionId, imageId);
      set((state) => {
        state.images = state.images.filter((img) => img._id !== imageId);
        state.selectedImageIds.delete(imageId);
      });
    }
    
    toast.success(`Đã xóa ${imageIds.length} ảnh`);
  } catch (error) {
    // Handle error...
  } finally {
    set((state) => {
      state.isBulkRemoving = false;
    });
  }
},
```

**What this does:**
- Removes multiple images
- Shows loading state
- Updates UI progressively
- Handles errors

## Usage Examples

### Set Images

```typescript
const { setImages } = useCollectionImageStore();

useEffect(() => {
  if (collection?.images) {
    setImages(collection.images);
  }
}, [collection]);
```

### Reorder Images

```typescript
const { reorderImages } = useCollectionImageStore();

const handleDrop = (newOrder: string[]) => {
  reorderImages(collectionId, newOrder);
};
```

### Selection Mode

```typescript
const { selectionMode, toggleSelectionMode, selectedImageIds } = useCollectionImageStore();

<button onClick={toggleSelectionMode}>
  {selectionMode ? 'Cancel' : 'Select'}
</button>
```

## Summary

**useCollectionImageStore** is the collection image store that:
1. ✅ Manages collection images
2. ✅ Drag and drop reordering
3. ✅ Selection mode
4. ✅ Bulk operations
5. ✅ Image type tracking

It's the "collection image manager" - handling all collection image operations!


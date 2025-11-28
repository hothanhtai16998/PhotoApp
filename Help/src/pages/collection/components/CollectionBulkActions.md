# CollectionBulkActions Component Explanation

## What is CollectionBulkActions?

`CollectionBulkActions` is a **component** that displays bulk action buttons when selection mode is active. It shows selected count and provides bulk remove functionality.

## Key Features

### 1. **Bulk Actions Bar**
- Shows when selection mode active
- Selected count display
- Action buttons
- Sticky positioning

### 2. **Selection Management**
- Select all button
- Deselect all button
- Toggle based on selection

### 3. **Bulk Operations**
- Remove from collection
- Loading state
- Disabled during operation

## Step-by-Step Breakdown

### Component Props

```typescript
interface CollectionBulkActionsProps {
  selectionMode: boolean;
  selectedImageIds: Set<string>;
  totalImages: number;
  isBulkRemoving: boolean;
  onBulkRemove: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}
```

**What this does:**
- Receives selection state
- Handlers for actions
- Loading state

### Conditional Rendering

```typescript
if (!selectionMode || selectedImageIds.size === 0) {
  return null;
}
```

**What this does:**
- Only shows when active
- Requires selections
- Returns null otherwise

### Bulk Actions Bar

```typescript
<div className="collection-bulk-action-bar">
  <div className="bulk-action-info">
    <span className="bulk-action-count">
      Đã chọn {selectedImageIds.size} ảnh
    </span>
    <button
      className="bulk-action-link-btn"
      onClick={selectedImageIds.size === totalImages ? onDeselectAll : onSelectAll}
    >
      {selectedImageIds.size === totalImages ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
    </button>
  </div>
  <div className="bulk-action-buttons">
    <button
      className="bulk-action-btn bulk-action-remove"
      onClick={onBulkRemove}
      disabled={isBulkRemoving}
    >
      <Trash2 size={18} />
      <span>Xóa khỏi bộ sưu tập</span>
    </button>
  </div>
</div>
```

**What this does:**
- Shows selected count
- Select/deselect all toggle
- Remove button
- Disabled during operation

## Usage Examples

### In CollectionDetailPage

```typescript
<CollectionBulkActions
  selectionMode={selectionMode}
  selectedImageIds={selectedImageIds}
  totalImages={images.length}
  isBulkRemoving={isBulkRemoving}
  onBulkRemove={handleBulkRemove}
  onSelectAll={handleSelectAll}
  onDeselectAll={handleDeselectAll}
/>
```

## Summary

**CollectionBulkActions** is the bulk actions component that:
1. ✅ Shows selected count
2. ✅ Select/deselect all
3. ✅ Bulk remove action
4. ✅ Loading state
5. ✅ Conditional rendering

It's the "bulk actions" - managing bulk operations!


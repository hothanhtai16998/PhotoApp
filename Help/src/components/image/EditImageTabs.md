# EditImageTabs Component Explanation

## What is EditImageTabs?

`EditImageTabs` is a **component** that provides tab navigation for the edit image modal. It includes tabs for details, tags, EXIF data, and image editing.

## Key Features

### 1. **Tab Navigation**
- Details tab
- Tags tab
- EXIF tab
- Edit tab

### 2. **Active State**
- Highlights active tab
- Visual indicator
- Click to switch

### 3. **Edit Button**
- Special edit tab
- Opens image editor
- Icon display

## Step-by-Step Breakdown

### Component Props

```typescript
interface EditImageTabsProps {
  activeTab: 'details' | 'tags' | 'exif' | 'edit';
  onTabChange: (tab: 'details' | 'tags' | 'exif' | 'edit') => void;
  onEditClick: () => void;
}
```

**What this does:**
- Receives active tab
- Tab change handler
- Edit click handler

### Tab Buttons

```typescript
<div className="edit-modal-tabs">
  <button
    className={`edit-modal-tab ${activeTab === 'details' ? 'active' : ''}`}
    onClick={() => onTabChange('details')}
  >
    Chi tiết
  </button>
  <button
    className={`edit-modal-tab ${activeTab === 'tags' ? 'active' : ''}`}
    onClick={() => onTabChange('tags')}
  >
    Tags
  </button>
  <button
    className={`edit-modal-tab ${activeTab === 'exif' ? 'active' : ''}`}
    onClick={() => onTabChange('exif')}
  >
    Exif
  </button>
  <button
    className={`edit-modal-tab ${activeTab === 'edit' ? 'active' : ''}`}
    onClick={onEditClick}
  >
    <ImageIcon size={16} />
    Chỉnh sửa ảnh
  </button>
</div>
```

**What this does:**
- Renders all tabs
- Active class for current tab
- Click handlers
- Edit button with icon

## Usage Examples

### In EditImageModal

```typescript
<EditImageTabs
  activeTab={activeTab}
  onTabChange={setActiveTab}
  onEditClick={handleOpenEditor}
/>
```

## Summary

**EditImageTabs** is the edit image tabs component that:
1. ✅ Tab navigation
2. ✅ Active state highlighting
3. ✅ Details, tags, EXIF tabs
4. ✅ Edit button
5. ✅ Vietnamese labels

It's the "edit tabs" - navigating edit modal sections!


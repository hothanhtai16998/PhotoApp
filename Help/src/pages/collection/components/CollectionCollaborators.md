# CollectionCollaborators Component Explanation

## What is CollectionCollaborators?

`CollectionCollaborators` is a **collaboration management component** that allows collection owners and admins to invite, manage, and remove collaborators from a collection. It includes user search functionality, permission management, and real-time updates.

## Component Structure

```typescript
export default function CollectionCollaborators({
  collection,
  onCollectionUpdate,
  isOwner,
  userPermission,
}: CollectionCollaboratorsProps)
```

## Key Features

### 1. **User Search with Debouncing**
- Searches users by name, username, or email
- Debounced to reduce API calls (500ms delay)
- Aborts previous requests when new search starts
- Filters out existing collaborators and current user

### 2. **Permission Management**
- Three permission levels: `view`, `edit`, `admin`
- Owners and admins can update permissions
- Visual indicators for each permission level

### 3. **Collaborator Invitation**
- Search and select users to invite
- Choose permission level when inviting
- Sends invitation and updates collection

### 4. **Real-time Updates**
- Triggers notification refresh after inviting
- Updates collection state immediately
- Shows loading states during operations

## Step-by-Step Breakdown

### State Management

```typescript
// Modal state
const [showInviteModal, setShowInviteModal] = useState(false);
const [inviteEmail, setInviteEmail] = useState('');
const [invitePermission, setInvitePermission] = useState<'view' | 'edit' | 'admin'>('view');
const [inviting, setInviting] = useState(false);

// UI state
const [showCollaborators, setShowCollaborators] = useState(true);
const [updatingPermission, setUpdatingPermission] = useState<string | null>(null);
const [removingCollaborator, setRemovingCollaborator] = useState<string | null>(null);

// Search state
const [searchQuery, setSearchQuery] = useState('');
const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
const [searching, setSearching] = useState(false);
const [showSearchResults, setShowSearchResults] = useState(false);
const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null);
```

**Why so many states?**
- Separate concerns (modal, search, operations)
- Better UX (loading states, error handling)
- Prevents race conditions

### User Search Handler

```typescript
const handleSearch = useCallback(async (query: string) => {
  if (!query || query.length < 2) {
    setSearchResults([]);
    setShowSearchResults(false);
    return;
  }

  // Cancel previous search
  if (abortControllerRef.current) {
    abortControllerRef.current.abort();
  }

  // Create new abort controller
  abortControllerRef.current = new AbortController();
  const currentAbortController = abortControllerRef.current;

  setSearching(true);
  try {
    const results = await userService.searchUsers(query, 10);

    // Filter out existing collaborators
    const existingCollaboratorEmails = new Set(
      collection.collaborators?.map(c =>
        typeof c.user === 'object' ? c.user.email : ''
      ).filter(Boolean) || []
    );

    const filteredResults = (results.users || []).filter(
      (searchUser: { email: string }) =>
        !existingCollaboratorEmails.has(searchUser.email) &&
        searchUser.email !== currentUser?.email
    );

    setSearchResults(filteredResults);
    setShowSearchResults(query.length >= 2);
  } catch (error: unknown) {
    // Ignore aborted requests
    if (err?.name === 'AbortError' || err?.message === 'canceled') {
      return;
    }
    // Handle actual errors
  } finally {
    if (!currentAbortController.signal.aborted) {
      setSearching(false);
    }
  }
}, [collection.collaborators, currentUser?.email]);
```

**Key optimizations:**
- **AbortController**: Cancels previous requests when new search starts
- **Set for filtering**: O(1) lookup instead of O(n) array search
- **Pre-compute emails**: Calculate once, use multiple times
- **Error handling**: Ignores aborted requests, handles real errors

### Debounced Search Effect

```typescript
useEffect(() => {
  if (searchTimeoutRef.current) {
    clearTimeout(searchTimeoutRef.current);
  }

  if (searchQuery.length >= 2) {
    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(searchQuery);
    }, 500); // 500ms debounce
  } else {
    setSearchResults([]);
    setShowSearchResults(false);
  }

  return () => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  };
}, [searchQuery, handleSearch]);
```

**What this does:**
- Waits 500ms after user stops typing
- Cancels previous timeout if user types again
- Only searches if query is 2+ characters
- Cleans up timeout on unmount

### Click Outside Handler

```typescript
useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (
      searchResultsRef.current &&
      !searchResultsRef.current.contains(event.target as Node) &&
      searchInputRef.current &&
      !searchInputRef.current.contains(event.target as Node)
    ) {
      setShowSearchResults(false);
    }
  };

  if (showSearchResults) {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }
  return undefined;
}, [showSearchResults]);
```

**What this does:**
- Closes search results when clicking outside
- Uses `mousedown` instead of `click` (fires earlier)
- Only adds listener when results are shown
- Cleans up listener on unmount

### Invite Collaborator

```typescript
const handleInvite = async () => {
  const emailToInvite = selectedUser?.email || inviteEmail.trim();

  if (!emailToInvite) {
    toast.error('Vui lòng chọn hoặc nhập email người dùng');
    return;
  }

  setInviting(true);
  try {
    const updatedCollection = await collectionService.addCollaborator(
      collection._id,
      emailToInvite,
      invitePermission
    );
    onCollectionUpdate(updatedCollection);
    toast.success('Đã mời cộng tác viên thành công');

    // Trigger notification refresh
    triggerNotificationRefresh();

    // Reset form
    setShowInviteModal(false);
    setInviteEmail('');
    setSearchQuery('');
    setSelectedUser(null);
    setInvitePermission('view');
  } catch (error: unknown) {
    // Handle error
  } finally {
    setInviting(false);
  }
};
```

**What this does:**
- Uses selected user email or manual input
- Calls API to add collaborator
- Updates parent component with new collection
- Triggers notification refresh (optimistic update)
- Resets form state
- Shows success/error messages

### Update Permission

```typescript
const handleUpdatePermission = async (
  collaboratorId: string,
  newPermission: 'view' | 'edit' | 'admin'
) => {
  setUpdatingPermission(collaboratorId);
  try {
    const updatedCollection = await collectionService.updateCollaboratorPermission(
      collection._id,
      collaboratorId,
      newPermission
    );
    onCollectionUpdate(updatedCollection);
    toast.success('Đã cập nhật quyền');
  } catch (error: unknown) {
    // Handle error
  } finally {
    setUpdatingPermission(null);
  }
};
```

**What this does:**
- Updates collaborator permission
- Shows loading state for specific collaborator
- Updates collection state
- Handles errors gracefully

### Remove Collaborator

```typescript
const handleRemoveCollaborator = async (collaboratorId: string) => {
  if (!confirm('Bạn có chắc chắn muốn xóa cộng tác viên này?')) {
    return;
  }

  setRemovingCollaborator(collaboratorId);
  try {
    const updatedCollection = await collectionService.removeCollaborator(
      collection._id,
      collaboratorId
    );
    onCollectionUpdate(updatedCollection);
    toast.success('Đã xóa cộng tác viên');
  } catch (error: unknown) {
    // Handle error
  } finally {
    setRemovingCollaborator(null);
  }
};
```

**What this does:**
- Confirms before removing
- Shows loading state
- Removes collaborator via API
- Updates collection state

## Permission Levels

### View (`view`)
- Can only view the collection
- Cannot add/remove images
- Cannot manage collaborators

### Edit (`edit`)
- Can view and edit collection
- Can add/remove images
- Cannot manage collaborators

### Admin (`admin`)
- Full access to collection
- Can manage collaborators
- Can update permissions
- Cannot remove owner

## UI Components

### Collaborator List
- Shows all collaborators with avatars
- Displays permission badges
- Allows permission updates (if authorized)
- Shows "You" indicator for current user

### Invite Modal
- User search input with autocomplete
- Permission selector
- Selected user preview
- Submit/Cancel buttons

### Empty State
- Shows when no collaborators
- Provides invite button
- Only visible to owners/admins

## Performance Optimizations

1. **Request Cancellation**: Aborts previous searches
2. **Debouncing**: Reduces API calls (500ms)
3. **Set-based Filtering**: O(1) email lookup
4. **Memoized Callbacks**: Prevents unnecessary re-renders
5. **Conditional Rendering**: Only renders when needed

## Common Questions

### Q: Why use AbortController?
**A:** Prevents race conditions when user types quickly. Only the latest search result is used.

### Q: Why debounce search?
**A:** Reduces API calls. User might type "john" → "joh" → "john" quickly. Only final query is sent.

### Q: Can owner remove themselves?
**A:** No, owner cannot remove themselves. Only other collaborators can be removed.

### Q: What happens if user is already a collaborator?
**A:** They're filtered out from search results automatically.

### Q: How are notifications triggered?
**A:** Custom event `notification:refresh` is dispatched, which NotificationBell listens to.

## Summary

**CollectionCollaborators** is a comprehensive collaboration management component that:
1. ✅ Searches users with debouncing and request cancellation
2. ✅ Manages three permission levels (view, edit, admin)
3. ✅ Invites and removes collaborators
4. ✅ Updates permissions in real-time
5. ✅ Provides excellent UX with loading states
6. ✅ Optimizes performance with smart filtering

It's the "team manager" for your collections - letting owners build and manage their collaboration teams!


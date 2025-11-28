# FavoriteCollectionsPage Component Explanation

## What is FavoriteCollectionsPage?

`FavoriteCollectionsPage` is the **favorite collections page** where users can view all collections they've favorited. It displays collections in a grid with pagination.

## Key Features

### 1. **Collection Grid**
- Displays favorited collections
- Shows cover images
- Collection metadata (name, description, image count)

### 2. **Pagination**
- Supports paginated favorite lists
- Previous/Next navigation
- Shows current page and total pages

### 3. **Empty State**
- Friendly message when no favorites
- Link to explore collections
- Encourages user action

## Step-by-Step Breakdown

### Authentication Check

```typescript
useEffect(() => {
  if (!accessToken || !user?._id) {
    navigate('/signin');
    return;
  }
  fetchFavoriteCollections(1);
}, [accessToken, user, navigate, fetchFavoriteCollections]);
```

**What this does:**
- Checks if user is logged in
- Redirects to sign-in if not authenticated
- Fetches favorite collections on mount

### Fetch Favorite Collections

```typescript
const fetchFavoriteCollections = useCallback(async (page = 1) => {
  if (!accessToken || !user?._id) {
    navigate('/signin');
    return;
  }

  try {
    setLoading(true);
    const response = await collectionFavoriteService.getFavoriteCollections({
      page,
      limit: 20,
    });
    setCollections(response.collections || []);
    setPagination(response.pagination || null);
    setCurrentPage(page);
  } catch (error) {
    console.error('Failed to fetch favorite collections:', error);
    toast.error('Không thể tải bộ sưu tập yêu thích');
  } finally {
    setLoading(false);
  }
}, [accessToken, user, navigate]);
```

**What this does:**
- Fetches favorite collections from API
- Supports pagination
- Updates collections and pagination state
- Handles errors with toast message
- Shows loading state

### Collection Click Handler

```typescript
const handleCollectionClick = (collection: Collection) => {
  navigate(`/collections/${collection._id}`);
};
```

**What this does:**
- Navigates to collection detail page
- Passes collection ID in URL

### Collection Grid Rendering

```typescript
{collections.map((collection) => {
  const coverImage = collection.coverImage &&
    typeof collection.coverImage === 'object'
      ? collection.coverImage
      : null;

  return (
    <div
      key={collection._id}
      className="favorite-collection-card"
      onClick={() => handleCollectionClick(collection)}
    >
      <div className="favorite-collection-card-cover">
        {coverImage ? (
          <ProgressiveImage
            src={coverImage.imageUrl}
            thumbnailUrl={coverImage.thumbnailUrl}
            smallUrl={coverImage.smallUrl}
            regularUrl={coverImage.regularUrl}
            alt={collection.name}
          />
        ) : (
          <div className="favorite-collection-card-placeholder">
            <Folder size={48} />
          </div>
        )}
      </div>
      <div className="favorite-collection-card-info">
        <h3>{collection.name}</h3>
        {collection.description && (
          <p>{collection.description}</p>
        )}
        <div className="favorite-collection-card-meta">
          <span>{collection.imageCount || 0} ảnh</span>
          {collection.createdBy && (
            <span>bởi {collection.createdBy.displayName || collection.createdBy.username}</span>
          )}
        </div>
      </div>
    </div>
  );
})}
```

**What this does:**
- Maps collections to cards
- Shows cover image or placeholder
- Displays collection name and description
- Shows image count and author
- Clickable cards

## Empty State

```typescript
{collections.length === 0 ? (
  <div className="favorite-collections-empty">
    <Folder size={64} />
    <h2>Chưa có bộ sưu tập yêu thích nào</h2>
    <p>Bắt đầu thêm bộ sưu tập vào yêu thích để dễ dàng truy cập sau này</p>
    <button onClick={() => navigate('/collections')}>
      Khám phá bộ sưu tập
    </button>
  </div>
) : (
  // Grid of collections
)}
```

**What this does:**
- Shows friendly empty state
- Encourages user to favorite collections
- Provides link to explore collections

## Summary

**FavoriteCollectionsPage** is the favorite collections viewer that:
1. ✅ Displays favorited collections
2. ✅ Supports pagination
3. ✅ Shows collection metadata
4. ✅ Navigates to collection details
5. ✅ Handles empty state
6. ✅ Responsive grid layout

It's the "favorite collections hub" - where users can easily access their saved collections!


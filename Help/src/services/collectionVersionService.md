# collectionVersionService Explanation

## What is collectionVersionService?

`collectionVersionService` is a **service module** that provides collection version history-related API methods. It handles fetching version history, getting specific versions, and restoring collections to previous versions.

## Key Features

### 1. **Version History**
- Get all versions
- Get specific version
- Version snapshots
- Change tracking

### 2. **Version Restoration**
- Restore to previous version
- Creates new version
- Preserves history

### 3. **Change Tracking**
- Change types
- Change descriptions
- Field changes
- User tracking

## Step-by-Step Breakdown

### Get Collection Versions

```typescript
getCollectionVersions: async (collectionId: string): Promise<CollectionVersion[]> => {
  const response = await api.get<VersionsResponse>(
    `/collection-versions/collection/${collectionId}`,
    {
      withCredentials: true,
    }
  );
  return response.data.versions;
},
```

**What this does:**
- Fetches all versions for collection
- Returns version history
- Used for version history UI

### Get Version by Number

```typescript
getVersionByNumber: async (
  collectionId: string,
  versionNumber: number
): Promise<CollectionVersion> => {
  const response = await api.get<VersionResponse>(
    `/collection-versions/collection/${collectionId}/version/${versionNumber}`,
    {
      withCredentials: true,
    }
  );
  return response.data.version;
},
```

**What this does:**
- Fetches specific version
- Returns version snapshot
- Used for preview

### Restore Version

```typescript
restoreCollectionVersion: async (
  collectionId: string,
  versionNumber: number
): Promise<Collection> => {
  const response = await api.post<{ collection: Collection }>(
    `/collection-versions/collection/${collectionId}/version/${versionNumber}/restore`,
    {},
    {
      withCredentials: true,
    }
  );
  return response.data.collection as Collection;
},
```

**What this does:**
- Restores collection to version
- Creates new version (current becomes history)
- Returns restored collection
- Used for undo/redo

### Collection Version Structure

```typescript
export interface CollectionVersion {
  _id: string;
  collection: string;
  versionNumber: number;
  snapshot: {
    name: string;
    description?: string;
    isPublic: boolean;
    tags: string[];
    coverImage?: string | { ... };
    images: string[] | Array<{ ... }>;
    collaborators: Array<{ ... }>;
  };
  changes: {
    type: 'created' | 'updated' | 'image_added' | 'image_removed' | 'reordered' | ...;
    description?: string;
    fieldChanged?: string;
    oldValue?: unknown;
    newValue?: unknown;
    // ... more change fields
  };
  changedBy: {
    _id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  note?: string;
  createdAt: string;
  updatedAt: string;
}
```

**What this does:**
- Defines version structure
- Complete snapshot
- Change tracking
- User information

## Usage Examples

### Get Versions

```typescript
const versions = await collectionVersionService.getCollectionVersions(collectionId);
versions.forEach(version => {
  console.log(`Version ${version.versionNumber}: ${version.changes.type}`);
});
```

### Restore Version

```typescript
const restored = await collectionVersionService.restoreCollectionVersion(
  collectionId,
  5
);
// Collection restored to version 5
```

## Summary

**collectionVersionService** is the collection version service that:
1. ✅ Fetches version history
2. ✅ Gets specific versions
3. ✅ Restores versions
4. ✅ Change tracking
5. ✅ Complete snapshots

It's the "version manager" - managing collection history!


# store Types Explanation

## What is store Types?

`store` types is a **TypeScript type definitions file** that defines all Zustand store state interfaces. It provides type safety for all store states including auth, user, images, collections, and favorites.

## Key Features

### 1. **Store State Interfaces**
- Auth state
- User state
- Image state
- Collection state
- Favorite state
- Profile state

### 2. **Type Safety**
- TypeScript interfaces
- Method signatures
- State structure

### 3. **Complete Coverage**
- All store states
- All store methods
- Consistent structure

## Step-by-Step Breakdown

### Auth State

```typescript
export interface AuthState {
  accessToken: string | null;
  loading: boolean;
  isInitializing: boolean;
  setAccessToken: (accessToken: string) => void;
  clearAuth: () => void;
  signUp: (...) => Promise<void>;
  signIn: (...) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  initializeApp: () => Promise<void>;
}
```

**What this does:**
- Defines auth store state
- Token and loading states
- Auth methods
- Initialization method

### Image State

```typescript
export interface ImageState {
  images: Image[];
  loading: boolean;
  error: string | null;
  uploadProgress: number;
  pagination: Pagination | null;
  currentSearch?: string;
  currentCategory?: string;
  currentLocation?: string;
  deletedImageIds: string[];
  uploadImage: (data: UploadImageData) => Promise<void>;
  fetchImages: (params?: {...}, signal?: AbortSignal) => Promise<void>;
  removeImage: (imageId: string) => void;
}
```

**What this does:**
- Defines image store state
- Images array and pagination
- Upload progress
- Filter states
- Image methods

### Collection State

```typescript
export interface CollectionState {
  collection: Collection | null;
  loading: boolean;
  error: string | null;
  isFavorited: boolean;
  togglingFavorite: boolean;
  versions: CollectionVersion[];
  loadingVersions: boolean;
  updatingCover: string | null;
  fetchCollection: (collectionId: string) => Promise<void>;
  updateCollection: (...) => Promise<void>;
  deleteCollection: (collectionId: string) => Promise<void>;
  setCoverImage: (collectionId: string, imageId: string) => Promise<void>;
  toggleFavorite: (collectionId: string) => Promise<void>;
  fetchVersions: (collectionId: string) => Promise<void>;
  restoreVersion: (collectionId: string, versionNumber: number) => Promise<void>;
  clearCollection: () => void;
}
```

**What this does:**
- Defines collection store state
- Collection data
- Favorite status
- Version history
- Collection methods

### Profile State

```typescript
export interface ProfileState {
  profileUser: PublicUser | null;
  profileUserLoading: boolean;
  followStats: {
    followers: number;
    following: number;
    isFollowing: boolean;
  };
  userStats: UserStats | null;
  collections: Collection[];
  collectionsLoading: boolean;
  collectionsCount: number;
  fetchProfileUser: (username?: string, userId?: string, signal?: AbortSignal) => Promise<void>;
  fetchFollowStats: (userId: string, signal?: AbortSignal) => Promise<void>;
  fetchUserStats: (userId: string, signal?: AbortSignal) => Promise<void>;
  fetchCollections: (userId: string, signal?: AbortSignal) => Promise<void>;
  clearProfile: () => void;
}
```

**What this does:**
- Defines profile store state
- Profile user data
- Follow statistics
- User statistics
- Collections
- Profile methods

## Usage Examples

### Using Store Types

```typescript
import type { AuthState } from '@/types/store';

const useAuthStore = create<AuthState>((set) => ({
  // Implementation
}));
```

### Type-Safe Store Access

```typescript
const { accessToken, signIn } = useAuthStore();
// TypeScript knows the types
```

## Summary

**store types** is the store type definitions file that:
1. ✅ Defines all store states
2. ✅ Method signatures
3. ✅ Type safety
4. ✅ Complete coverage
5. ✅ Easy to use

It's the "store types" - ensuring type safety for stores!


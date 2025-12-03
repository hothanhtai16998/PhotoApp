/**
 * English translations
 */
export const en = {
  // Common
  common: {
    loading: 'Loading...',
    error: 'An error occurred',
    success: 'Success',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    confirm: 'Confirm',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    search: 'Search',
    noResults: 'No results found',
    tryAgain: 'Please try again',
  },

  // Auth
  auth: {
    signIn: 'Sign in',
    signUp: 'Sign up',
    signOut: 'Sign out',
    signUpSuccess:
      'Sign up successful! You will be redirected to the sign in page.',
    signUpFailed: 'Sign up failed. Please try again.',
    signInFailed:
      'Sign in failed. Please check your username or password.',
    signOutSuccess: 'Signed out successfully!',
    welcomeBack: 'Welcome back 🎉',
    sessionExpired: 'Session expired. Please sign in again.',
    validationError: 'Validation error',
    pleaseSignIn: 'Please sign in again.',
  },

  // Errors
  errors: {
    generic: 'An error occurred. Please try again.',
    network: 'Network error. Please check your internet connection.',
    timeout: 'Request timed out. Please try again.',
    unauthorized: 'Session expired. Please sign in again.',
    notFound: 'Resource not found.',
    server: 'Server error. Please try again later.',
    rateLimited: 'Too many requests. Please try again later.',
    imageIdError: 'Error getting image ID',
  },

  // Favorites
  favorites: {
    title: 'Favorite Photos',
    empty: 'No favorites yet',
    emptyHint: 'Start saving photos you love to view them later',
    explore: 'Explore Photos',
    added: 'Added to favorites',
    removed: 'Removed from favorites',
    updateFailed: 'Could not update favorites. Please try again.',
    count: '{count} photos saved',
    noFavorites: 'No favorite photos yet',
    downloadSuccess: 'Image downloaded successfully',
    downloadFailed: 'Download failed. Please try again.',
  },

  // Collections
  collections: {
    title: 'Collections',
    saveToCollection: 'Save to collection',
    createNew: 'Create new collection',
    createFromTemplate: 'Create from template',
    selectTemplate: 'Select template',
    collectionName: 'Collection name',
    collectionNamePlaceholder: 'e.g., Beautiful landscape photos',
    description: 'Description (optional)',
    descriptionPlaceholder: 'A brief description of this collection...',
    public: 'Public (everyone can view)',
    tags: 'Tags (max 10)',
    tagsPlaceholder: 'Enter tags and press Enter or comma',
    creating: 'Creating...',
    saving: 'Saving...',
    created: 'Collection created',
    createdAndAdded: 'Collection created and image added',
    updated: 'Collection updated',
    imageAdded: 'Image added to collection',
    imageRemoved: 'Image removed from collection',
    coverSet: 'Image set as cover',
    loadFailed: 'Could not load collections',
    createFailed: 'Could not create collection. Please try again.',
    updateFailed: 'Could not update collection. Please try again.',
    deleteFailed: 'Could not delete collection. Please try again.',
    coverFailed: 'Could not set cover. Please try again.',
    empty: 'No collections yet',
    emptyHint: 'Create your first collection to save your favorite photos',
    imageCount: '{count} photos',
    versionRestored: 'Restored to version {version}',
    versionRestoreFailed: 'Could not restore version. Please try again.',
    versionLoadFailed: 'Could not load version history',
    editCollection: 'Edit collection',
    imageIdNotFound: 'Image ID not found',
    enterName: 'Please enter a collection name',
  },

  // Upload
  upload: {
    title: 'Add photos to PhotoApp',
    addImage: 'Add photo',
    addMore: 'Add more',
    dragDrop: 'Drag and drop or',
    browse: 'Browse',
    browseHint: 'photos from your computer or phone (multiple selection allowed)',
    maxSize: 'Max 10 MB',
    selected: '{count} photos selected',
    uploading: 'Uploading...',
    submit: 'Submit {count} photos',
    success: 'Photos added successfully 🎉',
    successHint: 'Our Editorial team is now reviewing your image.',
    viewProfile: 'View profile',
    fillRequired: 'Please fill in all required fields marked with',
  },

  // Header
  header: {
    addImage: 'Add photo',
    favorites: 'Favorites',
    admin: 'Admin',
    about: 'About us',
    account: 'Account',
    userMenu: 'User menu',
    toggleMenu: 'Toggle menu',
    company: 'Company',
    products: 'Products',
    community: 'Community',
    explore: 'Explore',
    legal: 'Legal',
    submitImage: 'Submit an image',
    logIn: 'Log in',
    newToUnsplash: 'New to Unsplash?',
    signUpFree: 'Sign up for free',
  },

  // Admin
  admin: {
    title: 'Admin Dashboard',
    dashboard: 'Dashboard',
    analytics: 'Analytics',
    users: 'Users',
    images: 'Images',
    categories: 'Categories',
    collections: 'Collections',
    roles: 'Admin Roles',
    permissions: 'Permission Matrix',
    favorites: 'Favorites Management',
    moderation: 'Content Moderation',
    logs: 'System Logs',
    settings: 'Settings',
    accessDenied: 'Admin access required to view this page.',
  },

  // Image
  image: {
    untitled: 'Untitled',
    download: 'Download',
    downloadOptions: 'Download options',
    addToCollection: 'Add to collection',
    bookmark: 'Bookmark',
    removeBookmark: 'Remove bookmark',
    like: 'Like image',
    small: 'Small',
    medium: 'Medium',
    large: 'Large',
    original: 'Original',
  },

  // Profile
  profile: {
    title: 'Account',
    editProfile: 'Edit profile',
  },

  // Pagination
  pagination: {
    page: 'Page {current} / {total}',
    previous: 'Previous',
    next: 'Next',
  },

  // Accessibility
  a11y: {
    loading: 'Loading',
    loadingImages: 'Loading images',
    favoriteImage: 'Favorite image: {title}',
    previousPage: 'Previous page',
    nextPage: 'Next page',
    closeMenu: 'Close menu',
  },
} as const;

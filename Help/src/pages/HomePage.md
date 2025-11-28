# HomePage Component Explanation

## What is HomePage?

`HomePage` is the **main landing page** of the application. It displays a featured image slider and an image grid, with support for search functionality and keyboard shortcuts.

## Component Structure

```typescript
function HomePage() {
  const { currentSearch } = useImageStore();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Modal detection and keyboard shortcuts
  // Slider and ImageGrid rendering
}
```

## Key Features

### 1. **Conditional Slider Display**

- Shows slider only when not searching
- Hides slider when search is active to show results immediately
- Lazy loaded for performance

### 2. **Keyboard Shortcuts**

- Global keyboard shortcuts support
- Focus search on keyboard shortcut
- Respects modal state

### 3. **Image Modal Handling**

- Detects if image modal should open from URL
- Handles page refresh with image parameter
- Redirects to full page view when appropriate

### 4. **Auto-scroll on Search**

- Scrolls to top when search is activated
- Shows search results immediately
- Better UX for search experience

## Step-by-Step Breakdown

### State and Hooks

```typescript
const { currentSearch } = useImageStore();
const [searchParams] = useSearchParams();
const navigate = useNavigate();
```

**What these do:**

- `currentSearch`: Current search query from image store
- `searchParams`: URL search parameters (for image modal)
- `navigate`: React Router navigation function

### Keyboard Shortcuts

```typescript
useGlobalKeyboardShortcuts({
  onFocusSearch: () => {
    const searchInput = document.querySelector(
      '.search-input'
    ) as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  },
  isModalOpen,
});
```

**What this does:**

- Sets up global keyboard shortcuts
- Focuses search input when shortcut is pressed
- Selects text in search input for easy editing
- Respects modal state (doesn't interfere when modal is open)

### Image Modal Detection

```typescript
useEffect(() => {
  const imageParam = searchParams.get('image');
  if (imageParam) {
    const fromGrid = sessionStorage.getItem(
      appConfig.storage.imagePageFromGridKey
    );
    if (!fromGrid) {
      // This is a refresh or direct access, redirect to /photos/:slug
      navigate(`/photos/${imageParam}`, { replace: true });
    } else {
      // Clear the flag after using it
      sessionStorage.removeItem(appConfig.storage.imagePageFromGridKey);
    }
  }
}, [searchParams, navigate]);
```

**What this does:**

- Checks if URL has `?image=slug` parameter
- If page was refreshed (no `fromGrid` flag), redirects to full page view
- If coming from grid (has flag), allows modal to open
- Cleans up sessionStorage flag

**Why this logic?**

- Page refresh with `?image=slug` should show full page, not modal
- Clicking from grid should show modal
- Better UX for different navigation scenarios

### Auto-scroll on Search

```typescript
useEffect(() => {
  if (currentSearch) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}, [currentSearch]);
```

**What this does:**

- Scrolls to top when search is activated
- Smooth scroll animation
- Shows search results immediately at top of page

### Conditional Slider Rendering

```typescript
{
  !currentSearch && (
    <Suspense fallback={<Skeleton />}>
      <Slider />
    </Suspense>
  );
}
```

**What this does:**

- Only shows slider when not searching
- Hides slider when search is active
- Lazy loads slider component
- Shows skeleton while loading

**Why hide on search?**

- Search results are more important than slider
- Saves space for search results
- Better UX - immediate results

### Image Grid

```typescript
<ImageGrid />
```

**What this does:**

- Always visible (even during search)
- Shows all images or search results
- Handles pagination and infinite scroll
- Supports image selection and modal

## Flow Diagram

```
User visits HomePage
    ↓
Check URL for ?image parameter
    ↓
├─ Has image param + no fromGrid flag → Redirect to /photos/:slug
└─ Has image param + fromGrid flag → Open modal (handled by ImageGrid)
    ↓
Render Slider (if not searching)
    ↓
Render ImageGrid (always visible)
    ↓
User searches
    ↓
Hide Slider
    ↓
Scroll to top
    ↓
Show search results in ImageGrid
```

## Common Scenarios

### Scenario 1: Normal Visit

```
User → / → HomePage → Shows Slider + ImageGrid
```

### Scenario 2: Search

```
User → Types in search → currentSearch set → Slider hides → Scroll to top → Results show
```

### Scenario 3: Click Image from Grid

```
User → Clicks image → URL becomes ?image=slug → Modal opens (handled by ImageGrid)
```

### Scenario 4: Refresh with Image Param

```
User → Refreshes with ?image=slug → No fromGrid flag → Redirects to /photos/:slug
```

## Common Questions

### Q: Why lazy load Slider?

**A:** Slider is heavy component. Lazy loading reduces initial bundle size and improves performance.

### Q: Why hide slider on search?

**A:** Search results are more important. Hiding slider saves space and shows results immediately.

### Q: What keyboard shortcuts are available?

**A:** Defined in `useGlobalKeyboardShortcuts`. Typically `/` to focus search.

### Q: Can I disable auto-scroll on search?

**A:** Yes, remove the `useEffect` that calls `window.scrollTo`.

### Q: Why redirect on refresh with image param?

**A:** Page refresh should show full page view, not modal. Better for sharing and bookmarking.

## Summary

**HomePage** is the main landing page that:

1. ✅ Displays featured slider (when not searching)
2. ✅ Shows image grid (always visible)
3. ✅ Handles search functionality
4. ✅ Supports keyboard shortcuts
5. ✅ Manages image modal state
6. ✅ Auto-scrolls on search
7. ✅ Optimized with lazy loading

It's the "front door" of your app - welcoming users and showcasing your content!

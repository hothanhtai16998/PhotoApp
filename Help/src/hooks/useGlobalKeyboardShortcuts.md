# useGlobalKeyboardShortcuts Hook Explanation

## What is useGlobalKeyboardShortcuts?

`useGlobalKeyboardShortcuts` is a **custom React hook** that provides global keyboard shortcuts for the entire app. Currently supports focusing the search bar with `/` key.

## Hook Structure

```typescript
export const useGlobalKeyboardShortcuts = ({
  onFocusSearch,
  isModalOpen = false,
}: UseGlobalKeyboardShortcutsOptions) => {
  // Sets up keyboard event listeners
}
```

## Key Features

### 1. **Global Shortcuts**
- Works anywhere in the app
- Not limited to specific components
- Respects modal state

### 2. **Modal Awareness**
- Disables shortcuts when modal is open
- Prevents conflicts
- Better UX

### 3. **Input Awareness**
- Ignores shortcuts when typing
- Doesn't interfere with text input
- Smart detection

## Step-by-Step Breakdown

### Modal State Ref

```typescript
const isModalOpenRef = useRef(isModalOpen);

useEffect(() => {
  isModalOpenRef.current = isModalOpen;
}, [isModalOpen]);
```

**What this does:**
- Stores modal state in ref
- Updates when modal state changes
- Used in event handler (avoids stale closure)

**Why ref?**
- Event handler needs latest value
- Ref doesn't cause re-renders
- Better performance

### Keyboard Handler

```typescript
useEffect(() => {
  const handleKeyboard = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const isInputFocused = target.tagName === 'INPUT' || 
                          target.tagName === 'TEXTAREA' || 
                          target.isContentEditable;
    
    // Don't handle shortcuts if modal is open or user is typing
    if (isModalOpenRef.current || isInputFocused) {
      return;
    }

    // Focus search with / key
    if (e.key === '/' && onFocusSearch) {
      e.preventDefault();
      onFocusSearch();
      return;
    }
  };

  document.addEventListener('keydown', handleKeyboard);
  return () => {
    document.removeEventListener('keydown', handleKeyboard);
  };
}, [onFocusSearch]);
```

**What this does:**
- Listens for keyboard events
- Checks if input is focused
- Checks if modal is open
- Handles `/` key to focus search
- Prevents default behavior
- Cleans up listener

**Why check input?**
- Don't interfere when typing
- `/` is a valid character
- Better UX

## Usage Example

```typescript
useGlobalKeyboardShortcuts({
  onFocusSearch: () => {
    const searchInput = document.querySelector('.search-input') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  },
  isModalOpen: !!selectedImage,
});
```

**What this does:**
- Sets up search focus shortcut
- Passes modal state
- Focuses and selects search input

## Summary

**useGlobalKeyboardShortcuts** is the global keyboard shortcuts hook that:
1. ✅ Provides global shortcuts
2. ✅ Respects modal state
3. ✅ Ignores when typing
4. ✅ Easy to extend

It's the "keyboard maestro" - making the app more keyboard-friendly!


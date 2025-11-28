# useRequestCancellation Hook Explanation

## What is useRequestCancellation?

`useRequestCancellation` is a **custom React hook** that provides AbortController signals for cancelling API requests. It prevents memory leaks and wasted bandwidth from cancelled requests when components unmount or dependencies change.

## Key Features

### 1. **Request Cancellation**
- Cancels requests on unmount
- Prevents memory leaks
- Saves bandwidth

### 2. **Multiple Variants**
- `useRequestCancellation()` - Cancels on unmount
- `useRequestCancellationOnChange(deps)` - Cancels when deps change
- `createAbortController()` - Manual controller

## Step-by-Step Breakdown

### Basic Hook

```typescript
export function useRequestCancellation() {
  const abortControllerRef = useRef<AbortController | null>(null);
  const [signal, setSignal] = useState<AbortSignal | null>(null);

  useEffect(() => {
    abortControllerRef.current ??= new AbortController();
    setSignal(abortControllerRef.current.signal);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return signal ?? new AbortController().signal;
}
```

**What this does:**
- Creates AbortController on mount
- Returns signal for axios requests
- Aborts on unmount
- Prevents memory leaks

### On Change Hook

```typescript
export function useRequestCancellationOnChange(deps: React.DependencyList) {
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    // Abort previous request when dependencies change
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController
    abortControllerRef.current = new AbortController();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, deps);

  return abortControllerRef.current?.signal;
}
```

**What this does:**
- Cancels previous request when deps change
- Creates new controller for new request
- Useful for search queries, filters
- Prevents race conditions

### Manual Controller

```typescript
export function createAbortController() {
  const controller = new AbortController();
  return {
    signal: controller.signal,
    abort: () => controller.abort(),
  };
}
```

**What this does:**
- Creates controller manually
- Returns signal and abort function
- Useful for one-off requests

## Usage Examples

### Basic Usage

```typescript
const signal = useRequestCancellation();

useEffect(() => {
  const fetchData = async () => {
    const response = await api.get('/images', { signal });
    // Handle response
  };
  fetchData();
}, []);
```

### With Dependencies

```typescript
const signal = useRequestCancellationOnChange([searchQuery, category]);

useEffect(() => {
  const fetchData = async () => {
    const response = await api.get('/images', { 
      params: { search: searchQuery },
      signal 
    });
  };
  fetchData();
}, [searchQuery, category]);
```

### Manual Controller

```typescript
const { signal, abort } = createAbortController();

const response = await api.get('/images', { signal });

// Later: abort(); to cancel
```

## Summary

**useRequestCancellation** is the request cancellation hook that:
1. ✅ Cancels requests on unmount
2. ✅ Cancels on dependency changes
3. ✅ Prevents memory leaks
4. ✅ Saves bandwidth
5. ✅ Prevents race conditions

It's the "request manager" - ensuring clean request handling!


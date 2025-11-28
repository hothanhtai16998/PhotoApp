# ErrorBoundary Component Explanation

## What is ErrorBoundary?

`ErrorBoundary` is a **React error boundary class component** that catches JavaScript errors anywhere in the child component tree. It displays a fallback UI instead of crashing the entire app.

## Key Features

### 1. **Error Catching**
- Catches errors in child components
- Prevents app crash
- Shows fallback UI

### 2. **Error Tracking**
- Tracks errors with error tracking service
- Logs component stack
- Development console logging

### 3. **User-Friendly UI**
- Shows error message
- Provides reload button
- Custom fallback support

## Step-by-Step Breakdown

### Component Structure

```typescript
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
}
```

**What this does:**
- Class component (required for error boundaries)
- Initializes error state
- No error initially

### Get Derived State from Error

```typescript
static getDerivedStateFromError(error: Error): State {
  return { hasError: true, error };
}
```

**What this does:**
- Called when error occurs
- Updates state to show error
- Static method (no `this`)
- Returns new state

### Component Did Catch

```typescript
componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
  // Track error with error tracking service
  errorTracker.captureException(error, {
    componentStack: errorInfo.componentStack,
    boundary: 'global',
  });

  if (import.meta.env.MODE === 'development') {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }
  toast.error('An unexpected error occurred. Please refresh the page.');
}
```

**What this does:**
- Logs error to tracking service
- Logs to console in development
- Shows error toast
- Captures component stack

### Render

```typescript
render() {
  if (this.state.hasError) {
    if (this.props.fallback) {
      return this.props.fallback;
    }

    return (
      <div className="error-boundary">
        <h1>Lỗi...</h1>
        <p>{this.state.error?.message || 'An unexpected error occurred'}</p>
        <button onClick={() => {
          this.setState({ hasError: false, error: null });
          window.location.reload();
        }}>
          Tải lại trang
        </button>
      </div>
    );
  }

  return this.props.children;
}
```

**What this does:**
- Shows fallback if error
- Uses custom fallback if provided
- Shows default error UI otherwise
- Reload button to recover

## Usage

```typescript
<ErrorBoundary fallback={<CustomErrorUI />}>
  <App />
</ErrorBoundary>
```

**What this does:**
- Wraps app or component tree
- Catches errors in children
- Shows fallback on error

## Summary

**ErrorBoundary** is the error handling component that:
1. ✅ Catches React errors
2. ✅ Prevents app crash
3. ✅ Shows fallback UI
4. ✅ Tracks errors
5. ✅ Provides reload option

It's the "safety net" - preventing the entire app from crashing!


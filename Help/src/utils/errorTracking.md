# errorTracking Explanation

## What is errorTracking?

`errorTracking` is a **utility module** that provides error tracking functionality. It's designed to be Sentry-ready but currently logs to console. Can be easily extended to use Sentry or other error tracking services.

## Key Features

### 1. **Error Tracking**
- Capture exceptions
- Capture messages
- Set user context
- Add breadcrumbs

### 2. **Sentry-Ready**
- Prepared for Sentry integration
- Commented code for Sentry
- Easy to enable

### 3. **Environment-Aware**
- Enabled in production
- Console logging in development
- Configurable

## Step-by-Step Breakdown

### ErrorTracker Class

```typescript
class ErrorTracker {
  private enabled: boolean = false;

  init(options?: { dsn?: string; enabled?: boolean }): void {
    this.enabled = options?.enabled ?? import.meta.env.PROD;
    // DSN would be used here if Sentry was integrated
    void options?.dsn;

    // In production, you would initialize Sentry here:
    // if (this.enabled && this.dsn) {
    //   Sentry.init({
    //     dsn: this.dsn,
    //     environment: import.meta.env.MODE,
    //     integrations: [new BrowserTracing()],
    //     tracesSampleRate: 1.0,
    //   });
    // }
  }
}
```

**What this does:**
- Initializes error tracking
- Enabled in production by default
- Prepared for Sentry integration
- Configurable

### Capture Exception

```typescript
captureException(error: Error, context?: ErrorContext): void {
  if (!this.enabled) {
    console.error('Error:', error, context);
    return;
  }

  // In production with Sentry:
  // Sentry.captureException(error, {
  //   contexts: {
  //     additional: context,
  //   },
  // });

  console.error('Error (tracked):', error, context);
}
```

**What this does:**
- Captures exceptions
- Logs to console if disabled
- Sends to Sentry if enabled
- Includes context

### Capture Message

```typescript
captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: ErrorContext): void {
  if (!this.enabled) {
    if (level === 'error') {
      console.error(`[${level.toUpperCase()}]`, message, context);
    } else if (level === 'warning') {
      console.warn(`[${level.toUpperCase()}]`, message, context);
    }
    return;
  }

  // In production with Sentry:
  // Sentry.captureMessage(message, level, {
  //   contexts: {
  //     additional: context,
  //   },
  // });

  // Console logging...
}
```

**What this does:**
- Captures messages
- Supports different levels
- Logs to console
- Sends to Sentry if enabled

### Set User Context

```typescript
setUser(user: { id: string; username?: string; email?: string }): void {
  if (!this.enabled) return;

  // In production with Sentry:
  // Sentry.setUser(user);

  console.warn('Error tracking user set:', user);
}
```

**What this does:**
- Sets user context for errors
- Used for identifying users
- Sentry integration ready

### Add Breadcrumb

```typescript
addBreadcrumb(message: string, category: string = 'default', _level: 'info' | 'warning' | 'error' = 'info', data?: Record<string, unknown>): void {
  if (!this.enabled) {
    console.warn(`[Breadcrumb] [${category}]`, message, data);
    return;
  }

  // In production with Sentry:
  // Sentry.addBreadcrumb({
  //   message,
  //   category,
  //   level,
  //   data,
  // });

  console.warn(`[Breadcrumb] [${category}]`, message, data);
}
```

**What this does:**
- Adds breadcrumb for debugging
- Tracks user actions
- Helps debug issues
- Sentry integration ready

### Initialization

```typescript
export const errorTracker = new ErrorTracker();

errorTracker.init({
  enabled: import.meta.env.PROD,
  // dsn: import.meta.env.VITE_SENTRY_DSN, // Set this in your .env file
});
```

**What this does:**
- Creates singleton instance
- Initializes on import
- Enabled in production
- DSN from environment variable

## Usage Examples

### Capture Exception

```typescript
try {
  // Some code
} catch (error) {
  errorTracker.captureException(error, {
    componentStack: errorInfo.componentStack,
    boundary: 'global',
  });
}
```

### Capture Message

```typescript
errorTracker.captureMessage('User action failed', 'warning', {
  action: 'upload',
  userId: user.id,
});
```

### Set User

```typescript
errorTracker.setUser({
  id: user._id,
  username: user.username,
  email: user.email,
});
```

### Add Breadcrumb

```typescript
errorTracker.addBreadcrumb('User clicked upload button', 'user-action', 'info', {
  page: 'upload',
});
```

## Enabling Sentry

1. Install Sentry: `npm install @sentry/react`
2. Uncomment Sentry code in methods
3. Set `VITE_SENTRY_DSN` in `.env`
4. Import Sentry in the file

## Summary

**errorTracking** is the error tracking utility that:
1. ✅ Captures exceptions and messages
2. ✅ Sets user context
3. ✅ Adds breadcrumbs
4. ✅ Sentry-ready
5. ✅ Environment-aware

It's the "error monitor" - tracking errors for debugging!


/**
 * Error tracking utility (Sentry-ready)
 * Currently logs to console, but can be easily extended to use Sentry or other services
 */

interface ErrorContext {
  [key: string]: unknown;
}

class ErrorTracker {
  private enabled: boolean = false;

  /**
   * Initialize error tracking (e.g., with Sentry)
   */
  init(options?: { dsn?: string; enabled?: boolean }) {
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

  /**
   * Capture an exception
   */
  captureException(error: Error, context?: ErrorContext) {
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

  /**
   * Capture a message
   */
  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: ErrorContext) {
    if (!this.enabled) {
      console.log(`[${level.toUpperCase()}]`, message, context);
      return;
    }

    // In production with Sentry:
    // Sentry.captureMessage(message, level, {
    //   contexts: {
    //     additional: context,
    //   },
    // });

    console.log(`[${level.toUpperCase()}]`, message, context);
  }

  /**
   * Set user context for error tracking
   */
  setUser(user: { id: string; username?: string; email?: string }) {
    if (!this.enabled) return;

    // In production with Sentry:
    // Sentry.setUser(user);

    console.debug('Error tracking user set:', user);
  }

  /**
   * Clear user context
   */
  clearUser() {
    if (!this.enabled) return;

    // In production with Sentry:
    // Sentry.setUser(null);

    console.debug('Error tracking user cleared');
  }

  /**
   * Add breadcrumb for debugging
   */
  addBreadcrumb(message: string, category: string = 'default', _level: 'info' | 'warning' | 'error' = 'info', data?: Record<string, unknown>) {
    if (!this.enabled) {
      console.debug(`[Breadcrumb] [${category}]`, message, data);
      return;
    }

    // In production with Sentry:
    // Sentry.addBreadcrumb({
    //   message,
    //   category,
    //   level,
    //   data,
    // });

    console.debug(`[Breadcrumb] [${category}]`, message, data);
  }
}

export const errorTracker = new ErrorTracker();

// Initialize error tracking in production
errorTracker.init({
  enabled: import.meta.env.PROD,
  // dsn: import.meta.env.VITE_SENTRY_DSN, // Set this in your .env file
});


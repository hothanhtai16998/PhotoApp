/**
 * Simple logger utility
 * In production, consider using Winston or Pino
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export const logger = {
    info: (message, ...args) => {
        if (isDevelopment) {
            console.log(`[INFO] ${message}`, ...args);
        }
        // In production, send to logging service
    },

    error: (message, error, ...args) => {
        const timestamp = new Date().toISOString();
        if (isDevelopment) {
            if (error !== undefined) {
                console.error(`[ERROR] ${timestamp} - ${message}`, error, ...args);
            } else {
                console.error(`[ERROR] ${timestamp} - ${message}`, ...args);
            }
        } else {
            // In production, send to error tracking service (e.g., Sentry)
            if (error !== undefined) {
                console.error(`[ERROR] ${timestamp} - ${message}`, error?.message || error, ...args);
            } else {
                console.error(`[ERROR] ${timestamp} - ${message}`, ...args);
            }
        }
    },

    warn: (message, ...args) => {
        if (isDevelopment) {
            console.warn(`[WARN] ${message}`, ...args);
        }
    },

    debug: (message, ...args) => {
        if (isDevelopment) {
            console.log(`[DEBUG] ${message}`, ...args);
        }
    },
};


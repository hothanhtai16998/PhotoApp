import Session from '../models/Session.js';
import { logger } from './logger.js';

/**
 * Cleanup expired sessions
 * This is a safety mechanism in case MongoDB TTL index doesn't run
 * Should be called periodically (e.g., via cron job or setInterval)
 */
export const cleanupExpiredSessions = async () => {
    try {
        const result = await Session.deleteMany({
            expiresAt: { $lt: new Date() },
        });

        if (result.deletedCount > 0) {
            logger.info(`Cleaned up ${result.deletedCount} expired session(s)`);
        }
    } catch (error) {
        logger.error('Error cleaning up expired sessions', error);
    }
};

/**
 * Start periodic session cleanup
 * Runs every hour
 */
export const startSessionCleanup = () => {
    // Run immediately on startup
    cleanupExpiredSessions();

    // Then run every hour
    setInterval(() => {
        cleanupExpiredSessions();
    }, 60 * 60 * 1000); // 1 hour

    logger.info('Session cleanup scheduler started');
};


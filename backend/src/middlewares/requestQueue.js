/**
 * Request queuing middleware
 * Queues requests when rate limit is hit instead of immediately rejecting
 * Provides better user experience during high traffic
 */

// Request queue: stores queued requests
const requestQueues = new Map(); // IP -> Queue

// Queue configuration
const MAX_QUEUE_SIZE = 10; // Maximum requests in queue per IP
const QUEUE_TIMEOUT = 30000; // 30 seconds timeout for queued requests
const PROCESS_INTERVAL = 100; // Process queue every 100ms

/**
 * Process queued requests for an IP
 * @param {string} ip - IP address
 */
function processQueue(ip) {
    const queue = requestQueues.get(ip);
    if (!queue || queue.length === 0) {
        requestQueues.delete(ip);
        return;
    }

    // Process one request from the queue
    const queuedRequest = queue.shift();
    if (queuedRequest) {
        const { req, res, next, resolve } = queuedRequest;
        
        // Check if request has timed out
        if (Date.now() - queuedRequest.timestamp > QUEUE_TIMEOUT) {
            res.status(429).json({
                message: 'Request timeout. Please try again.',
            });
            resolve();
            return;
        }

        // Proceed with the request
        next();
        resolve();
    }

    // If queue is empty, remove it
    if (queue.length === 0) {
        requestQueues.delete(ip);
    }
}

/**
 * Process all queues periodically
 */
setInterval(() => {
    for (const ip of requestQueues.keys()) {
        processQueue(ip);
    }
}, PROCESS_INTERVAL);

/**
 * Request queuing middleware
 * Note: This works in conjunction with rate limiter
 * When rate limit is hit, express-rate-limit will reject with 429
 * This middleware provides a way to handle queuing for future enhancements
 * For now, it processes requests normally but can be extended
 */
export const requestQueue = (req, res, next) => {
    // Only queue GET requests (read operations)
    // POST/PUT/DELETE should fail fast to prevent data issues
    if (req.method !== 'GET') {
        return next();
    }

    // Skip queuing for health checks and static assets
    if (req.path === '/health' || req.path.startsWith('/static')) {
        return next();
    }

    // For now, just pass through
    // Future enhancement: Check rate limit status and queue if needed
    // This would require custom rate limiter integration
    next();
};

/**
 * Get queue status for monitoring
 */
export const getQueueStatus = () => {
    const status = {};
    for (const [ip, queue] of requestQueues.entries()) {
        status[ip] = {
            queueLength: queue.length,
            oldestRequest: queue.length > 0 ? Date.now() - queue[0].timestamp : 0,
        };
    }
    return status;
};


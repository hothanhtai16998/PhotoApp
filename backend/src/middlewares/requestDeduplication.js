/**
 * Request deduplication middleware
 * Prevents duplicate requests from the same user/IP within a short time window
 * Reduces unnecessary API calls and database queries
 */

// Store pending requests: key -> { promise, timestamp }
const pendingRequests = new Map();
const DEDUPLICATION_WINDOW = 1000; // 1 second window

/**
 * Generate a unique key for a request
 * @param {Object} req - Express request object
 * @returns {string} Unique request key
 */
function generateRequestKey(req) {
    const userId = req.user?._id || req.user?.id || 'anonymous';
    const method = req.method;
    const path = req.path;
    const query = JSON.stringify(req.query || {});
    const body = req.method === 'GET' ? '' : JSON.stringify(req.body || {});
    
    // Create a hash-like key
    return `${method}:${path}:${userId}:${query}:${body}`;
}

/**
 * Request deduplication middleware
 * If the same request is made within the deduplication window, return the cached response
 */
export const requestDeduplication = (req, res, next) => {
    // Only deduplicate GET and POST requests
    if (req.method !== 'GET' && req.method !== 'POST') {
        return next();
    }

    // Skip deduplication for file uploads
    if (req.path.includes('/upload') || req.file) {
        return next();
    }

    const key = generateRequestKey(req);
    const now = Date.now();

    // Check if there's a pending request for this key
    const pending = pendingRequests.get(key);
    
    if (pending && (now - pending.timestamp) < DEDUPLICATION_WINDOW) {
        // Duplicate request detected - wait for the original request to complete
        return pending.promise
            .then((result) => {
                // Return cached response
                res.status(result.status).json(result.data);
            })
            .catch((error) => {
                // If original request failed, let this one proceed
                next();
            });
    }

    // Store original json method
    const originalJson = res.json.bind(res);
    const originalStatus = res.status.bind(res);
    
    let responseStatus = 200;
    let responseData = null;
    let requestResolve = null;
    let requestReject = null;

    // Create a promise for this request (without referencing itself)
    const requestPromise = new Promise((resolve, reject) => {
        requestResolve = resolve;
        requestReject = reject;
    });

    // Store the promise (now that it's created)
    pendingRequests.set(key, {
        promise: requestPromise,
        timestamp: now,
    });

    // Override json method to capture response
    res.json = function(data) {
        responseData = data;
        responseStatus = res.statusCode || 200;
        return originalJson(data);
    };

    res.status = function(code) {
        responseStatus = code;
        return originalStatus(code);
    };

    // Override end method to resolve promise
    const originalEnd = res.end.bind(res);
    res.end = function(chunk, encoding) {
        // Clean up after a delay
        setTimeout(() => {
            pendingRequests.delete(key);
        }, DEDUPLICATION_WINDOW);

        // Resolve with response data
        if (requestResolve) {
            requestResolve({
                status: responseStatus,
                data: responseData,
            });
        }

        return originalEnd(chunk, encoding);
    };

    // Handle errors
    res.on('error', (error) => {
        pendingRequests.delete(key);
        if (requestReject) {
            requestReject(error);
        }
    });

    // Call next to proceed with request
    next();
};

/**
 * Cleanup old pending requests periodically
 */
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of pendingRequests.entries()) {
        if (now - value.timestamp > DEDUPLICATION_WINDOW * 2) {
            pendingRequests.delete(key);
        }
    }
}, 5000); // Cleanup every 5 seconds


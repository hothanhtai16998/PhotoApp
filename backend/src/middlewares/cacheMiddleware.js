/**
 * Simple in-memory cache middleware for frequently accessed endpoints
 * Note: For production, consider using Redis for distributed caching
 */

const cache = new Map();
const DEFAULT_TTL = 60 * 1000; // 1 minute default TTL

/**
 * Cache middleware factory
 * @param {number} ttl - Time to live in milliseconds
 * @param {Function} keyGenerator - Function to generate cache key from request
 * @returns {Function} Express middleware
 */
export const cacheMiddleware = (ttl = DEFAULT_TTL, keyGenerator = null) => {
    return (req, res, next) => {
        // Only cache GET requests
        if (req.method !== 'GET') {
            return next();
        }

        // Generate cache key
        const key = keyGenerator 
            ? keyGenerator(req)
            : `${req.originalUrl || req.url}`;

        // Check cache
        const cached = cache.get(key);
        if (cached && Date.now() < cached.expiresAt) {
            // Set cache headers
            res.set('X-Cache', 'HIT');
            return res.status(cached.status).json(cached.data);
        }

        // Store original json method
        const originalJson = res.json.bind(res);

        // Override json method to cache response
        res.json = function(data) {
            // Cache successful responses (status 200-299)
            if (res.statusCode >= 200 && res.statusCode < 300) {
                cache.set(key, {
                    data,
                    status: res.statusCode,
                    expiresAt: Date.now() + ttl,
                });
            }

            // Call original json method
            return originalJson(data);
        };

        // Set cache header
        res.set('X-Cache', 'MISS');

        next();
    };
};

/**
 * Clear cache for a specific key pattern
 * @param {string} pattern - Pattern to match cache keys
 */
export const clearCache = (pattern) => {
    if (pattern) {
        for (const key of cache.keys()) {
            if (key.includes(pattern)) {
                cache.delete(key);
            }
        }
    } else {
        cache.clear();
    }
};

/**
 * Cleanup expired cache entries periodically
 */
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of cache.entries()) {
        if (now >= value.expiresAt) {
            cache.delete(key);
        }
    }
}, 5 * 60 * 1000); // Cleanup every 5 minutes


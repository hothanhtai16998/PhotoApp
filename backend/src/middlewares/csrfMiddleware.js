import crypto from 'crypto';
import { asyncHandler } from './asyncHandler.js';
import { logger } from '../utils/logger.js';
import { env } from '../libs/env.js';

/**
 * CSRF Protection Middleware
 * Uses double-submit cookie pattern for CSRF protection
 * 
 * This middleware:
 * 1. Generates a CSRF token and sets it as a cookie
 * 2. Validates the token on state-changing requests
 * 3. Works with cookie-based authentication
 */

const CSRF_TOKEN_COOKIE = 'XSRF-TOKEN';
const CSRF_TOKEN_HEADER = 'X-XSRF-TOKEN';

/**
 * Generate a secure random token
 */
const generateToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

/**
 * Middleware to generate and set CSRF token
 * Should be applied to all routes that need CSRF protection
 */
export const csrfToken = (req, res, next) => {
    // Only generate token for GET requests or if token doesn't exist
    if (req.method === 'GET' || !req.cookies[CSRF_TOKEN_COOKIE]) {
        const token = generateToken();
        
        const isProduction = env.NODE_ENV === 'production';
        res.cookie(CSRF_TOKEN_COOKIE, token, {
            httpOnly: false, // Must be readable by JavaScript for double-submit pattern
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax',
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
        });
        
        // Also set in response header for easy access
        res.setHeader('X-CSRF-Token', token);
    }
    
    next();
};

/**
 * Middleware to validate CSRF token
 * Should be applied to state-changing operations (POST, PUT, DELETE, PATCH)
 */
export const validateCsrf = asyncHandler(async (req, res, next) => {
    // Skip CSRF validation for GET, HEAD, OPTIONS requests
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
        return next();
    }

    // Skip CSRF validation for public endpoints (signup, signin)
    const publicPaths = ['/api/auth/signup', '/api/auth/signin', '/api/auth/refresh'];
    if (publicPaths.some(path => req.path.startsWith(path))) {
        return next();
    }

    // Get token from cookie
    const cookieToken = req.cookies[CSRF_TOKEN_COOKIE];
    
    // Get token from header (preferred) or body
    const headerToken = req.headers[CSRF_TOKEN_HEADER.toLowerCase()] || req.headers['x-csrf-token'];
    const bodyToken = req.body?._csrf;

    const submittedToken = headerToken || bodyToken;

    // Validate token
    if (!cookieToken || !submittedToken) {
        logger.warn('CSRF token missing', {
            path: req.path,
            method: req.method,
            hasCookie: !!cookieToken,
            hasSubmitted: !!submittedToken,
        });
        
        return res.status(403).json({
            success: false,
            message: 'CSRF token missing. Please refresh the page and try again.',
            errorCode: 'CSRF_TOKEN_MISSING',
        });
    }

    if (cookieToken !== submittedToken) {
        logger.warn('CSRF token mismatch', {
            path: req.path,
            method: req.method,
            ip: req.ip,
        });
        
        return res.status(403).json({
            success: false,
            message: 'Invalid CSRF token. Please refresh the page and try again.',
            errorCode: 'CSRF_TOKEN_INVALID',
        });
    }

    // Token is valid, continue
    next();
});

/**
 * Get CSRF token endpoint (for frontend to retrieve token)
 */
export const getCsrfToken = (req, res) => {
    const token = req.cookies[CSRF_TOKEN_COOKIE];
    
    if (!token) {
        // Generate new token if doesn't exist
        const newToken = generateToken();
        const isProduction = env.NODE_ENV === 'production';
        
        res.cookie(CSRF_TOKEN_COOKIE, newToken, {
            httpOnly: false,
            secure: isProduction,
            sameSite: isProduction ? 'none' : 'lax',
            maxAge: 24 * 60 * 60 * 1000,
        });
        
        return res.json({ csrfToken: newToken });
    }
    
    res.json({ csrfToken: token });
};


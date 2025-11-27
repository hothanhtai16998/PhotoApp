import express from 'express';
import {
    signUp,
    signIn,
    signOut,
    refreshToken,
    googleAuth,
    googleCallback,
    checkEmailAvailability,
    checkUsernameAvailability,
} from '../controllers/authController.js';
import { authLimiter } from '../middlewares/rateLimiter.js';
import { validateSignUp, validateSignIn } from '../middlewares/validationMiddleware.js';
import { env } from '../libs/env.js';

const router = express.Router();

// Check email availability (for real-time validation)
router.get('/check-email', authLimiter, checkEmailAvailability);

// Check username availability (for real-time validation)
router.get('/check-username', authLimiter, checkUsernameAvailability);

// Apply strict rate limiting and validation to auth endpoints
router.post('/signup', authLimiter, validateSignUp, signUp);
router.post('/signin', authLimiter, validateSignIn, signIn);
router.post('/signout', signOut);
router.post('/refresh', refreshToken);

// Google OAuth routes
router.get('/google', googleAuth);
router.get('/google/callback', googleCallback);

// Test endpoint to check Google OAuth configuration
router.get('/google/test', (req, res) => {
    res.json({
        configured: !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
        hasClientId: !!env.GOOGLE_CLIENT_ID,
        hasClientSecret: !!env.GOOGLE_CLIENT_SECRET,
        redirectUri: env.GOOGLE_REDIRECT_URI || 'Not configured',
        backendUrl: env.CLIENT_URL || 'Not configured',
    });
});

export default router;
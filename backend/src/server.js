import express from 'express';
import helmet from 'helmet';
import { env } from './libs/env.js';
import { CONNECT_DB } from './configs/db.js';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoute from './routes/authRoute.js';
import cookieParser from 'cookie-parser';
import userRoute from './routes/userRoute.js';
import cors from 'cors';
import compression from 'compression';
import imageRoute from './routes/imageRoute.js';
import adminRoute from './routes/adminRoute.js';
import categoryRoute from './routes/categoryRoute.js';
import favoriteRoute from './routes/favoriteRoute.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { apiLimiter } from './middlewares/rateLimiter.js';
import { csrfToken, validateCsrf, getCsrfToken } from './middlewares/csrfMiddleware.js';
import { logger } from './utils/logger.js';
import { startSessionCleanup } from './utils/sessionCleanup.js';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust proxy for secure cookies in production
if (env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

// Security middleware - Helmet helps secure Express apps by setting various HTTP headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            imgSrc: ["'self'", "https://res.cloudinary.com", "data:", "https:"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false, // Allow Cloudinary images
}));

// Middleware
// Compression middleware - reduces response size for better performance
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(
    cors({
        origin: env.CLIENT_URL,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-XSRF-TOKEN', 'X-CSRF-Token'],
    })
);

// Apply rate limiting to all API routes
app.use('/api', apiLimiter);

// CSRF protection - generate token for all routes
app.use('/api', csrfToken);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
    });
});

// CSRF token endpoint (for frontend to retrieve token)
app.get('/api/csrf-token', getCsrfToken);

// API Routes
app.use('/api/auth', authRoute);
app.use('/api/users', userRoute);
app.use('/api/images', imageRoute);
app.use('/api/admin', adminRoute);
app.use('/api/categories', categoryRoute);
app.use('/api/favorites', favoriteRoute);

// Serve static files in production
if (env.NODE_ENV === 'production') {
    // __dirname is backend/src, so go up two levels to root, then into frontend/dist
    const frontendDistPath = path.join(__dirname, '../../frontend/dist');
    app.use(express.static(frontendDistPath));

    app.get('*', (req, res) => {
        // Don't serve index.html for API routes
        if (req.path.startsWith('/api')) {
            return res.status(404).json({ message: 'API route not found' });
        }
        res.sendFile(path.join(frontendDistPath, 'index.html'));
    });
}

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server and connect to database
const startServer = async () => {
    try {
        await CONNECT_DB();

        // Start session cleanup scheduler
        startSessionCleanup();

        const PORT = env.PORT;
        app.listen(PORT, () => {
            logger.info(`🚀 Server is running on port ${PORT}`);
            logger.info(`📦 Environment: ${env.NODE_ENV}`);
        });
    } catch (error) {
        logger.error('❌ Failed to start server', error);
        process.exit(1);
    }
};

startServer();

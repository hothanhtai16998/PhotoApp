import { logger } from '../utils/logger.js';

/**
 * Global error handling middleware
 * Handles all errors and sends appropriate responses with user-friendly messages
 */
export const errorHandler = (err, req, res, next) => {
    logger.error('Request error', err, {
        method: req.method,
        url: req.url,
        ip: req.ip,
        userId: req.user?._id,
    });

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({
            success: false,
            message: 'Please check your input and try again',
            errors,
            errorCode: 'VALIDATION_ERROR',
        });
    }

    // Mongoose duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyPattern)[0];
        const fieldName = field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1');
        return res.status(409).json({
            success: false,
            message: `This ${fieldName.toLowerCase()} is already in use. Please choose a different one.`,
            errorCode: 'DUPLICATE_ENTRY',
            field,
        });
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: 'Your session is invalid. Please sign in again.',
            errorCode: 'INVALID_TOKEN',
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: 'Your session has expired. Please sign in again.',
            errorCode: 'TOKEN_EXPIRED',
        });
    }

    // Multer errors
    if (err.name === 'MulterError') {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'The file is too large. Maximum file size is 10MB. Please choose a smaller file.',
                errorCode: 'FILE_TOO_LARGE',
            });
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                message: 'Too many files uploaded. Please upload fewer files at once.',
                errorCode: 'TOO_MANY_FILES',
            });
        }
        return res.status(400).json({
            success: false,
            message: 'There was an error uploading your file. Please try again.',
            errorCode: 'UPLOAD_ERROR',
        });
    }

    // Cast error (invalid MongoDB ObjectId)
    if (err.name === 'CastError') {
        return res.status(400).json({
            success: false,
            message: 'Invalid ID format. Please check your request and try again.',
            errorCode: 'INVALID_ID',
        });
    }

    // Custom application errors with statusCode
    if (err.statusCode) {
        return res.status(err.statusCode).json({
            success: false,
            message: err.message || 'An error occurred',
            errorCode: err.errorCode || 'APPLICATION_ERROR',
            ...(process.env.NODE_ENV === 'development' && { details: err.details }),
        });
    }

    // Default error - hide internal details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    res.status(500).json({
        success: false,
        message: isDevelopment
            ? (err.message || 'Internal server error')
            : 'Something went wrong. Please try again later or contact support if the problem persists.',
        errorCode: 'INTERNAL_ERROR',
        ...(isDevelopment && {
            stack: err.stack,
            details: err.message,
        }),
    });
};


import 'dotenv/config';

/**
 * Validates required environment variables
 */
const validateEnv = () => {
	const required = [
		'MONGODB_URI',
		'ACCESS_TOKEN_SECRET',
		'CLIENT_URL',
		'CLOUDINARY_CLOUD_NAME',
		'CLOUDINARY_API_KEY',
		'CLOUDINARY_API_SECRET',
	];

	const missing = required.filter(key => !process.env[key]);

	if (missing.length > 0) {
		throw new Error(
			`Missing required environment variables: ${missing.join(', ')}`
		);
	}
};

// Validate on import
validateEnv();

export const env = {
	PORT: process.env.PORT || 5001,
	MONGODB_URI: process.env.MONGODB_URI,
	ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
	CLIENT_URL: process.env.CLIENT_URL,
	FRONTEND_URL: process.env.FRONTEND_URL || process.env.CLIENT_URL,
	NODE_ENV: process.env.NODE_ENV || 'development',
	RESEND_API_KEY: process.env.RESEND_API_KEY,
	EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME,
	EMAIL_FROM: process.env.EMAIL_FROM,
	CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
	CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
	CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
	ARCJET_KEY: process.env.ARCJET_KEY,
	ARCJET_ENV: process.env.ARCJET_ENV,
	GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
	GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
	GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
};
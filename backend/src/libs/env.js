import 'dotenv/config';

/**
 * Validates required environment variables
 */
const validateEnv = () => {
	const required = [
		'MONGODB_URI',
		'ACCESS_TOKEN_SECRET',
		'CLIENT_URL',
		'AWS_REGION',
		'AWS_ACCESS_KEY_ID',
		'AWS_SECRET_ACCESS_KEY',
		'AWS_S3_BUCKET_NAME',
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
	PORT: process.env.PORT || 3000,
	MONGODB_URI: process.env.MONGODB_URI,
	ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
	CLIENT_URL: process.env.CLIENT_URL,
	FRONTEND_URL: process.env.FRONTEND_URL || process.env.CLIENT_URL,
	NODE_ENV: process.env.NODE_ENV || 'development',
	RESEND_API_KEY: process.env.RESEND_API_KEY,
	EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME,
	EMAIL_FROM: process.env.EMAIL_FROM,
	// AWS S3 Configuration
	AWS_REGION: process.env.AWS_REGION,
	AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
	AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
	AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME,
	AWS_CLOUDFRONT_URL: process.env.AWS_CLOUDFRONT_URL, // Optional: CloudFront CDN URL
	ARCJET_KEY: process.env.ARCJET_KEY,
	ARCJET_ENV: process.env.ARCJET_ENV,
	GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
	GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
	GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
};
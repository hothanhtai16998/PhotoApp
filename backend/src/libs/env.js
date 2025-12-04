import 'dotenv/config';

/**
 * Validates required environment variables
 */
const validateEnv = () => {
	const required = [
		'MONGODB_URI',
		'ACCESS_TOKEN_SECRET',
		'CLIENT_URL',
	];

	const missing = required.filter(key => !process.env[key]);

	if (missing.length > 0) {
		throw new Error(
			`Missing required environment variables: ${missing.join(', ')}`
		);
	}

	// Validate storage configuration (either R2 or AWS S3)
	const hasR2 = !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET_NAME);
	const hasAWS = !!(process.env.AWS_REGION && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_S3_BUCKET_NAME);

	if (!hasR2 && !hasAWS) {
		throw new Error(
			'Missing storage configuration. Please configure either:\n' +
			'  - Cloudflare R2: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME\n' +
			'  - AWS S3: AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_S3_BUCKET_NAME'
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
	// Storage Configuration (AWS S3 or Cloudflare R2)
	// Cloudflare R2 (recommended - no egress fees, better CORS)
	R2_ACCOUNT_ID: process.env.R2_ACCOUNT_ID,
	R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID,
	R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY,
	R2_BUCKET_NAME: process.env.R2_BUCKET_NAME,
	R2_PUBLIC_URL: process.env.R2_PUBLIC_URL, // Optional: Custom domain or R2.dev subdomain
	
	// AWS S3 (legacy - kept for backward compatibility)
	AWS_REGION: process.env.AWS_REGION || 'ap-southeast-2',
	AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
	AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
	AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME,
	AWS_CLOUDFRONT_URL: process.env.AWS_CLOUDFRONT_URL, // Optional: CloudFront CDN URL
	
	// Determine which storage to use (R2 takes priority if configured)
	USE_R2: !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET_NAME),
	ARCJET_KEY: process.env.ARCJET_KEY,
	ARCJET_ENV: process.env.ARCJET_ENV,
	GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
	GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
	GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI,
};
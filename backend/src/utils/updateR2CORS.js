import 'dotenv/config';
import { S3Client, PutBucketCorsCommand } from '@aws-sdk/client-s3';
import { env } from '../libs/env.js';
import { logger } from './logger.js';

/**
 * Updates Cloudflare R2 bucket CORS configuration
 * R2 is S3-compatible, so we can use the same SDK
 * 
 * Usage: node src/utils/updateR2CORS.js
 */

if (!env.USE_R2) {
	logger.error('❌ R2 is not configured. Please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, and R2_BUCKET_NAME');
	process.exit(1);
}

const r2Client = new S3Client({
	region: 'auto',
	endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
	credentials: {
		accessKeyId: env.R2_ACCESS_KEY_ID,
		secretAccessKey: env.R2_SECRET_ACCESS_KEY,
	},
	forcePathStyle: true,
});

async function updateR2CORS() {
	try {
		logger.info('🔄 Updating R2 bucket CORS configuration...');
		logger.info(`📦 Bucket: ${env.R2_BUCKET_NAME}`);
		logger.info(`🌍 Account ID: ${env.R2_ACCOUNT_ID}`);

		// Collect all allowed origins
		const allowedOrigins = [
			'http://localhost:3000',
			'http://localhost:5173',
			env.CLIENT_URL,
			'https://uploadanh.cloud', // Production domain
		].filter(Boolean);

		// Remove duplicates
		const uniqueOrigins = [...new Set(allowedOrigins)];

		const corsConfiguration = {
			CORSRules: [
				{
					AllowedHeaders: ['*'],
					AllowedMethods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE'],
					AllowedOrigins: uniqueOrigins,
					ExposeHeaders: ['ETag', 'Content-Length', 'Content-Type'],
					MaxAgeSeconds: 3600,
				},
			],
		};

		const command = new PutBucketCorsCommand({
			Bucket: env.R2_BUCKET_NAME,
			CORSConfiguration: corsConfiguration,
		});

		await r2Client.send(command);

		logger.info('✅ R2 bucket CORS configuration updated successfully!');
		logger.info('📋 Allowed origins:');
		corsConfiguration.CORSRules[0].AllowedOrigins.forEach(origin => {
			logger.info(`   - ${origin}`);
		});
		logger.info('\n✅ R2 automatically serves files with CORS headers - no additional configuration needed!');

	} catch (error) {
		logger.error('❌ Failed to update R2 CORS configuration:', error.message);
		if (error.Code === 'AccessDenied') {
			logger.error('   Make sure your R2 credentials have the correct permissions');
		}
		process.exit(1);
	}
}

updateR2CORS();


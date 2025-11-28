import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { env } from './env.js';
import sharp from 'sharp';

// Initialize S3 client
const s3Client = new S3Client({
	region: env.AWS_REGION,
	credentials: {
		accessKeyId: env.AWS_ACCESS_KEY_ID,
		secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
	},
});

/**
 * Upload image to S3 with multiple sizes
 * @param {Buffer} imageBuffer - Original image buffer
 * @param {string} folder - Folder path in S3 (e.g., 'photo-app-images')
 * @param {string} filename - Base filename (without extension)
 * @returns {Promise<Object>} Object with URLs for different sizes
 */
export const uploadImageWithSizes = async (imageBuffer, folder = 'photo-app-images', filename) => {
	try {
		// Generate unique filename with timestamp
		const timestamp = Date.now();
		const baseFilename = filename || `image-${timestamp}`;

		// Process images with Sharp to create multiple sizes in both WebP and AVIF formats
		// Use auto-rotate to respect EXIF orientation data (fixes portrait images)
		// Sharp's rotate() without parameters auto-rotates based on EXIF orientation tag
		
		// Prepare base pipelines once per size, then clone for each format to avoid redundant resizing work.
		const thumbnailBase = sharp(imageBuffer, { failOnError: false })
			.rotate()
			.resize(200, null, { withoutEnlargement: true });

		const smallBase = sharp(imageBuffer, { failOnError: false })
			.rotate()
			.resize(800, null, { withoutEnlargement: true });

		const regularBase = sharp(imageBuffer, { failOnError: false })
			.rotate()
			.resize(1080, null, { withoutEnlargement: true });

		const originalBase = sharp(imageBuffer, { failOnError: false })
			.rotate();

		// Kick off all Sharp transforms in parallel to reduce total processing time.
		// Each transform works on its own Sharp pipeline, so running them concurrently
		// maximizes CPU usage and avoids the previous sequential bottleneck.
		const [
			thumbnailWebp,
			thumbnailAvif,
			smallWebp,
			smallAvif,
			regularWebp,
			regularAvif,
			originalWebp,
			originalAvif,
		] = await Promise.all([
			thumbnailBase.clone().webp({ quality: 60 }).toBuffer(),
			thumbnailBase.clone().avif({ quality: 60 }).toBuffer(),
			smallBase.clone().webp({ quality: 80 }).toBuffer(),
			smallBase.clone().avif({ quality: 80 }).toBuffer(),
			regularBase.clone().webp({ quality: 85 }).toBuffer(),
			regularBase.clone().avif({ quality: 85 }).toBuffer(),
			originalBase.clone().webp({ quality: 85 }).toBuffer(),
			originalBase.clone().avif({ quality: 85 }).toBuffer(),
		]);

		// Upload all sizes and formats to S3
		const uploadPromises = [
			// WebP versions (fallback for older browsers)
			uploadToS3(thumbnailWebp, `${folder}/${baseFilename}-thumbnail.webp`, 'image/webp'),
			uploadToS3(smallWebp, `${folder}/${baseFilename}-small.webp`, 'image/webp'),
			uploadToS3(regularWebp, `${folder}/${baseFilename}-regular.webp`, 'image/webp'),
			uploadToS3(originalWebp, `${folder}/${baseFilename}-original.webp`, 'image/webp'),
			// AVIF versions (better compression for modern browsers)
			uploadToS3(thumbnailAvif, `${folder}/${baseFilename}-thumbnail.avif`, 'image/avif'),
			uploadToS3(smallAvif, `${folder}/${baseFilename}-small.avif`, 'image/avif'),
			uploadToS3(regularAvif, `${folder}/${baseFilename}-regular.avif`, 'image/avif'),
			uploadToS3(originalAvif, `${folder}/${baseFilename}-original.avif`, 'image/avif'),
		];

		const [
			thumbnailUrl, smallUrl, regularUrl, originalUrl,
			thumbnailAvifUrl, smallAvifUrl, regularAvifUrl, originalAvifUrl
		] = await Promise.all(uploadPromises);

		return {
			publicId: baseFilename, // Store only filename, not full path
			// WebP URLs (for backward compatibility and fallback)
			imageUrl: originalUrl,
			thumbnailUrl,
			smallUrl,
			regularUrl,
			// AVIF URLs (for modern browsers)
			imageAvifUrl: originalAvifUrl,
			thumbnailAvifUrl,
			smallAvifUrl,
			regularAvifUrl,
		};
	} catch (error) {
		throw new Error(`Failed to process and upload image: ${error.message}`);
	}
};

/**
 * Upload a single file to S3
 * @param {Buffer} buffer - File buffer
 * @param {string} key - S3 object key (path)
 * @param {string} contentType - MIME type
 * @returns {Promise<string>} Public URL of uploaded file
 */
const uploadToS3 = async (buffer, key, contentType) => {
	try {
		const command = new PutObjectCommand({
			Bucket: env.AWS_S3_BUCKET_NAME,
			Key: key,
			Body: buffer,
			ContentType: contentType,
			CacheControl: 'public, max-age=31536000, immutable', // Cache for 1 year, immutable for better performance
		});

		await s3Client.send(command);

		// Return public URL
		// If using CloudFront, use CloudFront URL, otherwise use S3 URL
		if (env.AWS_CLOUDFRONT_URL) {
			return `${env.AWS_CLOUDFRONT_URL}/${key}`;
		}
		return `https://${env.AWS_S3_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
	} catch (error) {
		// Provide more detailed error information
		const errorMessage = error.message || 'Unknown error';
		const errorCode = error.Code || error.code || 'UNKNOWN';
		console.error('S3 Upload Error:', {
			code: errorCode,
			message: errorMessage,
			bucket: env.AWS_S3_BUCKET_NAME,
			key: key,
			region: env.AWS_REGION,
		});
		throw new Error(`Failed to upload to S3 (${errorCode}): ${errorMessage}`);
	}
};

/**
 * Upload avatar to S3 (single size, 200x200)
 * @param {Buffer} imageBuffer - Original image buffer
 * @param {string} folder - Folder path in S3 (e.g., 'photo-app-avatars')
 * @param {string} filename - Base filename (without extension)
 * @returns {Promise<Object>} Object with URL and publicId
 */
export const uploadAvatar = async (imageBuffer, folder = 'photo-app-avatars', filename) => {
	try {
		// Generate unique filename with timestamp
		const timestamp = Date.now();
		const baseFilename = filename || `avatar-${timestamp}`;
		const extension = 'webp';

		// Process avatar with Sharp: 200x200, face detection, WebP
		const avatar = await sharp(imageBuffer, { failOnError: false })
			.rotate() // Auto-rotate based on EXIF orientation
			.resize(200, 200, {
				fit: 'cover',
				position: 'center',
			})
			.webp({ quality: 85 })
			.toBuffer();

		// Upload to S3
		const avatarUrl = await uploadToS3(
			avatar,
			`${folder}/${baseFilename}.${extension}`,
			'image/webp'
		);

		return {
			publicId: `${folder}/${baseFilename}`,
			avatarUrl,
		};
	} catch (error) {
		throw new Error(`Failed to process and upload avatar: ${error.message}`);
	}
};

/**
 * Delete image from S3 (all sizes)
 * @param {string} publicId - Base public ID (without size suffix)
 * @param {string} folder - Folder path
 */
export const deleteImageFromS3 = async (publicId, folder = 'photo-app-images') => {
	try {
		const sizes = ['thumbnail', 'small', 'regular', 'original'];
		const formats = ['webp', 'avif']; // Delete both WebP and AVIF versions

		const deletePromises = sizes.flatMap((size) => 
			formats.map((format) => {
				const key = `${folder}/${publicId}-${size}.${format}`;
				const command = new DeleteObjectCommand({
					Bucket: env.AWS_S3_BUCKET_NAME,
					Key: key,
				});
				return s3Client.send(command);
			})
		);

		await Promise.all(deletePromises);
	} catch (error) {
		// Log error but don't throw - deletion is not critical
		console.error(`Failed to delete image from S3: ${error.message}`);
	}
};

/**
 * Delete avatar from S3
 * @param {string} publicId - Public ID (with folder prefix)
 */
export const deleteAvatarFromS3 = async (publicId) => {
	try {
		const extension = 'webp';
		const key = `${publicId}.${extension}`;
		const command = new DeleteObjectCommand({
			Bucket: env.AWS_S3_BUCKET_NAME,
			Key: key,
		});
		await s3Client.send(command);
	} catch (error) {
		// Log error but don't throw - deletion is not critical
		console.error(`Failed to delete avatar from S3: ${error.message}`);
	}
};

/**
 * Get image from S3 as a stream
 * @param {string} imageUrl - Full S3 URL or S3 key
 * @returns {Promise<{Body: ReadableStream, ContentType: string, ContentLength: number}>}
 */
export const getImageFromS3 = async (imageUrl) => {
	try {
		// Extract S3 key from URL
		// Handle both full URLs and keys
		let key;
		if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
			// Extract key from URL
			// Format: https://bucket.s3.region.amazonaws.com/key or https://cloudfront.net/key
			const url = new URL(imageUrl);
			key = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
		} else {
			key = imageUrl;
		}

		const command = new GetObjectCommand({
			Bucket: env.AWS_S3_BUCKET_NAME,
			Key: key,
		});

		const response = await s3Client.send(command);
		return {
			Body: response.Body,
			ContentType: response.ContentType || 'image/webp',
			ContentLength: response.ContentLength,
		};
	} catch (error) {
		console.error('S3 Get Error:', {
			message: error.message,
			code: error.Code || error.code,
			imageUrl,
		});
		throw new Error(`Failed to get image from S3: ${error.message}`);
	}
};

export default s3Client;


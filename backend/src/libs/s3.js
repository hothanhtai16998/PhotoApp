import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
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
		const extension = 'webp'; // Use WebP for better compression

		// Process images with Sharp to create multiple sizes
		// Use auto-rotate to respect EXIF orientation data (fixes portrait images)
		// Sharp's rotate() without parameters auto-rotates based on EXIF orientation tag
		const thumbnail = await sharp(imageBuffer, { failOnError: false })
			.rotate() // Auto-rotate based on EXIF orientation (removes orientation tag)
			.resize(200, null, { withoutEnlargement: true })
			.webp({ quality: 60 })
			.toBuffer();

		const small = await sharp(imageBuffer, { failOnError: false })
			.rotate() // Auto-rotate based on EXIF orientation
			.resize(800, null, { withoutEnlargement: true })
			.webp({ quality: 80 })
			.toBuffer();

		const regular = await sharp(imageBuffer, { failOnError: false })
			.rotate() // Auto-rotate based on EXIF orientation
			.resize(1080, null, { withoutEnlargement: true })
			.webp({ quality: 85 })
			.toBuffer();

		// Original (optimized but full size)
		const original = await sharp(imageBuffer, { failOnError: false })
			.rotate() // Auto-rotate based on EXIF orientation
			.webp({ quality: 85 })
			.toBuffer();

		// Upload all sizes to S3 (use buffers directly)
		const uploadPromises = [
			uploadToS3(thumbnail, `${folder}/${baseFilename}-thumbnail.${extension}`, 'image/webp'),
			uploadToS3(small, `${folder}/${baseFilename}-small.${extension}`, 'image/webp'),
			uploadToS3(regular, `${folder}/${baseFilename}-regular.${extension}`, 'image/webp'),
			uploadToS3(original, `${folder}/${baseFilename}-original.${extension}`, 'image/webp'),
		];

		const [thumbnailUrl, smallUrl, regularUrl, originalUrl] = await Promise.all(uploadPromises);

		return {
			publicId: baseFilename, // Store only filename, not full path
			imageUrl: originalUrl,
			thumbnailUrl,
			smallUrl,
			regularUrl,
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
			CacheControl: 'public, max-age=31536000', // Cache for 1 year
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
		const extension = 'webp';

		const deletePromises = sizes.map((size) => {
			const key = `${folder}/${publicId}-${size}.${extension}`;
			const command = new DeleteObjectCommand({
				Bucket: env.AWS_S3_BUCKET_NAME,
				Key: key,
			});
			return s3Client.send(command);
		});

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

export default s3Client;


import imageCompression from 'browser-image-compression';

export interface CompressionOptions {
	maxSizeMB?: number;
	maxWidthOrHeight?: number;
	useWebWorker?: boolean;
	fileType?: string;
}

/**
 * Compress an image file before upload
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns Compressed file
 */
export async function compressImage(
	file: File,
	options: CompressionOptions = {}
): Promise<File> {
	const defaultOptions: CompressionOptions = {
		maxSizeMB: 4, // Maximum file size in MB (4MB for better quality in photo apps)
		maxWidthOrHeight: 2560, // Maximum width or height (2K resolution for high-DPI displays)
		useWebWorker: true, // Use web worker for better performance
		fileType: file.type, // Preserve original file type
	};

	const compressionOptions = { ...defaultOptions, ...options };

	try {
		// Only compress if file is larger than 2MB (preserve quality for smaller files)
		if (file.size > 2 * 1024 * 1024) {
			const compressedFile = await imageCompression(
				file,
				compressionOptions
			);
			console.warn(
				`Image compressed: ${(file.size / 1024 / 1024).toFixed(2)}MB -> ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`
			);
			return compressedFile;
		}
		return file;
	} catch (error) {
		console.error('Image compression failed:', error);
		// Return original file if compression fails
		return file;
	}
}


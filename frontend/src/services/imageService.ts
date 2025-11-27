/**
 * Image Service - Re-exports all image-related services for backward compatibility
 *
 * This file maintains backward compatibility by re-exporting all methods
 * from the split services. New code should import from the specific services:
 * - imageUploadService - upload operations
 * - imageFetchService - fetch operations
 * - imageUpdateService - update operations
 * - imageStatsService - stats operations
 */

import { imageUploadService } from './imageUploadService';
import { imageFetchService } from './imageFetchService';
import { imageUpdateService } from './imageUpdateService';
import { imageStatsService } from './imageStatsService';

export const imageService = {
  // Upload operations
  preUploadImage: imageUploadService.preUploadImage,
  finalizeImageUpload: imageUploadService.finalizeImageUpload,
  uploadImage: imageUploadService.uploadImage,
  createBulkUploadNotification: imageUploadService.createBulkUploadNotification,

  // Fetch operations
  fetchImages: imageFetchService.fetchImages,
  fetchUserImages: imageFetchService.fetchUserImages,
  fetchLocations: imageFetchService.fetchLocations,

  // Update operations
  updateImage: imageUpdateService.updateImage,
  updateImageWithFile: imageUpdateService.updateImageWithFile,
  batchUpdateImages: imageUpdateService.batchUpdateImages,

  // Stats operations
  incrementView: imageStatsService.incrementView,
  incrementDownload: imageStatsService.incrementDownload,
};

// Re-export individual services for direct imports
export { imageUploadService } from './imageUploadService';
export { imageFetchService } from './imageFetchService';
export { imageUpdateService } from './imageUpdateService';
export { imageStatsService } from './imageStatsService';

import api from '@/lib/api';
import type { UploadImageData } from '@/types/store';
import type {
  PreUploadResponse,
  FinalizeImageData,
  FinalizeImageResponse,
} from '@/types/image';

export const imageUploadService = {
  // Pre-upload: Upload image to S3 only (no database record)
  preUploadImage: async (
    imageFile: File,
    onUploadProgress?: (progress: number) => void
  ): Promise<PreUploadResponse> => {
    const formData = new FormData();
    formData.append('image', imageFile);

    const res = await api.post('/images/pre-upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      withCredentials: true,
      timeout: 120000, // 2 minutes for uploads
      onUploadProgress: (progressEvent) => {
        if (onUploadProgress && progressEvent.total) {
          // Calculate upload progress (0-100%)
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onUploadProgress(percentCompleted);
        }
      },
    });

    return res.data;
  },

  // Finalize: Link metadata to pre-uploaded image and create database record
  finalizeImageUpload: async (
    data: FinalizeImageData
  ): Promise<FinalizeImageResponse> => {
    const res = await api.post('/images/finalize', data, {
      withCredentials: true,
      timeout: 30000, // 30 seconds should be enough for metadata save
    });

    return res.data;
  },

  // Legacy upload method (kept for backward compatibility)
  uploadImage: async (
    data: UploadImageData,
    onUploadProgress?: (progress: number) => void
  ) => {
    const formData = new FormData();
    formData.append('image', data.image);
    formData.append('imageTitle', data.imageTitle);
    formData.append('imageCategory', data.imageCategory);

    if (data.location) {
      formData.append('location', data.location);
    }
    if (data.coordinates) {
      formData.append('coordinates', JSON.stringify(data.coordinates));
    }
    if (data.cameraModel) {
      formData.append('cameraModel', data.cameraModel);
    }

    const res = await api.post('/images/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      withCredentials: true,
      timeout: 120000, // 2 minutes for uploads
      onUploadProgress: (progressEvent) => {
        if (onUploadProgress && progressEvent.total) {
          // Calculate HTTP upload progress (uploading file to our backend)
          // Cap at 85% - the remaining 15% is for S3 upload and image processing on backend
          const httpProgress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          // Show 0-85% during HTTP upload to backend
          const percentCompleted = Math.min(85, httpProgress);
          onUploadProgress(percentCompleted);
        }
      },
    });

    return res.data;
  },

  /**
   * Create bulk upload notification
   */
  createBulkUploadNotification: async (
    successCount: number,
    totalCount: number,
    failedCount?: number
  ): Promise<void> => {
    try {
      await api.post(
        '/images/bulk-upload-notification',
        {
          successCount,
          totalCount,
          failedCount: failedCount || 0,
        },
        {
          withCredentials: true,
        }
      );
    } catch (error) {
      // Silently fail - don't interrupt upload flow if notification fails
      console.error('Failed to create bulk upload notification:', error);
    }
  },
};


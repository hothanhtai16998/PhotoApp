import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { categoryService, type Category } from '@/services/categoryService';
import { imageService, type PreUploadResponse, type FinalizeImageData } from '@/services/imageService';
import { compressImage } from '@/utils/imageCompression';

export interface ImageData {
  file: File;
  title: string;
  category: string;
  location: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  cameraModel: string;
  tags: string[];
  errors: {
    title?: string;
    category?: string;
  };
  // New fields for pre-upload flow
  preUploadData?: PreUploadResponse | null;
  uploadProgress?: number;
  isUploading?: boolean;
  uploadError?: string | null;
}

interface UseImageUploadProps {
  onSuccess?: () => void;
}

export const useImageUpload = ({ onSuccess }: UseImageUploadProps = {}) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState(0);
  const [totalUploads, setTotalUploads] = useState(0);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const uploadProgressRef = useRef<number>(0);

  const loadCategories = useCallback(async () => {
    try {
      setLoadingCategories(true);
      const fetchedCategories = await categoryService.fetchCategories();
      setCategories(fetchedCategories);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  // Shared validation function that returns images with errors
  const validateImagesWithErrors = useCallback((imagesData: ImageData[]): ImageData[] => {
    return imagesData.map((img) => {
      const errors: { title?: string; category?: string } = {};
      if (!img.title.trim()) {
        errors.title = 'Title is required';
      }
      if (!img.category.trim()) {
        errors.category = 'Category is required';
      }
      return { ...img, errors };
    });
  }, []);

  const validateAllImages = useCallback((imagesData: ImageData[]): boolean => {
    const updated = validateImagesWithErrors(imagesData);
    return updated.every((img) => Object.keys(img.errors).length === 0);
  }, [validateImagesWithErrors]);

  // Pre-upload a single image
  const preUploadSingleImage = useCallback(async (
    imageData: ImageData,
    onProgress?: (progress: number) => void
  ): Promise<PreUploadResponse> => {
    try {
      // Compress image first
      const compressedFile = await compressImage(imageData.file);
      
      // Pre-upload to S3
      const result = await imageService.preUploadImage(
        compressedFile,
        (progress) => {
          onProgress?.(progress);
        }
      );

      return result;
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to upload image';
      throw new Error(errorMessage);
    }
  }, []);

  // Pre-upload all images when files are selected
  const preUploadAllImages = useCallback(async (
    imagesData: ImageData[],
    onImageProgress?: (index: number, progress: number) => void
  ): Promise<ImageData[]> => {
    const updatedImagesData: ImageData[] = [];
    
    for (let i = 0; i < imagesData.length; i++) {
      const imgData = imagesData[i];
      if (!imgData) continue;

      // Skip if already uploaded
      if (imgData.preUploadData) {
        updatedImagesData.push(imgData);
        continue;
      }

      try {
        // Mark as uploading - preserve ALL existing fields (title, category, location, etc.)
        const uploadingState: ImageData = {
          ...imgData, // Preserve all existing form data
          isUploading: true,
          uploadProgress: 0,
          uploadError: null,
        };
        updatedImagesData.push(uploadingState);
        
        // Immediately notify progress callback with initial state
        onImageProgress?.(i, 0);

        // Pre-upload image
        const preUploadResult = await preUploadSingleImage(
          imgData,
          (progress) => {
            onImageProgress?.(i, progress);
          }
        );

        // Update with pre-upload result - preserve ALL existing fields
        updatedImagesData[i] = {
          ...imgData, // Preserve all existing form data (title, category, location, etc.)
          preUploadData: preUploadResult,
          isUploading: false,
          uploadProgress: 100,
          uploadError: null,
        };
      } catch (error: any) {
        // Mark as failed
        updatedImagesData[i] = {
          ...imgData,
          isUploading: false,
          uploadProgress: 0,
          uploadError: error.message || 'Upload failed',
          preUploadData: null,
        };
      }
    }

    return updatedImagesData;
  }, [preUploadSingleImage]);

  const handleSubmitAll = useCallback(
    async (imagesData: ImageData[]) => {
      // Validate all images
      if (!validateAllImages(imagesData)) {
        return false;
      }

      // Check if all images are pre-uploaded
      const allUploaded = imagesData.every(img => img.preUploadData && !img.isUploading);
      if (!allUploaded) {
        toast.error('Vui lòng đợi tất cả ảnh tải lên hoàn tất');
        return false;
      }

      // Show finalizing progress
      setIsFinalizing(true);
      setShowProgress(true);
      setTotalUploads(imagesData.length);
      setUploadingIndex(0);

      const failedUploads: { index: number; title: string; error: unknown }[] = [];
      const successfulUploads: number[] = [];

      try {
        // Finalize all images sequentially
        for (let i = 0; i < imagesData.length; i++) {
          setUploadingIndex(i);
          const imgData = imagesData[i];
          if (!imgData || !imgData.preUploadData) continue;

          try {
            const finalizeData: FinalizeImageData = {
              uploadId: imgData.preUploadData.uploadId,
              publicId: imgData.preUploadData.publicId,
              imageUrl: imgData.preUploadData.imageUrl,
              thumbnailUrl: imgData.preUploadData.thumbnailUrl,
              smallUrl: imgData.preUploadData.smallUrl,
              regularUrl: imgData.preUploadData.regularUrl,
              imageAvifUrl: imgData.preUploadData.imageAvifUrl,
              thumbnailAvifUrl: imgData.preUploadData.thumbnailAvifUrl,
              smallAvifUrl: imgData.preUploadData.smallAvifUrl,
              regularAvifUrl: imgData.preUploadData.regularAvifUrl,
              imageTitle: imgData.title.trim(),
              imageCategory: imgData.category.trim(),
              location: imgData.location.trim() || undefined,
              coordinates: imgData.coordinates,
              cameraModel: imgData.cameraModel.trim() || undefined,
              tags: imgData.tags && imgData.tags.length > 0 ? imgData.tags : undefined,
            };

            await imageService.finalizeImageUpload(finalizeData);
            successfulUploads.push(i);
          } catch (error) {
            // Track failed finalize but continue with others
            failedUploads.push({
              index: i,
              title: imgData.title || `Image ${i + 1}`,
              error,
            });
            console.error(
              `Failed to finalize image ${i + 1} (${imgData.title}):`,
              error
            );
          }

          // Small delay between finalizations
          if (i < imagesData.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 300));
          }
        }

        // Wait a moment before showing success
        await new Promise((resolve) => setTimeout(resolve, 800));

        setShowProgress(false);
        setIsFinalizing(false);

        // Show appropriate message based on results
        if (failedUploads.length === 0) {
          // All successful
          setShowSuccess(true);
        } else if (successfulUploads.length > 0) {
          // Partial success
          setShowSuccess(true);
          const failedTitles = failedUploads.map((f) => f.title).join(', ');
          toast.warning(
            `${successfulUploads.length} ảnh đã tải lên thành công. ${failedUploads.length} ảnh thất bại: ${failedTitles}`
          );
        } else {
          // All failed
          setShowSuccess(false);
          toast.error(
            `Tất cả ${failedUploads.length} ảnh đều thất bại khi tải lên.`
          );
          return false;
        }

        // Dispatch refresh events
        window.dispatchEvent(new CustomEvent('refreshProfile'));

        // Get category names (use first successful image's category for refresh)
        const firstSuccessfulIndex = successfulUploads[0] ?? 0;
        const firstCategoryId = imagesData[firstSuccessfulIndex]?.category;
        const firstCategory = categories.find(
          (cat) => cat._id === firstCategoryId
        );
        const categoryName = firstCategory?.name || null;

        setTimeout(() => {
          const refreshEvent = new CustomEvent('refreshImages', {
            detail: { categoryName },
          });
          window.dispatchEvent(refreshEvent);
        }, 300);

        onSuccess?.();
        return failedUploads.length === 0; // Return true only if all succeeded
      } catch (error) {
        console.error('Failed to finalize images:', error);
        setShowProgress(false);
        setIsFinalizing(false);
        setShowSuccess(false);
        toast.error('Đã xảy ra lỗi khi tải lên ảnh. Vui lòng thử lại.');
        return false;
      }
    },
    [categories, validateAllImages, onSuccess]
  );

  const resetUploadState = useCallback(() => {
    setShowProgress(false);
    setShowSuccess(false);
    setUploadingIndex(0);
    setTotalUploads(0);
    setIsFinalizing(false);
    uploadProgressRef.current = 0;
  }, []);

  // Calculate overall upload progress
  const uploadProgress = uploadProgressRef.current;

  return {
    categories,
    loadingCategories,
    loadCategories,
    showProgress,
    showSuccess,
    uploadingIndex,
    totalUploads,
    uploadProgress,
    loading: isFinalizing,
    handleSubmitAll,
    resetUploadState,
    validateAllImages,
    validateImagesWithErrors,
    preUploadAllImages,
    preUploadSingleImage,
  };
};

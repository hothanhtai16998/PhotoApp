import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useImageStore } from '@/stores/useImageStore';
import { categoryService, type Category } from '@/services/categoryService';

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
}

interface UseImageUploadProps {
  onSuccess?: () => void;
}

export const useImageUpload = ({ onSuccess }: UseImageUploadProps = {}) => {
  const { uploadImage, loading, uploadProgress } = useImageStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState(0);
  const [totalUploads, setTotalUploads] = useState(0);

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

  const handleSubmitAll = useCallback(
    async (imagesData: ImageData[]) => {
      // Validate all images
      if (!validateAllImages(imagesData)) {
        return false;
      }

      // Show progress screen
      setShowProgress(true);
      setTotalUploads(imagesData.length);
      setUploadingIndex(0);

      const failedUploads: { index: number; title: string; error: unknown }[] =
        [];
      const successfulUploads: number[] = [];

      try {
        // Upload all images sequentially with their own metadata
        for (let i = 0; i < imagesData.length; i++) {
          setUploadingIndex(i);
          const imgData = imagesData[i];
          if (!imgData) continue;

          try {
            await uploadImage({
              image: imgData.file,
              imageTitle: imgData.title.trim(),
              imageCategory: imgData.category.trim(),
              location: imgData.location.trim() || undefined,
              coordinates: imgData.coordinates,
              cameraModel: imgData.cameraModel.trim() || undefined,
              tags:
                imgData.tags && imgData.tags.length > 0
                  ? imgData.tags
                  : undefined,
            });
            successfulUploads.push(i);
          } catch (error) {
            // Track failed upload but continue with others
            failedUploads.push({
              index: i,
              title: imgData.title || `Image ${i + 1}`,
              error,
            });
            console.error(
              `Failed to upload image ${i + 1} (${imgData.title}):`,
              error
            );
          }

          // Small delay between uploads
          if (i < imagesData.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }

        // Wait a moment before showing success
        await new Promise((resolve) => setTimeout(resolve, 800));

        setShowProgress(false);

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
        console.error('Failed to upload images:', error);
        setShowProgress(false);
        setShowSuccess(false);
        toast.error('Đã xảy ra lỗi khi tải lên ảnh. Vui lòng thử lại.');
        return false;
      }
    },
    [uploadImage, categories, validateAllImages, onSuccess]
  );

  const resetUploadState = useCallback(() => {
    setShowProgress(false);
    setShowSuccess(false);
    setUploadingIndex(0);
    setTotalUploads(0);
  }, []);

  return {
    categories,
    loadingCategories,
    loadCategories,
    showProgress,
    showSuccess,
    uploadingIndex,
    totalUploads,
    uploadProgress,
    loading,
    handleSubmitAll,
    resetUploadState,
    validateAllImages,
    validateImagesWithErrors,
  };
};

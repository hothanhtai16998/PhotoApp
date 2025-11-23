import { useState, useCallback } from 'react';
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

  const validateAllImages = useCallback((imagesData: ImageData[]): boolean => {
    const updated = imagesData.map(img => {
      const errors: { title?: string; category?: string } = {};
      if (!img.title.trim()) {
        errors.title = 'Title is required';
      }
      if (!img.category.trim()) {
        errors.category = 'Category is required';
      }
      return { ...img, errors };
    });
    return updated.every(img => Object.keys(img.errors).length === 0);
  }, []);

  const handleSubmitAll = useCallback(async (imagesData: ImageData[]) => {
    // Validate all images
    if (!validateAllImages(imagesData)) {
      return false;
    }

    // Show progress screen
    setShowProgress(true);
    setTotalUploads(imagesData.length);
    setUploadingIndex(0);

    try {
      // Upload all images sequentially with their own metadata
      for (let i = 0; i < imagesData.length; i++) {
        setUploadingIndex(i);
        const imgData = imagesData[i];
        if (!imgData) continue;

        await uploadImage({
          image: imgData.file,
          imageTitle: imgData.title.trim(),
          imageCategory: imgData.category.trim(),
          location: imgData.location.trim() || undefined,
          coordinates: imgData.coordinates,
          cameraModel: imgData.cameraModel.trim() || undefined,
          tags: imgData.tags && imgData.tags.length > 0 ? imgData.tags : undefined,
        });

        // Small delay between uploads
        if (i < imagesData.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Wait a moment before showing success
      await new Promise(resolve => setTimeout(resolve, 800));

      setShowProgress(false);
      setShowSuccess(true);

      // Dispatch refresh events
      window.dispatchEvent(new CustomEvent('refreshProfile'));

      // Get category names (use first image's category for refresh)
      const firstCategoryId = imagesData[0]?.category;
      const firstCategory = categories.find(cat => cat._id === firstCategoryId);
      const categoryName = firstCategory?.name || null;

      setTimeout(() => {
        const refreshEvent = new CustomEvent('refreshImages', {
          detail: { categoryName }
        });
        window.dispatchEvent(refreshEvent);
      }, 300);

      onSuccess?.();
      return true;
    } catch {
      setShowProgress(false);
      setShowSuccess(false);
      return false;
    }
  }, [uploadImage, categories, validateAllImages, onSuccess]);

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
  };
};


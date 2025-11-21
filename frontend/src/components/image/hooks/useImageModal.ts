import { useEffect, useState, useCallback, useMemo } from 'react';
import type { Image } from '@/types/image';
import { favoriteService } from '@/services/favoriteService';
import { useAuthStore } from '@/stores/useAuthStore';
import { toast } from 'sonner';
import { useImageStats } from './useImageStats';
import { useImagePreload } from './useImagePreload';
import { useKeyboardNavigation } from './useKeyboardNavigation';

interface UseImageModalProps {
  image: Image;
  images: Image[];
  onImageSelect: (image: Image) => void;
  onClose: () => void;
  onDownload: (image: Image, e: React.MouseEvent) => void;
}

export const useImageModal = ({
  image,
  images,
  onImageSelect,
  onClose,
  onDownload,
}: UseImageModalProps) => {
  const { accessToken, user } = useAuthStore();
  const [isFavorited, setIsFavorited] = useState<boolean>(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState<boolean>(false);

  // Memoize current image index to avoid recalculation
  const currentImageIndex = useMemo(() => {
    return images.findIndex(img => img._id === image._id);
  }, [images, image._id]);

  // Use custom hooks for stats and preloading
  const { views, downloads, handleDownload: handleDownloadWithStats } = useImageStats({
    image,
    onImageUpdate: onImageSelect,
  });

  const { imageSrc: modalImageSrc, isLoaded: isModalImageLoaded, setIsLoaded: setIsModalImageLoaded } = useImagePreload(image);

  // Check favorite status when image changes (only if user is logged in)
  useEffect(() => {
    if (accessToken && image && image._id) {
      // Ensure imageId is a string and valid MongoDB ObjectId
      const imageId = String(image._id).trim();

      // Validate MongoDB ObjectId format (24 hex characters)
      const isValidMongoId = /^[0-9a-fA-F]{24}$/.test(imageId);

      if (!imageId || imageId === 'undefined' || imageId === 'null' || !isValidMongoId) {
        setIsFavorited(false);
        return;
      }

      favoriteService.checkFavorites([imageId])
        .then((response) => {
          // Check response structure - backend returns { success: true, favorites: { imageId: boolean } }
          if (response && response.favorites && typeof response.favorites === 'object') {
            // Check both string and original ID format to handle any type mismatches
            const isFavorited = response.favorites[imageId] === true ||
              response.favorites[String(image._id)] === true ||
              response.favorites[image._id] === true;
            setIsFavorited(!!isFavorited);
          } else {
            setIsFavorited(false);
          }
        })
        .catch((error) => {
          // Silently fail - favorite status is optional
          console.error('Failed to check favorite status:', error);
        });
    } else {
      setIsFavorited(false);
    }
    // Dependencies: image URLs and accessToken
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image._id, accessToken]);

  // Handle toggle favorite
  const handleToggleFavorite = useCallback(async () => {
    if (!accessToken || !image._id || isTogglingFavorite) return;

    setIsTogglingFavorite(true);
    try {
      const imageId = String(image._id);
      const response = await favoriteService.toggleFavorite(imageId);

      // Update local state immediately
      setIsFavorited(response.isFavorited);

      if (response.isFavorited) {
        toast.success('Đã thêm vào yêu thích');
      } else {
        toast.success('Đã xóa khỏi yêu thích');
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      toast.error('Không thể cập nhật yêu thích. Vui lòng thử lại.');
    } finally {
      setIsTogglingFavorite(false);
    }
  }, [accessToken, image._id, isTogglingFavorite]);

  // Wrapper for download that combines stats increment with actual download
  const handleDownload = useCallback(async (e: React.MouseEvent) => {
    await handleDownloadWithStats(e, onDownload);
  }, [handleDownloadWithStats, onDownload]);

  // Navigation handlers for keyboard shortcuts
  const handleNavigateLeft = useCallback(() => {
    if (currentImageIndex > 0) {
      onImageSelect(images[currentImageIndex - 1]);
    }
  }, [currentImageIndex, images, onImageSelect]);

  const handleNavigateRight = useCallback(() => {
    if (currentImageIndex < images.length - 1) {
      onImageSelect(images[currentImageIndex + 1]);
    }
  }, [currentImageIndex, images, onImageSelect]);

  // Use keyboard navigation hook
  useKeyboardNavigation({
    onClose,
    onNavigateLeft: images.length > 1 ? handleNavigateLeft : undefined,
    onNavigateRight: images.length > 1 ? handleNavigateRight : undefined,
    onDownload: () => {
      const downloadBtn = document.querySelector('.modal-download-btn') as HTMLElement;
      if (downloadBtn) {
        downloadBtn.click();
      }
    },
    onShare: () => {
      const shareBtn = document.querySelector('.modal-share-btn') as HTMLElement;
      if (shareBtn) {
        shareBtn.click();
      }
    },
    onToggleFavorite: accessToken && !isTogglingFavorite ? handleToggleFavorite : undefined,
    images,
    currentImageIndex,
    isEnabled: true,
  });

  return {
    views,
    downloads,
    isFavorited,
    isTogglingFavorite,
    modalImageSrc,
    isModalImageLoaded,
    setIsModalImageLoaded,
    handleToggleFavorite,
    handleDownload,
    currentImageIndex,
    user,
  };
};


import { useState, useCallback, useMemo } from 'react';
import type { Image } from '@/types/image';
import { favoriteService } from '@/services/favoriteService';
import { useAuthStore } from '@/stores/useAuthStore';
import { toast } from 'sonner';
import { useImageStats } from './useImageStats';
import { useImagePreload } from './useImagePreload';
import { useKeyboardNavigation } from './useKeyboardNavigation';
import {
  useBatchedFavoriteCheck,
  updateFavoriteCache,
} from '@/hooks/useBatchedFavoriteCheck';

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
  const [isTogglingFavorite, setIsTogglingFavorite] = useState<boolean>(false);

  // Memoize current image index to avoid recalculation
  const currentImageIndex = useMemo(() => {
    return images.findIndex((img) => img._id === image._id);
  }, [images, image._id]);

  // Use custom hooks for stats and preloading
  const {
    views,
    downloads,
    handleDownload: handleDownloadWithStats,
  } = useImageStats({
    image,
    onImageUpdate: onImageSelect,
  });

  const {
    placeholderSrc: modalPlaceholderSrc,
    imageSrc: modalImageSrc,
    isLoaded: isModalImageLoaded,
    setIsLoaded: setIsModalImageLoaded,
  } = useImagePreload(image);

  // Use batched favorite check hook (reduces API calls, avoids duplicates)
  // This will batch with ImageGrid's checks if both are checking the same image
  const isFavorited = useBatchedFavoriteCheck(image._id);

  // Handle toggle favorite
  const handleToggleFavorite = useCallback(async () => {
    if (!accessToken || !image._id || isTogglingFavorite) return;

    setIsTogglingFavorite(true);
    try {
      const imageId = String(image._id);
      const response = await favoriteService.toggleFavorite(imageId);

      // Immediately update the cache so UI reflects the change instantly
      updateFavoriteCache(imageId, response.isFavorited);

      if (response.isFavorited) {
        toast.success('Đã thêm vào yêu thích');
      } else {
        toast.success('Đã xóa khỏi yêu thích');
      }
    } catch (error) {
      // Error handled by toast in parent component
      toast.error('Không thể cập nhật yêu thích. Vui lòng thử lại.');
    } finally {
      setIsTogglingFavorite(false);
    }
  }, [accessToken, image, isTogglingFavorite]);

  // Wrapper for download that combines stats increment with actual download
  const handleDownload = useCallback(
    async (e: React.MouseEvent) => {
      await handleDownloadWithStats(e, onDownload);
    },
    [handleDownloadWithStats, onDownload]
  );

  // Navigation handlers for keyboard shortcuts
  const handleNavigateLeft = useCallback(() => {
    if (currentImageIndex > 0) {
      const prevImage = images[currentImageIndex - 1];
      if (prevImage) {
        onImageSelect(prevImage);
      }
    }
  }, [currentImageIndex, images, onImageSelect]);

  const handleNavigateRight = useCallback(() => {
    if (currentImageIndex < images.length - 1) {
      const nextImage = images[currentImageIndex + 1];
      if (nextImage) {
        onImageSelect(nextImage);
      }
    }
  }, [currentImageIndex, images, onImageSelect]);

  // Note: Zoom controls are handled in ImageModal component
  // Use keyboard navigation hook
  useKeyboardNavigation({
    onClose,
    onNavigateLeft: images.length > 1 ? handleNavigateLeft : undefined,
    onNavigateRight: images.length > 1 ? handleNavigateRight : undefined,
    onDownload: () => {
      const downloadBtn = document.querySelector(
        '.modal-download-btn'
      ) as HTMLElement;
      if (downloadBtn) {
        downloadBtn.click();
      }
    },
    onShare: () => {
      const shareBtn = document.querySelector(
        '.modal-share-btn'
      ) as HTMLElement;
      if (shareBtn) {
        shareBtn.click();
      }
    },
    onToggleFavorite:
      accessToken && !isTogglingFavorite ? handleToggleFavorite : undefined,
    images,
    currentImageIndex,
    isEnabled: true,
    isModalOpen: true, // Modal is open when this hook is used
  });

  return {
    views,
    downloads,
    isFavorited,
    isTogglingFavorite,
    modalPlaceholderSrc,
    modalImageSrc,
    isModalImageLoaded,
    setIsModalImageLoaded,
    handleToggleFavorite,
    handleDownload,
    currentImageIndex,
    user,
  };
};

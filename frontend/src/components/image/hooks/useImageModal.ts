import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Image } from '@/types/image';
import { imageService } from '@/services/imageService';
import { favoriteService } from '@/services/favoriteService';
import { useAuthStore } from '@/stores/useAuthStore';
import { toast } from 'sonner';

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
  const navigate = useNavigate();
  const [views, setViews] = useState<number>(image.views || 0);
  const [downloads, setDownloads] = useState<number>(image.downloads || 0);
  const [isFavorited, setIsFavorited] = useState<boolean>(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState<boolean>(false);
  const [modalImageSrc, setModalImageSrc] = useState<string>('');
  const [isModalImageLoaded, setIsModalImageLoaded] = useState(false);
  const incrementedViewIds = useRef<Set<string>>(new Set());
  const currentImageIdRef = useRef<string | null>(null);

  // Memoize current image index to avoid recalculation
  const currentImageIndex = useMemo(() => {
    return images.findIndex(img => img._id === image._id);
  }, [images, image._id]);

  // Reset stats and update modal image when image changes
  useEffect(() => {
    setViews(image.views || 0);
    setDownloads(image.downloads || 0);
    currentImageIdRef.current = image._id;

    // Reset modal image state and start progressive loading
    setIsModalImageLoaded(false);
    // Start with regularUrl (1080px) for better performance, fallback to smallUrl or imageUrl
    const initialSrc = image.regularUrl || image.smallUrl || image.imageUrl;
    setModalImageSrc(initialSrc);

    // If we have a full-size imageUrl and it's different from initial, preload it in background
    if (image.imageUrl && image.imageUrl !== initialSrc && (image.regularUrl || image.smallUrl)) {
      const fullSizeImg = new Image();
      fullSizeImg.onload = () => {
        // Upgrade to full size after initial load completes
        if (currentImageIdRef.current === image._id) {
          setModalImageSrc(image.imageUrl);
        }
      };
      fullSizeImg.src = image.imageUrl;
    }

    // Check favorite status when image changes (only if user is logged in)
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
  }, [image._id, image.regularUrl, image.smallUrl, image.imageUrl, accessToken]);

  // Increment view count when modal opens (only once per image)
  useEffect(() => {
    const imageId = image._id;
    // Only increment if we haven't incremented for this image ID before
    if (imageId && !incrementedViewIds.current.has(imageId)) {
      incrementedViewIds.current.add(imageId);
      imageService.incrementView(imageId)
        .then((response) => {
          setViews(response.views);
          // Update the image in the parent component and store
          // Use the current image from the ref to avoid stale closure
          const currentImage = image;
          if (onImageSelect && currentImage) {
            // Merge dailyViews to ensure we have all historical data
            const mergedDailyViews = {
              ...(currentImage.dailyViews || {}),
              ...(response.dailyViews || {})
            };
            onImageSelect({
              ...currentImage,
              views: response.views,
              dailyViews: mergedDailyViews
            });
          }
        })
        .catch((error) => {
          console.error('Failed to increment view:', error);
          // Remove from set on error so it can be retried
          incrementedViewIds.current.delete(imageId);
        });
    }
    // Only depend on image._id to avoid re-running when image object changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image._id]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      // Close modal on Escape
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Only handle shortcuts when modal is open (not typing in inputs)
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Arrow keys for navigation (if multiple images)
      if (e.key === 'ArrowLeft' && images.length > 1) {
        if (currentImageIndex > 0) {
          onImageSelect(images[currentImageIndex - 1]);
        }
        e.preventDefault();
        return;
      }

      if (e.key === 'ArrowRight' && images.length > 1) {
        if (currentImageIndex < images.length - 1) {
          onImageSelect(images[currentImageIndex + 1]);
        }
        e.preventDefault();
        return;
      }

      // Download with Ctrl/Cmd + D
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        const downloadBtn = document.querySelector('.modal-download-btn') as HTMLElement;
        if (downloadBtn) {
          downloadBtn.click();
        }
        return;
      }

      // Share with Ctrl/Cmd + S
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        // This will be handled by the share component
        const shareBtn = document.querySelector('.modal-share-btn') as HTMLElement;
        if (shareBtn) {
          shareBtn.click();
        }
        return;
      }

      // Toggle favorite with F
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        if (accessToken && !isTogglingFavorite) {
          handleToggleFavorite();
        }
        return;
      }
    };

    // Handle wheel events to scroll modal content when scrolling on overlay or anywhere
    const handleWheel = (e: Event) => {
      const modalContent = document.querySelector('.image-modal-content') as HTMLElement;
      if (!modalContent) return;

      const wheelEvent = e as WheelEvent;
      const target = e.target as HTMLElement;

      // Don't interfere if scrolling inside the modal content itself
      if (modalContent.contains(target)) {
        return;
      }

      // Prevent default scrolling
      wheelEvent.preventDefault();

      // Scroll the modal content instead
      modalContent.scrollTop += wheelEvent.deltaY;
    };

    document.addEventListener('keydown', handleKeyboard);
    // Prevent page/body scrolling when modal is open
    document.body.style.overflow = 'hidden';
    // Prevent scrolling on the image grid container
    const gridContainer = document.querySelector('.image-grid-container');
    if (gridContainer) {
      (gridContainer as HTMLElement).style.overflow = 'hidden';
    }

    // Add wheel event listener to document to catch all scroll events
    document.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      document.removeEventListener('keydown', handleKeyboard);
      document.removeEventListener('wheel', handleWheel);
      document.body.style.overflow = '';
      const gridContainer = document.querySelector('.image-grid-container');
      if (gridContainer) {
        (gridContainer as HTMLElement).style.overflow = '';
      }
    };
  }, [onClose, images, currentImageIndex, onImageSelect, accessToken, isTogglingFavorite]);

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

  // Handle download with increment
  const handleDownload = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    // Increment download count
    try {
      const response = await imageService.incrementDownload(image._id);
      setDownloads(response.downloads);
      // Update the image in the parent component and store
      if (onImageSelect) {
        onImageSelect({
          ...image,
          downloads: response.downloads,
          dailyDownloads: response.dailyDownloads || image.dailyDownloads
        });
      }
    } catch (error) {
      console.error('Failed to increment download:', error);
    }
    // Then trigger the download
    onDownload(image, e);
  }, [image, onImageSelect, onDownload]);

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


import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  MapPin,
  ExternalLink,
  ImageOff,
  Heart,
  Edit2,
  ChevronDown,
  X,
  FolderPlus,
  Tag,
} from 'lucide-react';
import type { Image } from '@/types/image';
import ProgressiveImage from './ProgressiveImage';
import { imageService } from '@/services/imageService';
import { useAuthStore } from '@/stores/useAuthStore';
import { toast } from 'sonner';
import EditImageModal from './EditImageModal';
import { useImageModal } from './image/hooks/useImageModal';
import { useInfiniteScroll } from './image/hooks/useInfiniteScroll';
import { useImageZoom } from './image/hooks/useImageZoom';
import { ImageModalInfo } from './image/ImageModalInfo';
import { ImageModalShare } from './image/ImageModalShare';
import { Avatar } from './Avatar';
import { useFormattedDate } from '@/hooks/useFormattedDate';
import CollectionModal from './CollectionModal';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { useImageStore } from '@/stores/useImageStore';
import ReportButton from './ReportButton';
import { FollowButton } from './FollowButton';
import './ImageModal.css';

interface ImageModalProps {
  image: Image;
  images: Image[];
  onClose: () => void;
  onImageSelect: (image: Image) => void;
  onDownload: (image: Image, e: React.MouseEvent) => void;
  imageTypes: Map<string, 'portrait' | 'landscape'>;
  onImageLoad: (imageId: string, img: HTMLImageElement) => void;
  currentImageIds: Set<string>;
  processedImages: React.MutableRefObject<Set<string>>;
  renderAsPage?: boolean; // When true, renders as page (no overlay)
}

const ImageModal = ({
  image,
  images,
  onClose,
  onImageSelect,
  onDownload,
  imageTypes,
  onImageLoad,
  currentImageIds,
  processedImages,
  renderAsPage = false,
}: ImageModalProps) => {
  const modalContentRef = useRef<HTMLDivElement>(null);
  const [relatedImagesLimit, setRelatedImagesLimit] = useState(12);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUserProfileCard, setShowUserProfileCard] = useState(false);
  const [isClosingProfileCard, setIsClosingProfileCard] = useState(false);
  const [userImages, setUserImages] = useState<Image[]>([]);
  const [isLoadingUserImages, setIsLoadingUserImages] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const userInfoRef = useRef<HTMLDivElement>(null);
  const userProfileCardRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // Image zoom functionality
  const {
    zoom,
    pan,
    isZoomed,
    containerRef: zoomContainerRef,
    imageRef: zoomImageRef,
    zoomIn,
    zoomOut,
    resetZoom,
    handleDoubleClick,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = useImageZoom({
    minZoom: 1,
    maxZoom: 5,
    zoomStep: 0.25,
    doubleClickZoom: 2,
  });

  // Use the custom hook for modal state and logic
  const {
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
  } = useImageModal({
    image,
    images,
    onImageSelect,
    onClose,
    onDownload,
  });

  // Add zoom keyboard shortcuts
  useEffect(() => {
    if (!isZoomed && zoom === 1) return;

    const handleKeyboard = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomIn();
      } else if (e.key === '-') {
        e.preventDefault();
        zoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        resetZoom();
      }
    };

    document.addEventListener('keydown', handleKeyboard);
    return () => document.removeEventListener('keydown', handleKeyboard);
  }, [isZoomed, zoom, zoomIn, zoomOut, resetZoom]);

  // Lock body scroll when modal is open (only when rendered as modal, not page)
  useEffect(() => {
    if (!renderAsPage) {
      // Store current scroll position
      const scrollY = window.scrollY;
      
      // Calculate scrollbar width to prevent layout shift
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      
      // Use both overflow hidden AND position fixed for maximum scroll prevention
      // This ensures scroll is prevented on all browsers and devices
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
      // Add class to body to indicate modal is open (for other components to check)
      document.body.classList.add('image-modal-open');
      // Add padding to compensate for scrollbar to prevent layout shift
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }

      // Prevent scroll events on overlay and redirect to modal content
      const handleOverlayWheel = (e: WheelEvent) => {
        e.preventDefault();
        e.stopPropagation();
        // Redirect scroll to modal content if it exists
        const modalContent = document.querySelector('.image-modal-content') as HTMLElement;
        if (modalContent) {
          const delta = e.deltaY;
          modalContent.scrollTop += delta;
        }
      };

      // Prevent touch scrolling on overlay
      const handleOverlayTouchMove = (e: TouchEvent) => {
        const target = e.target as HTMLElement;
        // Allow touch scrolling within modal content
        if (target.closest('.image-modal-content')) {
          return;
        }
        e.preventDefault();
      };

      // Prevent scroll events from reaching body - more aggressive approach
      const preventBodyScroll = (e: Event) => {
        const target = e.target as HTMLElement;
        // Allow scrolling within modal content only
        const modalContent = target.closest('.image-modal-content');
        if (modalContent) {
          // Check if the scroll event is actually on the modal content element
          if (target === modalContent || modalContent.contains(target)) {
            return; // Allow this scroll
          }
        }
        // Prevent all other scrolling - be aggressive
        e.preventDefault();
        e.stopPropagation();
        return false;
      };

      // Prevent scroll events on document and window
      const preventScroll = (e: Event) => {
        const target = e.target as HTMLElement;
        // Only allow scrolling within modal content
        const modalContent = target.closest('.image-modal-content');
        if (modalContent) {
          // Check if the scroll event is actually on the modal content element
          if (target === modalContent || modalContent.contains(target)) {
            return; // Allow this scroll
          }
        }
        // Prevent everything else
        e.preventDefault();
        e.stopPropagation();
        return false;
      };
      
      // Additional handler specifically for scroll events (not wheel/touch)
      const preventScrollEvent = (e: Event) => {
        // For scroll events, we need to check if it's the window/document scrolling
        // If it's not the modal content scrolling, prevent it
        const target = e.target as HTMLElement;
        if (target === document || target === document.documentElement || target === document.body) {
          // This is a body/document scroll - prevent it
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
        // Allow scroll events within modal content
        if (target.closest('.image-modal-content')) {
          return;
        }
        // Prevent all other scroll events
        e.preventDefault();
        e.stopPropagation();
        return false;
      };

      // Wait for overlay to be rendered
      const timer = setTimeout(() => {
        const overlay = document.querySelector('.image-modal-overlay') as HTMLElement;
        if (overlay) {
          overlay.addEventListener('wheel', handleOverlayWheel, { passive: false });
          overlay.addEventListener('touchmove', handleOverlayTouchMove, { passive: false });
        }
      }, 0);

      // Prevent scroll events at multiple levels - use capture phase to catch early
      // Use preventScrollEvent for scroll events specifically
      document.addEventListener('scroll', preventScrollEvent, { passive: false, capture: true });
      document.documentElement.addEventListener('scroll', preventScrollEvent, { passive: false, capture: true });
      document.body.addEventListener('scroll', preventScrollEvent, { passive: false, capture: true });
      window.addEventListener('scroll', preventScrollEvent, { passive: false, capture: true });
      
      // Use preventScroll for wheel and touchmove
      document.addEventListener('wheel', preventScroll, { passive: false, capture: true });
      document.addEventListener('touchmove', preventScroll, { passive: false, capture: true });
      window.addEventListener('wheel', preventBodyScroll, { passive: false, capture: true });
      window.addEventListener('touchmove', preventBodyScroll, { passive: false, capture: true });
      
      // Also prevent on body and documentElement directly
      document.body.addEventListener('wheel', preventScroll, { passive: false, capture: true });
      document.body.addEventListener('touchmove', preventScroll, { passive: false, capture: true });
      document.documentElement.addEventListener('wheel', preventScroll, { passive: false, capture: true });
      document.documentElement.addEventListener('touchmove', preventScroll, { passive: false, capture: true });

      // Prevent keyboard scrolling on body (but allow in modal content)
      const handleKeyboardScroll = (e: KeyboardEvent) => {
        const target = e.target as HTMLElement;
        // Allow keyboard scrolling within modal content and input fields
        if (target.closest('.image-modal-content') ||
            target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable) {
          return;
        }
        
        // Prevent keyboard scrolling on body
        if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key)) {
          e.preventDefault();
        }
      };

      document.addEventListener('keydown', handleKeyboardScroll, { passive: false });

      // Cleanup
      return () => {
        clearTimeout(timer);
        const overlay = document.querySelector('.image-modal-overlay') as HTMLElement;
        if (overlay) {
          overlay.removeEventListener('wheel', handleOverlayWheel);
          overlay.removeEventListener('touchmove', handleOverlayTouchMove);
        }
        
        document.removeEventListener('scroll', preventScrollEvent, { capture: true } as EventListenerOptions);
        document.documentElement.removeEventListener('scroll', preventScrollEvent, { capture: true } as EventListenerOptions);
        document.body.removeEventListener('scroll', preventScrollEvent, { capture: true } as EventListenerOptions);
        window.removeEventListener('scroll', preventScrollEvent, { capture: true } as EventListenerOptions);
        document.removeEventListener('wheel', preventScroll, { capture: true } as EventListenerOptions);
        document.removeEventListener('touchmove', preventScroll, { capture: true } as EventListenerOptions);
        window.removeEventListener('wheel', preventBodyScroll, { capture: true } as EventListenerOptions);
        window.removeEventListener('touchmove', preventBodyScroll, { capture: true } as EventListenerOptions);
        document.body.removeEventListener('wheel', preventScroll, { capture: true } as EventListenerOptions);
        document.body.removeEventListener('touchmove', preventScroll, { capture: true } as EventListenerOptions);
        document.documentElement.removeEventListener('wheel', preventScroll, { capture: true } as EventListenerOptions);
        document.documentElement.removeEventListener('touchmove', preventScroll, { capture: true } as EventListenerOptions);
        document.removeEventListener('keydown', handleKeyboardScroll);

        // Restore body scrolling
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.width = '';
        document.body.classList.remove('image-modal-open');
        document.body.style.paddingRight = '';
        
        // Restore scroll position
        window.scrollTo(0, scrollY);
      };
    }
  }, [renderAsPage]);

  // Use the custom hook for formatted date
  const formattedDate = useFormattedDate(image.createdAt, {
    locale: 'vi-VN',
    format: 'long',
  });

  // Fetch user images when hovering over user info
  useEffect(() => {
    if (!showUserProfileCard || !image.uploadedBy._id) return;

    let isMounted = true;
    setIsLoadingUserImages(true);

    const fetchUserImages = async () => {
      try {
        const response = await imageService.fetchUserImages(image.uploadedBy._id, { limit: 3 });
        if (isMounted) {
          // Exclude current image from the list
          const otherImages = (response.images || []).filter(
            (img: Image) => img._id !== image._id
          ).slice(0, 3);
          setUserImages(otherImages);
        }
      } catch (error) {
        console.error('Failed to fetch user images:', error);
        if (isMounted) {
          setUserImages([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingUserImages(false);
        }
      }
    };

    fetchUserImages();

    return () => {
      isMounted = false;
    };
  }, [showUserProfileCard, image.uploadedBy._id, image._id]);

  // Close user profile card when clicking outside
  useEffect(() => {
    if (!showUserProfileCard) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Clear hover timeout if any
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }

      // Close if click is outside both user info and profile card
      const isInsideUserInfo = userInfoRef.current?.contains(target);
      const isInsideProfileCard = userProfileCardRef.current?.contains(target);

      if (!isInsideUserInfo && !isInsideProfileCard) {
        setIsClosingProfileCard(true);
        // Wait for fade-out animation before actually hiding
        setTimeout(() => {
          setShowUserProfileCard(false);
          setIsClosingProfileCard(false);
        }, 250); // Match CSS transition duration
      }
    };

    // Add listener immediately - clicks outside should always close
    document.addEventListener('mousedown', handleClickOutside, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [showUserProfileCard]);

  // Use a timeout to handle mouse leave with a small delay (to allow moving to the card)
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsClosingProfileCard(false);
    setShowUserProfileCard(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    // Add a delay before closing to allow moving to the card
    // Increased delay for smoother UX
    hoverTimeoutRef.current = setTimeout(() => {
      setIsClosingProfileCard(true);
      // Wait for fade-out animation before actually hiding
      setTimeout(() => {
        setShowUserProfileCard(false);
        setIsClosingProfileCard(false);
      }, 250); // Match CSS transition duration
    }, 200);
  }, []);

  // Handle view profile navigation
  const handleViewProfile = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    // Clear any pending hover timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    // Close card immediately
    setShowUserProfileCard(false);
    // Small delay to ensure card is closed before navigation
    setTimeout(() => {
      // Navigate to user's profile using username or userId
      if (image.uploadedBy?.username) {
        navigate(`/profile/${image.uploadedBy.username}`);
        onClose(); // Close modal when navigating to profile
      } else if (image.uploadedBy?._id) {
        navigate(`/profile/user/${image.uploadedBy._id}`);
        onClose();
      }
    }, 50);
  }, [navigate, image.uploadedBy, onClose]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Get related images with improved algorithm (same photographer, location, category, title similarity)
  const { relatedImages, hasMoreRelatedImages } = useMemo(() => {
    if (!image || images.length === 0) {
      return { relatedImages: [], hasMoreRelatedImages: false };
    }

    // Get current image properties
    const currentCategoryId = typeof image.imageCategory === 'string'
      ? image.imageCategory
      : image.imageCategory?._id;
    const currentPhotographerId = image.uploadedBy?._id || image.uploadedBy;
    const currentLocation = image.location?.toLowerCase().trim();
    const currentTitle = image.imageTitle?.toLowerCase().trim() || '';

    // Calculate relevance score for each image
    const scoredImages = images
      .filter(img => img._id !== image._id) // Exclude current image
      .map(img => {
        let score = 0;
        const reasons: string[] = []; // Track why images are related (for debugging)

        // Same photographer (highest priority - 100 points)
        const imgPhotographerId = img.uploadedBy?._id || img.uploadedBy;
        if (currentPhotographerId && imgPhotographerId &&
          String(currentPhotographerId) === String(imgPhotographerId)) {
          score += 100;
          reasons.push('same photographer');
        }

        // Same location (high priority - 50 points)
        const imgLocation = img.location?.toLowerCase().trim();
        if (currentLocation && imgLocation && currentLocation === imgLocation) {
          score += 50;
          reasons.push('same location');
        }

        // Same category (medium priority - 30 points, but only if we have other matches)
        const imgCategoryId = typeof img.imageCategory === 'string'
          ? img.imageCategory
          : img.imageCategory?._id;
        if (currentCategoryId && imgCategoryId &&
          String(currentCategoryId) === String(imgCategoryId)) {
          score += 30;
          reasons.push('same category');
        }

        // Title similarity (low priority - up to 20 points)
        const imgTitle = img.imageTitle?.toLowerCase().trim() || '';
        if (currentTitle && imgTitle) {
          // Check for common words
          const currentWords = currentTitle.split(/\s+/).filter(w => w.length > 2);
          const imgWords = imgTitle.split(/\s+/).filter(w => w.length > 2);
          const commonWords = currentWords.filter(w => imgWords.includes(w));
          if (commonWords.length > 0) {
            score += Math.min(commonWords.length * 5, 20);
            reasons.push(`title similarity (${commonWords.length} words)`);
          }
        }

        return { image: img, score, reasons };
      })
      // Require minimum score threshold - only show images with meaningful relevance
      // Minimum 30 points means: same category OR same location OR title similarity + category
      // This prevents showing completely unrelated images while still showing category matches
      .filter(item => item.score >= 30)
      .sort((a, b) => b.score - a.score) // Sort by score descending
      .map(item => item.image); // Extract just the images

    // Use scored images if we have any matches
    // Prioritize higher-scored images (same photographer, location) over category-only matches
    let filtered: Image[];
    if (scoredImages.length > 0) {
      // If we have highly relevant images (score >= 50), prioritize those
      // Otherwise, show category matches (score >= 30) which are still somewhat relevant
      filtered = scoredImages;
    } else {
      // If no matches at all, don't show related images
      filtered = [];
    }

    // Return limited images for infinite scroll and check if more available
    return {
      relatedImages: filtered.slice(0, relatedImagesLimit),
      hasMoreRelatedImages: filtered.length > relatedImagesLimit,
    };
  }, [image, images, relatedImagesLimit]);

  // State for tracking loading status separately to avoid circular dependency
  const [isLoadingRelatedImages, setIsLoadingRelatedImages] = useState(false);

  // Load more related images handler
  const handleLoadMoreRelatedImages = useCallback(async () => {
    setIsLoadingRelatedImages(true);
    setRelatedImagesLimit(prev => prev + 12);
    // Reset loading state after a delay
    setTimeout(() => setIsLoadingRelatedImages(false), 300);
  }, []);

  // Infinite scroll for related images (modal content scrolling)
  const { loadMoreRef: relatedImagesLoadMoreRef } = useInfiniteScroll({
    hasMore: hasMoreRelatedImages,
    isLoading: isLoadingRelatedImages,
    onLoadMore: handleLoadMoreRelatedImages,
    root: modalContentRef.current,
    rootMargin: '200px',
    delay: 300,
  });

  return (
    <>
      {!renderAsPage && (
        <div
          className="image-modal-overlay"
          onClick={onClose}
        />
      )}
      <div
        className={`image-modal ${renderAsPage ? 'image-modal-page' : ''}`}
        onClick={(e) => !renderAsPage && e.stopPropagation()}
        onWheel={(e) => {
          // Prevent scroll events from bubbling to body
          if (!renderAsPage) {
            e.stopPropagation();
            // If scrolling on modal (not content), redirect to content
            const target = e.target as HTMLElement;
            if (!target.closest('.image-modal-content')) {
              e.preventDefault();
              const modalContent = modalContentRef.current;
              if (modalContent) {
                modalContent.scrollTop += e.deltaY;
              }
            }
          }
        }}
      >
        {/* Modal Header */}
        <div className="image-modal-header">
          {/* Left: User Info */}
          <div
            className="modal-header-left clickable-user-info"
            ref={userInfoRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={() => {
              if (image.uploadedBy?.username) {
                navigate(`/profile/${image.uploadedBy.username}`);
                onClose(); // Close modal when navigating to profile
              } else if (image.uploadedBy?._id) {
                navigate(`/profile/user/${image.uploadedBy._id}`);
                onClose();
              }
            }}
            style={{ position: 'relative', cursor: 'pointer', willChange: 'opacity' }}
            title="Xem hồ sơ"
          >
            <Avatar
              user={image.uploadedBy}
              size={40}
              className="modal-user-avatar"
              fallbackClassName="modal-user-avatar-placeholder"
            />
            <div className="modal-user-info">
              <div
                className="modal-user-name hoverable"
                style={{ cursor: 'pointer' }}
              >
                {image.uploadedBy.displayName?.trim() || image.uploadedBy.username}
                <CheckCircle2 className="verified-badge" size={16} />
              </div>
              <div className="modal-user-status">Sẵn sàng nhận việc</div>
            </div>

            {/* User Profile Card */}
            {showUserProfileCard && (
              <div
                ref={userProfileCardRef}
                className={`user-profile-card ${isClosingProfileCard ? 'closing' : ''}`}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <div className="user-profile-card-header">
                  <div className="user-profile-card-avatar-section">
                    <Avatar
                      user={image.uploadedBy}
                      size={48}
                      className="user-profile-card-avatar"
                      fallbackClassName="user-profile-card-avatar-placeholder"
                    />
                    <div className="user-profile-card-name-section">
                      <div className="user-profile-card-name">
                        {image.uploadedBy.displayName?.trim() || image.uploadedBy.username}
                      </div>
                      <div className="user-profile-card-username">{image.uploadedBy.username}</div>
                    </div>
                  </div>
                  {user && user._id !== image.uploadedBy._id && (
                    <div className="user-profile-card-follow">
                      <FollowButton
                        userId={image.uploadedBy._id}
                        userDisplayName={image.uploadedBy.displayName || image.uploadedBy.username}
                        variant="default"
                        size="sm"
                      />
                    </div>
                  )}
                </div>

                {isLoadingUserImages && userImages.length === 0 ? (
                  <div className="user-profile-card-loading">
                    <div className="loading-spinner-small" />
                  </div>
                ) : userImages.length > 0 ? (
                  <div className="user-profile-card-images">
                    {userImages.map((userImage) => (
                      <div
                        key={userImage._id}
                        className="user-profile-card-image-item"
                        onClick={() => {
                          setShowUserProfileCard(false);
                          onImageSelect(userImage);
                          // Scroll to top instantly to show the new image (like Unsplash)
                          if (modalContentRef.current) {
                            modalContentRef.current.scrollTo({ top: 0, behavior: 'auto' });
                          }
                        }}
                      >
                        <img
                          src={userImage.thumbnailUrl || userImage.smallUrl || userImage.imageUrl}
                          alt={userImage.imageTitle || 'Photo'}
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                ) : null}

                <button
                  className="user-profile-card-view-btn"
                  onClick={handleViewProfile}
                >
                  Xem hồ sơ
                </button>
              </div>
            )}
          </div>

          {/* Right: Download Button and Close Button */}
          <div className="modal-header-right">
            <button
              className="modal-download-btn"
              onClick={handleDownload}
              title="Tải xuống (Ctrl/Cmd + D)"
            >
              <span>Tải xuống</span>
              <ChevronDown size={16} />
              <kbd className="keyboard-hint">⌘D</kbd>
            </button>
            <button
              className="modal-close-btn-header"
              onClick={onClose}
              title="Đóng (Esc)"
              aria-label="Đóng"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Modal Image Content - Scrollable */}
        <div
          className="image-modal-content"
          ref={modalContentRef}
        >
          {/* Main Image with Zoom */}
          <div
            className="modal-main-image-container"
            ref={zoomContainerRef}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            style={{
              cursor: isZoomed ? (zoom > 1 ? 'grab' : 'default') : 'zoom-in',
              userSelect: 'none',
              touchAction: 'none',
            }}
          >
            <div
              className="modal-image-wrapper"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: 'center center',
                transition: zoom === 1 ? 'transform 0.3s ease' : 'none',
              }}
            >
              {image.imageAvifUrl || image.regularAvifUrl || image.smallAvifUrl || image.thumbnailAvifUrl ? (
                <picture>
                  {/* AVIF sources with responsive sizes */}
                  <source
                    srcSet={
                      image.thumbnailAvifUrl && image.smallAvifUrl && image.regularAvifUrl && image.imageAvifUrl
                        ? `${image.thumbnailAvifUrl} 200w, ${image.smallAvifUrl} 800w, ${image.regularAvifUrl} 1080w, ${image.imageAvifUrl} 1920w`
                        : image.regularAvifUrl || image.imageAvifUrl || ''
                    }
                    type="image/avif"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 98vw, 1920px"
                  />
                  {/* WebP sources with responsive sizes (fallback) */}
                  <source
                    srcSet={
                      image.thumbnailUrl && image.smallUrl && image.regularUrl && image.imageUrl
                        ? `${image.thumbnailUrl} 200w, ${image.smallUrl} 800w, ${image.regularUrl} 1080w, ${image.imageUrl} 1920w`
                        : undefined
                    }
                    type="image/webp"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 98vw, 1920px"
                  />
                  {/* Fallback img element with blur-up technique */}
                  <img
                    ref={zoomImageRef}
                    src={modalImageSrc || image.regularUrl || image.smallUrl || image.imageUrl}
                    alt={image.imageTitle || 'Photo'}
                    style={{
                      backgroundImage: modalPlaceholderSrc
                        ? `url("${modalPlaceholderSrc}")`
                        : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundColor: '#f0f0f0', // Fallback color while placeholder loads
                    }}
                    className={`modal-image ${isModalImageLoaded ? 'loaded' : 'loading'} ${(imageTypes.get(image._id) || 'landscape') === 'landscape' ? 'landscape' : 'portrait'}`}
                    loading="eager"
                    decoding="async"
                    fetchPriority="high"
                    crossOrigin="anonymous"
                    onDoubleClick={handleDoubleClick}
                    draggable={false}
                    onLoad={(e) => {
                      setIsModalImageLoaded(true);
                      // Update class if orientation was misdetected
                      const img = e.currentTarget;
                      const isPortraitImg = img.naturalHeight > img.naturalWidth;
                      const currentType = imageTypes.get(image._id) || 'landscape';
                      const shouldBePortrait = isPortraitImg;
                      if (shouldBePortrait !== (currentType === 'portrait')) {
                        img.classList.toggle('landscape', !shouldBePortrait);
                        img.classList.toggle('portrait', shouldBePortrait);
                      }
                    }}
                  />
                </picture>
              ) : (
                <img
                  ref={zoomImageRef}
                  src={modalImageSrc || image.regularUrl || image.smallUrl || image.imageUrl}
                  srcSet={
                    image.thumbnailUrl && image.smallUrl && image.regularUrl && image.imageUrl
                      ? `${image.thumbnailUrl} 200w, ${image.smallUrl} 800w, ${image.regularUrl} 1080w, ${image.imageUrl} 1920w`
                      : undefined
                  }
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 98vw, 1920px"
                  alt={image.imageTitle || 'Photo'}
                  style={{
                    backgroundImage: modalPlaceholderSrc
                      ? `url("${modalPlaceholderSrc}")`
                      : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundColor: '#f0f0f0', // Fallback color while placeholder loads
                  }}
                  className={`modal-image ${isModalImageLoaded ? 'loaded' : 'loading'} ${(imageTypes.get(image._id) || 'landscape') === 'landscape' ? 'landscape' : 'portrait'}`}
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                  crossOrigin="anonymous"
                  onDoubleClick={handleDoubleClick}
                  draggable={false}
                  onLoad={(e) => {
                    setIsModalImageLoaded(true);
                    // Update class if orientation was misdetected
                    const img = e.currentTarget;
                    const isPortraitImg = img.naturalHeight > img.naturalWidth;
                    const currentType = imageTypes.get(image._id) || 'landscape';
                    const shouldBePortrait = isPortraitImg;
                    if (shouldBePortrait !== (currentType === 'portrait')) {
                      img.classList.toggle('landscape', !shouldBePortrait);
                      img.classList.toggle('portrait', shouldBePortrait);
                    }
                  }}
                />
              )}
            </div>

            {/* Zoom Controls */}
            {isZoomed && (
              <div className="modal-zoom-controls">
                <button
                  className="modal-zoom-btn"
                  onClick={zoomOut}
                  title="Thu nhỏ"
                  aria-label="Thu nhỏ"
                >
                  <ZoomOut size={18} />
                </button>
                <span className="modal-zoom-level">{Math.round(zoom * 100)}%</span>
                <button
                  className="modal-zoom-btn"
                  onClick={zoomIn}
                  disabled={zoom >= 5}
                  title="Phóng to"
                  aria-label="Phóng to"
                >
                  <ZoomIn size={18} />
                </button>
                <button
                  className="modal-zoom-btn"
                  onClick={resetZoom}
                  title="Đặt lại (Esc)"
                  aria-label="Đặt lại zoom"
                >
                  <RotateCcw size={18} />
                </button>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="image-modal-footer">
            {/* Left: Stats */}
            <div className="modal-footer-left">
              <div className="modal-footer-left-stats">
                <div className="modal-stat">
                  <span className="stat-label">Lượt xem</span>
                  <span className="stat-value">{views.toLocaleString()}</span>
                </div>
                <div className="modal-stat">
                  <span className="stat-label">Lượt tải</span>
                  <span className="stat-value">{downloads.toLocaleString()}</span>
                </div>
              </div>
              {/* Image Info */}
              <div className="modal-image-info">
                {image.imageTitle && (
                  <div className="image-info-title">{image.imageTitle}</div>
                )}
                {(image.location || image.cameraModel) && (
                  <div className="image-info-details">
                    {image.location && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={14} style={{ flexShrink: 0 }} />
                        {image.coordinates ? (
                          <a
                            href={`https://www.google.com/maps?q=${image.coordinates.latitude},${image.coordinates.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              color: 'inherit',
                              textDecoration: 'none',
                              transition: 'opacity 0.2s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                            title="Xem trên Google Maps"
                          >
                            {image.location}
                            <ExternalLink size={12} style={{ flexShrink: 0, opacity: 0.7 }} />
                          </a>
                        ) : (
                          <span>{image.location}</span>
                        )}
                      </span>
                    )}
                    {image.location && image.cameraModel && <span> • </span>}
                    {image.cameraModel && <span>{image.cameraModel}</span>}
                  </div>
                )}
                {formattedDate && (
                  <div className="image-info-date">
                    {formattedDate}
                  </div>
                )}
                {/* Debug: Uncomment to check tags in console */}
                {/* {console.log('Image tags debug:', image.tags, 'Type:', typeof image.tags, 'Is Array:', Array.isArray(image.tags))} */}
                {image.tags && Array.isArray(image.tags) && image.tags.length > 0 && (
                  <div className="image-info-tags">
                    <div className="image-info-tags-list">
                      {image.tags.map((tag, index) => (
                        <button
                          key={index}
                          type="button"
                          className="image-info-tag"
                          onClick={() => {
                            onClose();
                            navigate('/');
                            setTimeout(() => {
                              useImageStore.getState().fetchImages({ tag });
                            }, 100);
                          }}
                          title={`Tìm kiếm: ${tag}`}
                        >
                          <Tag size={12} />
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Actions */}
            <div className="modal-footer-right">
              {user && (
                <button
                  className={`modal-footer-btn ${isFavorited ? 'favorited' : ''}`}
                  onClick={handleToggleFavorite}
                  disabled={isTogglingFavorite}
                  aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                  title={`${isFavorited ? 'Bỏ yêu thích' : 'Yêu thích'} (F)`}
                >
                  <Heart
                    size={18}
                    fill={isFavorited ? 'currentColor' : 'none'}
                    className={isFavorited ? 'favorite-icon-filled' : ''}
                  />
                  <span>{isFavorited ? 'Đã lưu' : 'Lưu'}</span>
                  <kbd className="keyboard-hint">F</kbd>
                </button>
              )}
              {user && (
                <button
                  className="modal-footer-btn"
                  onClick={() => setShowCollectionModal(true)}
                  aria-label="Save to collection"
                  title="Lưu vào bộ sưu tập"
                >
                  <FolderPlus size={18} />
                  <span>Bộ sưu tập</span>
                </button>
              )}
              <ImageModalShare image={image} />
              <ImageModalInfo
                image={image}
                onTagClick={(tag: string) => {
                  // Navigate to homepage and search by tag
                  onClose();
                  navigate('/');
                  setTimeout(() => {
                    useImageStore.getState().fetchImages({ tag });
                  }, 100);
                }}
              />
              {user && user._id !== image.uploadedBy._id && (
                <ReportButton
                  type="image"
                  targetId={image._id}
                  targetName={image.imageTitle}
                  className="modal-footer-btn"
                />
              )}
              {user && (user._id === image.uploadedBy._id || user.isAdmin || user.isSuperAdmin) && (
                <button
                  className="modal-footer-btn"
                  onClick={() => setShowEditModal(true)}
                  aria-label="Edit image"
                  title="Edit image"
                >
                  <Edit2 size={18} />
                </button>
              )}
            </div>
          </div>

          {/* Related Images Section */}
          <div className="modal-related-images">
            <h3 className="related-images-title">Các ảnh cùng chủ đề</h3>
            {relatedImages.length > 0 ? (
              <>
                <div className="related-images-grid">
                  {relatedImages.map((relatedImage) => {
                    const imageType = imageTypes.get(relatedImage._id) || 'landscape';
                    return (
                      <div
                        key={relatedImage._id}
                        className={`related-image-item ${imageType}`}
                        onClick={() => {
                          onImageSelect(relatedImage);
                          // Scroll to top instantly to show the new image (like Unsplash)
                          if (modalContentRef.current) {
                            modalContentRef.current.scrollTo({ top: 0, behavior: 'auto' });
                          }
                        }}
                      >
                        <ProgressiveImage
                          src={relatedImage.imageUrl}
                          thumbnailUrl={relatedImage.thumbnailUrl}
                          smallUrl={relatedImage.smallUrl}
                          regularUrl={relatedImage.regularUrl}
                          alt={relatedImage.imageTitle || 'Photo'}
                          onLoad={(img) => {
                            if (!processedImages.current.has(relatedImage._id) && currentImageIds.has(relatedImage._id)) {
                              onImageLoad(relatedImage._id, img);
                            }
                          }}
                        />
                        <div className="related-image-overlay">
                          <span className="related-image-title">{relatedImage.imageTitle}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Infinite scroll trigger for related images */}
                {hasMoreRelatedImages && (
                  <div ref={relatedImagesLoadMoreRef} className="related-images-load-more-trigger" />
                )}
                {isLoadingRelatedImages && (
                  <div className="related-images-loading">
                    <div className="loading-spinner" />
                    <p>Đang tải ảnh...</p>
                  </div>
                )}
              </>
            ) : (
              <div className="related-images-empty">
                <div className="related-images-empty-icon">
                  <ImageOff size={48} />
                </div>
                <p className="related-images-empty-text">Không có ảnh liên quan</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Image Modal */}
      <EditImageModal
        image={image}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onUpdate={(updatedImage) => {
          onImageSelect(updatedImage);
          setShowEditModal(false);
        }}
      />

      {/* Collection Modal */}
      <CollectionModal
        isOpen={showCollectionModal}
        onClose={() => setShowCollectionModal(false)}
        imageId={image._id}
        onCollectionUpdate={() => {
          // Optionally refresh data if needed
        }}
      />
    </>
  );
};

export default ImageModal;

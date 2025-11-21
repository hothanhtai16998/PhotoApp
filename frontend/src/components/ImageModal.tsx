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
} from 'lucide-react';
import type { Image } from '@/types/image';
import ProgressiveImage from './ProgressiveImage';
import { imageService } from '@/services/imageService';
import { useAuthStore } from '@/stores/useAuthStore';
import { toast } from 'sonner';
import EditImageModal from './EditImageModal';
import { useImageModal } from './image/hooks/useImageModal';
import { useInfiniteScroll } from './image/hooks/useInfiniteScroll';
import { ImageModalInfo } from './image/ImageModalInfo';
import { ImageModalShare } from './image/ImageModalShare';
import { Avatar } from './Avatar';
import { useFormattedDate } from '@/hooks/useFormattedDate';
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
}: ImageModalProps) => {
  const modalContentRef = useRef<HTMLDivElement>(null);
  const [relatedImagesLimit, setRelatedImagesLimit] = useState(12);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showUserProfileCard, setShowUserProfileCard] = useState(false);
  const [isClosingProfileCard, setIsClosingProfileCard] = useState(false);
  const [userImages, setUserImages] = useState<Image[]>([]);
  const [isLoadingUserImages, setIsLoadingUserImages] = useState(false);
  const userInfoRef = useRef<HTMLDivElement>(null);
  const userProfileCardRef = useRef<HTMLDivElement>(null);
  const modalImageRef = useRef<HTMLImageElement>(null);
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // Use the custom hook for modal state and logic
  const {
    views,
    downloads,
    isFavorited,
    isTogglingFavorite,
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
      // If viewing own profile or if user is logged in, navigate to profile page
      // Note: Currently the app only supports viewing own profile
      if (user && user._id === image.uploadedBy._id) {
        navigate('/profile');
      } else {
        // For other users, show a message (feature coming soon)
        toast.info('Viewing other users\' profiles is coming soon!');
      }
    }, 50);
  }, [navigate, image.uploadedBy._id, user]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Get related images (same category, excluding current image) with infinite scroll
  // Combined calculation to avoid duplicate filtering
  const { relatedImages, hasMoreRelatedImages } = useMemo(() => {
    if (!image || images.length === 0) {
      return { relatedImages: [], hasMoreRelatedImages: false };
    }

    const currentCategoryId = typeof image.imageCategory === 'string'
      ? image.imageCategory
      : image.imageCategory?._id;

    let filtered: Image[];

    if (!currentCategoryId) {
      // If no category, return other images from current view (excluding current)
      filtered = images.filter(img => img._id !== image._id);
    } else {
      // Filter images by same category, excluding current image
      filtered = images.filter(img => {
        if (img._id === image._id) return false;
        const imgCategoryId = typeof img.imageCategory === 'string'
          ? img.imageCategory
          : img.imageCategory?._id;
        return imgCategoryId === currentCategoryId;
      });
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
      <div
        className="image-modal-overlay"
        onClick={onClose}
      />
      <div
        className="image-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="image-modal-header">
          {/* Left: User Info */}
          <div
            className="modal-header-left"
            ref={userInfoRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{ position: 'relative' }}
          >
            <Avatar
              user={image.uploadedBy}
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
              <div className="modal-user-status">Available for hire</div>
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
                          if (modalContentRef.current) {
                            modalContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
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
                  View profile
                </button>
              </div>
            )}
          </div>

          {/* Right: Download Button */}
          <div className="modal-header-right">
            <button
              className="modal-download-btn"
              onClick={handleDownload}
              title="Download"
            >
              <span>Tải xuống</span>
              <ChevronDown size={16} />
            </button>
          </div>
        </div>

        {/* Modal Image Content - Scrollable */}
        <div
          className="image-modal-content"
          ref={modalContentRef}
        >
          {/* Main Image */}
          <div className="modal-main-image-container">
            <img
              ref={modalImageRef}
              src={modalImageSrc || image.regularUrl || image.smallUrl || image.imageUrl}
              srcSet={
                image.thumbnailUrl && image.smallUrl && image.regularUrl && image.imageUrl
                  ? `${image.thumbnailUrl} 200w, ${image.smallUrl} 800w, ${image.regularUrl} 1080w, ${image.imageUrl} 1920w`
                  : undefined
              }
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 98vw, 1920px"
              alt={image.imageTitle || 'Photo'}
              className={`modal-image ${isModalImageLoaded ? 'loaded' : 'loading'}`}
              loading="eager"
              decoding="async"
              fetchPriority="high"
              onLoad={() => setIsModalImageLoaded(true)}
            />
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
                >
                  <Heart
                    size={18}
                    fill={isFavorited ? 'currentColor' : 'none'}
                    className={isFavorited ? 'favorite-icon-filled' : ''}
                  />
                  <span>{isFavorited ? 'Đã lưu' : 'Lưu'}</span>
                </button>
              )}
              <ImageModalShare image={image} />
              <ImageModalInfo image={image} />
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
                          // Scroll to top of modal content
                          if (modalContentRef.current) {
                            modalContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
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
    </>
  );
};

export default ImageModal;

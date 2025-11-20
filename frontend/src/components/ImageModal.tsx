import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Share2,
  Info,
  MoreVertical,
  CheckCircle2,
  ChevronDown,
  Heart,
  MapPin,
  ExternalLink,
} from 'lucide-react';
import type { Image } from '@/types/image';
import ProgressiveImage from './ProgressiveImage';
import { imageService } from '@/services/imageService';
import { favoriteService } from '@/services/favoriteService';
import { useAuthStore } from '@/stores/useAuthStore';
import { toast } from 'sonner';
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
  const relatedImagesLoadMoreRef = useRef<HTMLDivElement>(null);
  const [relatedImagesLimit, setRelatedImagesLimit] = useState(12);
  const [isLoadingRelatedImages, setIsLoadingRelatedImages] = useState(false);
  const [views, setViews] = useState<number>(image.views || 0);
  const [downloads, setDownloads] = useState<number>(image.downloads || 0);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'views' | 'downloads'>('views');
  const [hoveredBar, setHoveredBar] = useState<{ date: string; views: number; downloads: number; x: number; y: number } | null>(null);
  const [isFavorited, setIsFavorited] = useState<boolean>(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState<boolean>(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const infoButtonRef = useRef<HTMLButtonElement>(null);
  const incrementedViewIds = useRef<Set<string>>(new Set());
  const currentImageIdRef = useRef<string | null>(null);
  const { accessToken } = useAuthStore();

  // Generate accurate chart data - only show actual data for today, 0 for previous days
  const chartData = useMemo(() => {
    const publishedDate = new Date(image.createdAt);
    publishedDate.setHours(0, 0, 0, 0);

    // Get today's date in local timezone
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Helper to format date as YYYY-MM-DD for reliable comparison (using local timezone)
    const formatDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const todayStr = formatDate(today);

    return Array.from({ length: 14 }, (_, i) => {
      // Calculate date: i=0 is 13 days ago, i=13 is today (0 days ago)
      const daysAgo = 13 - i;
      const date = new Date(today);
      date.setDate(today.getDate() - daysAgo);
      date.setHours(0, 0, 0, 0);

      // Compare dates properly to determine if this is today
      const dateStr = formatDate(date);
      const isToday = dateStr === todayStr;
      const isBeforePublished = date < publishedDate;

      // Only show actual data for today, 0 for all previous days
      const viewsValue = (isToday && !isBeforePublished) ? (views || 0) : 0;
      const downloadsValue = (isToday && !isBeforePublished) ? (downloads || 0) : 0;

      return {
        date,
        views: viewsValue,
        downloads: downloadsValue,
        isBeforePublished,
      };
    });
  }, [image.createdAt, views, downloads]);

  // Reset related images limit and update stats when image changes
  useEffect(() => {
    setRelatedImagesLimit(12);
    setViews(image.views || 0);
    setDownloads(image.downloads || 0);
    currentImageIdRef.current = image._id;
    
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
    // Use image._id instead of image object to ensure it triggers when image changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image._id, accessToken]);

  // Close info modal when clicking outside
  useEffect(() => {
    if (!showInfoModal) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        infoButtonRef.current &&
        !infoButtonRef.current.contains(target) &&
        !target.closest('.info-modal')
      ) {
        setShowInfoModal(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showInfoModal]);

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
            onImageSelect({ ...currentImage, views: response.views });
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

  // Get related images (same category, excluding current image) with infinite scroll
  const relatedImages = useMemo(() => {
    if (!image || images.length === 0) return [];

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

    // Return limited images for infinite scroll
    return filtered.slice(0, relatedImagesLimit);
  }, [image, images, relatedImagesLimit]);

  // Check if there are more related images to load
  const hasMoreRelatedImages = useMemo(() => {
    if (!image || images.length === 0) return false;

    const currentCategoryId = typeof image.imageCategory === 'string'
      ? image.imageCategory
      : image.imageCategory?._id;

    let filtered: Image[];

    if (!currentCategoryId) {
      filtered = images.filter(img => img._id !== image._id);
    } else {
      filtered = images.filter(img => {
        if (img._id === image._id) return false;
        const imgCategoryId = typeof img.imageCategory === 'string'
          ? img.imageCategory
          : img.imageCategory?._id;
        return imgCategoryId === currentCategoryId;
      });
    }

    return filtered.length > relatedImagesLimit;
  }, [image, images, relatedImagesLimit]);

  // Infinite scroll for related images (modal content scrolling)
  useEffect(() => {
    if (!relatedImagesLoadMoreRef.current || isLoadingRelatedImages || !modalContentRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && hasMoreRelatedImages && !isLoadingRelatedImages) {
          setIsLoadingRelatedImages(true);
          // Load more images after a short delay for smooth UX
          setTimeout(() => {
            setRelatedImagesLimit(prev => prev + 12);
            setIsLoadingRelatedImages(false);
          }, 300);
        }
      },
      {
        root: modalContentRef.current, // Use modal content as root for scrolling detection
        rootMargin: '200px',
      }
    );

    observer.observe(relatedImagesLoadMoreRef.current);

    return () => {
      observer.disconnect();
    };
  }, [hasMoreRelatedImages, isLoadingRelatedImages]);

  // Handle share functionality
  const handleShare = useCallback(async () => {
    const shareUrl = `${window.location.origin}/?image=${image._id}`;
    const shareText = `Check out this photo: ${image.imageTitle || 'Untitled'}`;

    // Use Web Share API if available (mobile)
    if (navigator.share) {
      try {
        await navigator.share({
          title: image.imageTitle || 'Photo',
          text: shareText,
          url: shareUrl,
        });
        toast.success('Đã chia sẻ ảnh');
        return;
      } catch (error) {
        // User cancelled or error occurred, fall through to clipboard
        if ((error as Error).name !== 'AbortError') {
          console.error('Share failed:', error);
        }
      }
    }

    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Đã sao chép liên kết vào clipboard');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast.error('Không thể chia sẻ. Vui lòng thử lại.');
    }
  }, [image._id, image.imageTitle]);

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
        const currentIndex = images.findIndex(img => img._id === image._id);
        if (currentIndex > 0) {
          onImageSelect(images[currentIndex - 1]);
        }
        e.preventDefault();
        return;
      }
      
      if (e.key === 'ArrowRight' && images.length > 1) {
        const currentIndex = images.findIndex(img => img._id === image._id);
        if (currentIndex < images.length - 1) {
          onImageSelect(images[currentIndex + 1]);
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
        handleShare().catch(console.error);
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
      if (!modalContentRef.current) return;

      const wheelEvent = e as WheelEvent;
      const target = e.target as HTMLElement;

      // Don't interfere if scrolling inside the modal content itself
      if (modalContentRef.current.contains(target)) {
        return;
      }

      // Prevent default scrolling
      wheelEvent.preventDefault();

      // Scroll the modal content instead
      const modalContent = modalContentRef.current;
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
  }, [onClose, images, image._id, onImageSelect, accessToken, isTogglingFavorite, handleShare, handleToggleFavorite]);

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
          <div className="modal-header-left">
            {image.uploadedBy.avatarUrl ? (
              <img
                src={image.uploadedBy.avatarUrl}
                alt={image.uploadedBy.displayName || image.uploadedBy.username}
                className="modal-user-avatar"
              />
            ) : (
              <div className="modal-user-avatar-placeholder">
                {(image.uploadedBy.displayName || image.uploadedBy.username || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="modal-user-info">
              <div className="modal-user-name">
                {image.uploadedBy.displayName?.trim() || image.uploadedBy.username}
                <CheckCircle2 className="verified-badge" size={16} />
              </div>
              <div className="modal-user-status">Available for hire</div>
            </div>
          </div>

          {/* Right: Action Buttons */}
          <div className="modal-header-right">
            <button
              className="modal-action-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleShare();
              }}
              title="Share (Ctrl/Cmd + S)"
              aria-label="Chia sẻ ảnh"
            >
              <Share2 size={20} />
            </button>
            <button
              className="modal-download-btn"
              onClick={async (e) => {
                e.stopPropagation();
                // Increment download count
                try {
                  const response = await imageService.incrementDownload(image._id);
                  setDownloads(response.downloads);
                  // Update the image in the parent component and store
                  if (onImageSelect) {
                    onImageSelect({ ...image, downloads: response.downloads });
                  }
                } catch (error) {
                  console.error('Failed to increment download:', error);
                }
                // Then trigger the download
                onDownload(image, e);
              }}
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
              src={image.imageUrl}
              alt={image.imageTitle || 'Photo'}
              className="modal-image"
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
                {image.createdAt && (
                  <div className="image-info-date">
                    {new Date(image.createdAt).toLocaleDateString('vi-VN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Actions */}
            <div className="modal-footer-right">
              {accessToken && (
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
              <button className="modal-footer-btn">
                <Share2 size={18} />
                <span>Chia sẻ</span>
              </button>
              <div style={{ position: 'relative' }}>
                <button
                  ref={infoButtonRef}
                  className={`modal-footer-btn ${showInfoModal ? 'active' : ''}`}
                  onClick={() => setShowInfoModal(!showInfoModal)}
                >
                  <Info size={18} />
                  <span>Thông tin</span>
                </button>
                {/* Info Modal */}
                {showInfoModal && (
                  <div className="info-modal-wrapper">
                    <div className="info-modal">
                      <div className="info-modal-header">
                        <h2 className="info-modal-title">Thông tin</h2>
                        <button
                          className="info-modal-close"
                          onClick={() => setShowInfoModal(false)}
                          aria-label="Close info modal"
                        >
                          ×
                        </button>
                      </div>
                      <div className="info-modal-content">
                        <div className="info-published">
                          Đã đăng vào {(() => {
                            const daysAgo = Math.floor((Date.now() - new Date(image.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                            if (daysAgo === 0) return 'hôm nay';
                            if (daysAgo === 1) return '1 ngày trước';
                            return `${daysAgo} ngày trước`;
                          })()}
                        </div>

                        {/* Chart Container */}
                        <div
                          className="info-chart-container"
                          ref={chartContainerRef}
                          onMouseMove={(e) => {
                            if (!chartContainerRef.current) return;

                            const chartInner = chartContainerRef.current.querySelector('.info-chart') as HTMLElement;
                            if (!chartInner) return;

                            // Get all bar elements to find exact positions
                            const bars = Array.from(chartInner.querySelectorAll('.info-chart-bar'));
                            if (bars.length === 0) return;

                            const chartInnerRect = chartInner.getBoundingClientRect();

                            // Find which bar the mouse is closest to horizontally
                            let hoveredBarIndex = -1;
                            let minDistance = Infinity;
                            let barCenterX = 0;
                            let barTopY = 0;

                            bars.forEach((bar, index) => {
                              const barRect = bar.getBoundingClientRect();
                              const barCenter = barRect.left + (barRect.width / 2);
                              const distance = Math.abs(e.clientX - barCenter);

                              // Also check if mouse is within the chart area vertically
                              if (e.clientY >= chartInnerRect.top && e.clientY <= chartInnerRect.bottom) {
                                if (distance < minDistance) {
                                  minDistance = distance;
                                  hoveredBarIndex = index;
                                  barCenterX = barCenter;
                                  // Get the top of the bar (where the tooltip should appear)
                                  barTopY = barRect.top;
                                }
                              }
                            });

                            if (hoveredBarIndex >= 0 && hoveredBarIndex < chartData.length) {
                              const data = chartData[hoveredBarIndex];
                              const dateStr = data.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

                              // Ensure tooltip stays within viewport
                              const tooltipWidth = 200;
                              const margin = 10;
                              let finalX = barCenterX;

                              // Adjust if too far right
                              if (finalX + (tooltipWidth / 2) > window.innerWidth - margin) {
                                finalX = window.innerWidth - (tooltipWidth / 2) - margin;
                              }

                              // Adjust if too far left
                              if (finalX - (tooltipWidth / 2) < margin) {
                                finalX = (tooltipWidth / 2) + margin;
                              }

                              setHoveredBar({
                                date: dateStr,
                                views: data.views,
                                downloads: data.downloads,
                                x: finalX,
                                y: barTopY - 8
                              });
                            } else {
                              setHoveredBar(null);
                            }
                          }}
                          onMouseLeave={() => setHoveredBar(null)}
                        >
                          <div className="info-chart">
                            {chartData.map((data, i) => {
                              const value = activeTab === 'views' ? data.views : data.downloads;
                              const maxValue = activeTab === 'views'
                                ? Math.max(...chartData.map(d => d.views), 1)
                                : Math.max(...chartData.map(d => d.downloads), 1);
                              const height = maxValue > 0 ? (value / maxValue) * 100 : 0;

                              return (
                                <div
                                  key={i}
                                  className={`info-chart-bar ${data.isBeforePublished ? 'before-published' : ''}`}
                                  style={{ height: `${Math.max(height, 2)}%` }}
                                />
                              );
                            })}
                          </div>
                          {hoveredBar && typeof document !== 'undefined' && createPortal(
                            <div
                              className="info-chart-tooltip"
                              style={{
                                left: `${hoveredBar.x}px`,
                                top: `${hoveredBar.y}px`,
                                transform: 'translate(-50%, -100%)'
                              }}
                            >
                              <div>{hoveredBar.date} (UTC)</div>
                              {activeTab === 'views' ? (
                                <div>Đã xem {hoveredBar.views.toLocaleString()} lần</div>
                              ) : (
                                <div>Đã tải {hoveredBar.downloads.toLocaleString()} lần</div>
                              )}
                            </div>,
                            document.body
                          )}
                        </div>

                        {/* Tabs */}
                        <div className="info-tabs">
                          <button
                            className={`info-tab ${activeTab === 'views' ? 'active' : ''}`}
                            onClick={() => setActiveTab('views')}
                          >
                            Lượt xem
                          </button>
                          <button
                            className={`info-tab ${activeTab === 'downloads' ? 'active' : ''}`}
                            onClick={() => setActiveTab('downloads')}
                          >
                            Lượt tải
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <button className="modal-footer-btn">
                <MoreVertical size={18} />
              </button>
            </div>
          </div>

          {/* Related Images Section */}
          {relatedImages.length > 0 && (
            <div className="modal-related-images">
              <h3 className="related-images-title">Các ảnh cùng chủ đề</h3>
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
            </div>
          )}
        </div>

        {/* Close Button */}
        {/* <button
          className="modal-close-btn"
          onClick={onClose}
          aria-label="Close modal"
        >
          <X size={24} />
        </button> */}
      </div>
    </>
  );
};

export default ImageModal;


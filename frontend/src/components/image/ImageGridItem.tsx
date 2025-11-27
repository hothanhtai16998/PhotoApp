import { useState, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, MapPin, Heart } from 'lucide-react';
import type { Image } from '@/types/image';
import ProgressiveImage from '../ProgressiveImage';
import { Avatar } from '../Avatar';
import { favoriteService } from '@/services/favoriteService';
import { useAuthStore } from '@/stores/useAuthStore';
import { useBatchedFavoriteCheck } from '@/hooks/useBatchedFavoriteCheck';
import { toast } from 'sonner';

interface ImageGridItemProps {
  image: Image;
  imageType: 'portrait' | 'landscape';
  aspectRatio?: number;
  onSelect: (image: Image) => void;
  onDownload: (image: Image, e: React.MouseEvent) => void;
  onImageLoad: (imageId: string, img: HTMLImageElement) => void;
  currentImageIds: Set<string>;
  processedImages: React.MutableRefObject<Set<string>>;
  isFadingOut?: boolean;
  eager?: boolean;
}

export const ImageGridItem = memo(({
  image,
  imageType,
  aspectRatio,
  onSelect,
  onDownload,
  onImageLoad,
  currentImageIds,
  processedImages,
  isFadingOut = false,
  eager = false
}: ImageGridItemProps) => {
  const hasUserInfo = image.uploadedBy && (image.uploadedBy.displayName || image.uploadedBy.username);
  const { accessToken } = useAuthStore();
  const navigate = useNavigate();
  const [isTogglingFavorite, setIsTogglingFavorite] = useState<boolean>(false);

  // Use batched favorite check hook (reduces API calls)
  const isFavorited = useBatchedFavoriteCheck(image._id);

  // Handle click on user avatar/name to navigate to profile
  const handleUserClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering image modal
    if (image.uploadedBy?.username) {
      navigate(`/profile/${image.uploadedBy.username}`);
    } else if (image.uploadedBy?._id) {
      navigate(`/profile/user/${image.uploadedBy._id}`);
    }
  }, [image.uploadedBy, navigate]);

  const handleClick = useCallback(() => {
    onSelect(image);
  }, [image, onSelect]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(image);
    }
  }, [image, onSelect]);

  const handleDownload = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onDownload(image, e);
  }, [image, onDownload]);

  const handleToggleFavorite = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!accessToken || !image._id || isTogglingFavorite) return;

    setIsTogglingFavorite(true);
    try {
      const imageId = String(image._id);
      const response = await favoriteService.toggleFavorite(imageId);
      // Note: useBatchedFavoriteCheck hook manages its own state
      // The favorite status will update automatically on next check
      // For immediate feedback, we could trigger a re-check, but the hook handles this
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

  const handleImageLoad = useCallback((img: HTMLImageElement) => {
    if (!processedImages.current.has(image._id) && currentImageIds.has(image._id)) {
      onImageLoad(image._id, img);
    }
  }, [image._id, onImageLoad, currentImageIds, processedImages]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const overlay = e.currentTarget;
    const rect = overlay.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const tooltipWidth = 200;
    const tooltipHeight = 40;
    const adjustedX = Math.max(tooltipWidth / 2, Math.min(x, rect.width - tooltipWidth / 2));
    const adjustedY = Math.max(tooltipHeight / 2, Math.min(y, rect.height - tooltipHeight / 2));
    overlay.style.setProperty('--mouse-x', `${adjustedX}px`);
    overlay.style.setProperty('--mouse-y', `${adjustedY}px`);
  }, []);

  // Calculate grid-row span based on aspect ratio for more accurate sizing
  // This ensures portrait images get the right height even if type detection is delayed
  const getGridRowSpan = () => {
    if (aspectRatio) {
      // Calculate row span based on actual aspect ratio
      // Base: 16 rows for landscape (aspect ratio ~1.5), 32 rows for portrait (aspect ratio ~0.67)
      // Formula: rows = baseRows * (targetAspectRatio / actualAspectRatio)
      if (imageType === 'portrait') {
        // Portrait: taller images need more rows
        // Use aspect ratio to calculate: if aspect ratio is 0.67 (3:4.5), use 32 rows
        // If aspect ratio is smaller (taller), use more rows
        const basePortraitAspect = 0.67; // 3:4.5 ratio
        return Math.max(24, Math.min(40, Math.round(32 * (basePortraitAspect / aspectRatio))));
      } else {
        // Landscape: wider images need fewer rows
        // Use aspect ratio to calculate: if aspect ratio is 1.5 (3:2), use 16 rows
        // If aspect ratio is larger (wider), use fewer rows
        const baseLandscapeAspect = 1.5; // 3:2 ratio
        return Math.max(12, Math.min(20, Math.round(16 * (baseLandscapeAspect / aspectRatio))));
      }
    }
    // Fallback to default spans if aspect ratio not available
    return imageType === 'portrait' ? 32 : 16;
  };

  const gridRowSpan = getGridRowSpan();

  return (
    <div
      className={`masonry-item ${imageType} ${isFadingOut ? 'fading-out' : ''}`}
      role="listitem"
      aria-label={`Ảnh: ${image.imageTitle || 'Không có tiêu đề'}`}
      data-image-id={image._id}
      style={{
        gridRow: `span ${gridRowSpan}`,
      }}
    >
      {/* Mobile: Author Block (Top) */}
      {hasUserInfo && (
        <div className="masonry-item-author-mobile">
          <div
            className="image-author-info clickable-user-info"
            onClick={handleUserClick}
            style={{ cursor: 'pointer' }}
            title="Xem hồ sơ"
          >
            <Avatar
              user={image.uploadedBy}
              size={32}
              className="author-avatar"
              fallbackClassName="author-avatar-placeholder"
            />
            <div className="author-details">
              <span className="image-author-name">
                {image.uploadedBy.displayName?.trim() || image.uploadedBy.username}
              </span>
              {image.uploadedBy.bio && (
                <span className="author-bio">{image.uploadedBy.bio}</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Block (Middle) */}
      <div
        className="masonry-link"
        onClick={handleClick}
        style={{ cursor: 'pointer' }}
        role="button"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        aria-label={`View ${image.imageTitle || 'image'}`}
      >
        <ProgressiveImage
          src={image.imageUrl}
          thumbnailUrl={image.thumbnailUrl}
          smallUrl={image.smallUrl}
          regularUrl={image.regularUrl}
          thumbnailAvifUrl={image.thumbnailAvifUrl}
          smallAvifUrl={image.smallAvifUrl}
          regularAvifUrl={image.regularAvifUrl}
          imageAvifUrl={image.imageAvifUrl}
          alt={image.imageTitle || 'Photo'}
          onLoad={handleImageLoad}
          eager={eager}
          fetchPriority={eager ? 'high' : 'auto'}
        />
        <div
          className="masonry-overlay"
          onMouseMove={handleMouseMove}
        >
          {image.imageTitle && (
            <div className="image-title-tooltip">
              {image.imageTitle}
            </div>
          )}

          {/* Location Badge */}
          {image.location && (
            <div className="image-location-badge">
              <MapPin size={14} />
              <span className="location-text">{image.location}</span>
            </div>
          )}

          <div className="image-actions">
            <button
              className="image-action-btn download-btn"
              onClick={handleDownload}
              title="Tải xuống"
              aria-label="Tải xuống ảnh"
            >
              <Download size={20} />
            </button>
          </div>

          {/* Desktop: Author Info (Bottom Left) */}
          {hasUserInfo && (
            <div className="image-info">
              <div
                className="image-author-info clickable-user-info"
                onClick={handleUserClick}
                style={{ cursor: 'pointer' }}
                title="Xem hồ sơ"
              >
                <Avatar
                  user={image.uploadedBy}
                  size={32}
                  className="author-avatar"
                  fallbackClassName="author-avatar-placeholder"
                />
                <div className="author-details">
                  <span className="image-author-name">
                    {image.uploadedBy.displayName?.trim() || image.uploadedBy.username}
                  </span>
                  {image.uploadedBy.bio && (
                    <span className="author-bio">{image.uploadedBy.bio}</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile: Buttons Block (Bottom) */}
      <div className="masonry-item-actions-mobile">
        <button
          className={`mobile-action-btn favorite-btn ${isFavorited ? 'favorited' : ''}`}
          onClick={handleToggleFavorite}
          disabled={isTogglingFavorite || !accessToken}
          title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
          aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart
            size={20}
            fill={isFavorited ? 'currentColor' : 'none'}
            className={isFavorited ? 'favorite-icon-filled' : ''}
          />
        </button>
        <button
          className="mobile-action-btn download-btn"
          onClick={handleDownload}
          title="Tải xuống"
          aria-label="Tải xuống ảnh"
        >
          <Download size={20} />
        </button>
      </div>
    </div>
  );
});

ImageGridItem.displayName = 'ImageGridItem';


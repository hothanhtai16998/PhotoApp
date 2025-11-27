import { useEffect, useLayoutEffect, useMemo, useState, useRef, useCallback, memo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useImageStore } from '@/stores/useImageStore';
import { Download, MapPin, Heart } from 'lucide-react';
import type { Image } from '@/types/image';
import ProgressiveImage from './ProgressiveImage';
import CategoryNavigation from './CategoryNavigation';
import ImageModal from './ImageModal';
import { Skeleton } from './ui/skeleton';
import { toast } from 'sonner';
import api from '@/lib/axios';
import { generateImageSlug, extractIdFromSlug } from '@/lib/utils';
import { useInfiniteScroll } from './image/hooks/useInfiniteScroll';
import { Avatar } from './Avatar';
import { favoriteService } from '@/services/favoriteService';
import { useAuthStore } from '@/stores/useAuthStore';
import { applyImageFilters } from '@/utils/imageFilters';
import { useBatchedFavoriteCheck } from '@/hooks/useBatchedFavoriteCheck';
import './ImageGrid.css';

// Memoized image item component to prevent unnecessary re-renders
const ImageGridItem = memo(({
  image,
  imageType,
  aspectRatio,
  onSelect,
  onDownload,
  onImageLoad,
  currentImageIds,
  processedImages,
  isFadingOut = false
}: {
  image: Image;
  imageType: 'portrait' | 'landscape';
  aspectRatio?: number;
  onSelect: (image: Image) => void;
  onDownload: (image: Image, e: React.MouseEvent) => void;
  onImageLoad: (imageId: string, img: HTMLImageElement) => void;
  currentImageIds: Set<string>;
  processedImages: React.MutableRefObject<Set<string>>;
  isFadingOut?: boolean;
}) => {
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

const ImageGrid = memo(() => {
  const { images, loading, error, pagination, currentSearch, currentCategory, currentLocation, fetchImages } = useImageStore();
  const [searchParams, setSearchParams] = useSearchParams();

  // Load filters from localStorage - make it reactive (declare early to avoid TDZ issues)
  const [filters, setFilters] = useState(() => {
    try {
      const stored = localStorage.getItem('photoApp_searchFilters');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load filters:', error);
    }
    return {
      orientation: 'all',
      color: 'all',
      dateFrom: '',
      dateTo: '',
    };
  });

  // Get selected image slug from URL search params
  const imageSlugFromUrl = searchParams.get('image');

  // Find selected image from URL slug
  const selectedImage = useMemo(() => {
    if (!imageSlugFromUrl) return null;

    // Extract short ID from slug and find matching image
    const shortId = extractIdFromSlug(imageSlugFromUrl);
    if (!shortId) return null;

    // Find image by matching the last 12 characters of ID
    return images.find(img => {
      const imgShortId = img._id.slice(-12);
      return imgShortId === shortId;
    }) || null;
  }, [imageSlugFromUrl, images]);

  // Update image in the store when stats change
  const handleImageUpdate = useCallback((updatedImage: Image) => {
    // Update the image in the store's images array
    useImageStore.setState((state) => {
      const index = state.images.findIndex(img => img._id === updatedImage._id);
      if (index !== -1) {
        state.images[index] = updatedImage;
      }
    });
  }, []);

  // Initial load - only fetch if images are not already loaded
  useEffect(() => {
    // If images are already in the store, don't refetch to prevent flash
    if (images.length === 0 && !loading) {
      fetchImages({
        color: filters.color !== 'all' ? filters.color : undefined,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // Note: Header component handles the refresh event to maintain category filters
  // ImageGrid doesn't need to listen to refresh events to avoid conflicts

  // Infinite scroll: Load more when reaching bottom
  const handleLoadMore = useCallback(async () => {
    if (!pagination || loading) return;

    await fetchImages({
      page: pagination.page + 1,
      search: currentSearch,
      category: currentCategory,
      location: currentLocation,
      color: filters.color !== 'all' ? filters.color : undefined,
    });
  }, [pagination, loading, currentSearch, currentCategory, currentLocation, filters.color, fetchImages]);

  const { loadMoreRef } = useInfiniteScroll({
    hasMore: pagination ? pagination.page < pagination.pages : false,
    isLoading: loading,
    onLoadMore: handleLoadMore,
    rootMargin: '400px', // Start loading 400px before reaching bottom
  });

  // Group images by category to create collections (currently unused, kept for future use)
  // const collections = useMemo(() => {
  //   if (images.length === 0) return [];

  //   const categoryMap = new Map<string, Image[]>();
  //   images.forEach(img => {
  //     if (img.imageCategory) {
  //       const category = typeof img.imageCategory === 'string'
  //         ? img.imageCategory
  //         : img.imageCategory?.name;
  //       if (category) {
  //         if (!categoryMap.has(category)) {
  //           categoryMap.set(category, []);
  //         }
  //         categoryMap.get(category)!.push(img);
  //       }
  //     }
  //   });

  //   return Array.from(categoryMap.entries())
  //     .map(([name, imgs]) => ({
  //       name,
  //       images: imgs.slice(0, 4),
  //       count: imgs.length
  //     }))
  //     .filter(col => col.count >= 2)
  //     .slice(0, 4);
  // }, [images]);

  // Track image aspect ratios (portrait vs landscape)
  const [imageTypes, setImageTypes] = useState<Map<string, 'portrait' | 'landscape'>>(new Map());
  const [imageAspectRatios, setImageAspectRatios] = useState<Map<string, number>>(new Map());
  const processedImages = useRef<Set<string>>(new Set());
  const preloadQueue = useRef<Set<string>>(new Set());
  
  // Improved transition tracking - keep old images visible to prevent flash
  const [displayImages, setDisplayImages] = useState<Image[]>(images); // Current images to display
  const [prevImages, setPrevImages] = useState<Image[]>([]); // Previous images (kept visible during transition)
  const previousCategoryRef = useRef<string | undefined>(currentCategory);
  const previousImagesRef = useRef<Image[]>(images);
  
  // Keep old images visible when category changes until new ones load
  // Use useLayoutEffect to prevent flickering - runs synchronously before browser paints
  useLayoutEffect(() => {
    const categoryChanged = previousCategoryRef.current !== currentCategory;
    const imagesChanged = previousImagesRef.current !== images;
    
    if (categoryChanged && displayImages.length > 0) {
      // Category changed - keep old images visible, start transition
      setPrevImages(displayImages); // Keep old images visible
      previousCategoryRef.current = currentCategory;
    }
    
    // When new images arrive (after category change or regular update)
    if (images.length > 0 && imagesChanged) {
      if (categoryChanged) {
        // Category changed - show new images immediately, keep old ones visible briefly
        setDisplayImages(images);
        // Clear old images after new ones are rendered (double RAF ensures paint)
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setPrevImages([]);
          });
        });
      } else {
        // Regular update (pagination, etc.) - just update display
        setDisplayImages(images);
        setPrevImages([]); // Clear any old images
      }
      previousImagesRef.current = images;
    } else if (images.length === 0 && categoryChanged) {
      // Category changed but new category has 0 images
      // Clear displayImages and prevImages immediately - no images to show
      setDisplayImages([]);
      setPrevImages([]);
      previousImagesRef.current = images;
    } else if (images.length === 0 && !loading && displayImages.length > 0) {
      // Images cleared and not loading - clear display (shouldn't happen normally)
      setDisplayImages([]);
      setPrevImages([]);
      previousImagesRef.current = images;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCategory, images, displayImages.length, loading]);
  
  // Clear processed images when image list changes significantly
  useEffect(() => {
    // Clear processed images for images that are no longer in the list
    const currentIds = new Set(images.map(img => img._id));
    processedImages.current.forEach(id => {
      if (!currentIds.has(id)) {
        processedImages.current.delete(id);
      }
    });
    preloadQueue.current.forEach(id => {
      if (!currentIds.has(id)) {
        preloadQueue.current.delete(id);
      }
    });
  }, [images]);

  // Listen for storage changes (when filters are updated from SearchBar)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'photoApp_searchFilters') {
        try {
          if (e.newValue) {
            setFilters(JSON.parse(e.newValue));
          } else {
            setFilters({
              orientation: 'all',
              color: 'all',
              dateFrom: '',
              dateTo: '',
            });
          }
        } catch (error) {
          console.error('Failed to parse filters from storage:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also listen for custom event from SearchBar (same window)
    const handleFilterChange = () => {
      try {
        const stored = localStorage.getItem('photoApp_searchFilters');
        if (stored) {
          setFilters(JSON.parse(stored));
        } else {
          setFilters({
            orientation: 'all',
            color: 'all',
            dateFrom: '',
            dateTo: '',
          });
        }
      } catch (error) {
        console.error('Failed to load filters:', error);
      }
    };

    window.addEventListener('filterChange', handleFilterChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('filterChange', handleFilterChange);
    };
  }, []);

  // Apply filters to display images (may include old images during transition)
  const filteredImages = useMemo(() => {
    return applyImageFilters(displayImages, filters, imageTypes);
  }, [displayImages, filters, imageTypes]);

  const currentImageIds = useMemo(() => new Set(filteredImages.map(img => img._id)), [filteredImages]);

  // Preload images to determine their type quickly - improved version with aspect ratio
  useEffect(() => {
    if (images.length === 0) return;

    // Process images in batches to avoid overwhelming the browser
    const batchSize = 10;
    const imagesToProcess = images.filter(img => 
      !imageTypes.has(img._id) && 
      !preloadQueue.current.has(img._id) && 
      (img.thumbnailUrl || img.smallUrl || img.imageUrl)
    );

    imagesToProcess.slice(0, batchSize).forEach(img => {
      preloadQueue.current.add(img._id);
      
      const testImg = new Image();
      testImg.crossOrigin = 'anonymous';
      
      testImg.onload = () => {
        const aspectRatio = testImg.naturalWidth / testImg.naturalHeight;
        const isPortrait = testImg.naturalHeight > testImg.naturalWidth;
        const imageType = isPortrait ? 'portrait' : 'landscape';
        
        setImageTypes(prev => {
          if (prev.has(img._id)) return prev;
          const newMap = new Map(prev);
          newMap.set(img._id, imageType);
          return newMap;
        });
        
        setImageAspectRatios(prev => {
          if (prev.has(img._id)) return prev;
          const newMap = new Map(prev);
          newMap.set(img._id, aspectRatio);
          return newMap;
        });
        
        preloadQueue.current.delete(img._id);
      };
      
      testImg.onerror = () => {
        // If image fails to load, default to landscape
        setImageTypes(prev => {
          if (prev.has(img._id)) return prev;
          const newMap = new Map(prev);
          newMap.set(img._id, 'landscape');
          return newMap;
        });
        
        setImageAspectRatios(prev => {
          if (prev.has(img._id)) return prev;
          const newMap = new Map(prev);
          newMap.set(img._id, 1.5); // Default landscape aspect ratio
          return newMap;
        });
        
        preloadQueue.current.delete(img._id);
      };
      
      // Use thumbnail or small URL for faster detection
      testImg.src = img.thumbnailUrl || img.smallUrl || img.imageUrl;
    });
  }, [images, imageTypes]);

  // Determine image type when it loads - memoized to prevent recreation
  // This is a fallback in case preload didn't work
  const handleImageLoad = useCallback((imageId: string, img: HTMLImageElement) => {
    // Only process once per image and only if image still exists
    if (!currentImageIds.has(imageId) || processedImages.current.has(imageId)) return;

    processedImages.current.add(imageId);
    const aspectRatio = img.naturalWidth / img.naturalHeight;
    const isPortrait = img.naturalHeight > img.naturalWidth;
    const imageType = isPortrait ? 'portrait' : 'landscape';
    
    // Only update if type is not already determined (preload should have done this)
    setImageTypes(prev => {
      if (prev.has(imageId)) return prev;
      const newMap = new Map(prev);
      newMap.set(imageId, imageType);
      return newMap;
    });
    
    setImageAspectRatios(prev => {
      if (prev.has(imageId)) return prev;
      const newMap = new Map(prev);
      newMap.set(imageId, aspectRatio);
      return newMap;
    });
  }, [currentImageIds]);

  // const handleTrendingClick = (search: string) => {
  //   fetchImages({ search, page: 1 });
  // };

  // Download image function - uses backend proxy to avoid CORS issues
  const handleDownloadImage = useCallback(async (image: Image, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      if (!image._id) {
        throw new Error('Lỗi khi lấy ID của ảnh');
      }

      // Use backend endpoint to download image (proxies from S3)
      const response = await api.get(`/images/${image._id}/download`, {
        responseType: 'blob',
        withCredentials: true,
      });

      // Create blob URL from response
      const blob = new Blob([response.data], { type: response.headers['content-type'] || 'image/webp' });
      const blobUrl = URL.createObjectURL(blob);

      // Create download link
      const link = document.createElement('a');
      link.href = blobUrl;

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers['content-disposition'];
      let fileName = 'photo.webp';
      if (contentDisposition) {
        const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
        if (fileNameMatch) {
          fileName = fileNameMatch[1];
        }
      } else {
        // Fallback: generate filename from image title
        const sanitizedTitle = (image.imageTitle || 'photo').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const urlExtension = image.imageUrl?.match(/\.([a-z]+)(?:\?|$)/i)?.[1] || 'webp';
        fileName = `${sanitizedTitle}.${urlExtension}`;
      }
      link.download = fileName;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the blob URL after a short delay
      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 100);

      toast.success('Tải ảnh thành công');
    } catch (error) {
      console.error('Tải ảnh thất bại:', error);
      toast.error('Tải ảnh thất bại. Vui lòng thử lại.');

      // Fallback: try opening in new tab if download fails
      try {
        if (image.imageUrl) {
          window.open(image.imageUrl, '_blank');
        }
      } catch (fallbackError) {
        console.error('Lỗi fallback khi tải ảnh:', fallbackError);
      }
    }
  }, []);

  // Loading skeleton component
  const ImageGridSkeleton = () => (
    <div className="masonry-grid" aria-label="Đang tải ảnh" aria-live="polite">
      {Array.from({ length: 12 }).map((_, index) => (
        <div
          key={`skeleton-${index}`}
          className={`masonry-item ${index % 3 === 0 ? 'portrait' : 'landscape'}`}
        >
          <Skeleton className="w-full h-full min-h-[200px] rounded-lg" />
        </div>
      ))}
    </div>
  );

  // Search result count
  const searchResultCount = useMemo(() => {
    if (currentSearch && pagination) {
      return pagination.total
    }
    return null
  }, [currentSearch, pagination])

  // Location result count
  const locationResultCount = useMemo(() => {
    if (currentLocation && pagination) {
      return pagination.total
    }
    return null
  }, [currentLocation, pagination])

  // Early return for error - MUST be after all hooks
  if (error) {
    return (
      <div className="image-grid-container" role="alert" aria-live="polite">
        <div className="error-state">
          <p>Lỗi: {error}</p>
          <button onClick={() => fetchImages()} aria-label="Thử lại tải ảnh">
            Vui lòng thử lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="image-grid-container">
      {/* Category Navigation */}
      <CategoryNavigation />

      {/* Search Results Header */}
      {currentSearch && (
        <div className="search-results-header">
          <h2 className="search-results-title">
            {loading ? (
              'Đang tìm kiếm...'
            ) : searchResultCount !== null ? (
              <>
                {searchResultCount === 0 ? (
                  'Không tìm thấy kết quả'
                ) : (
                  <>
                    {searchResultCount.toLocaleString('vi-VN')} {searchResultCount === 1 ? 'kết quả' : 'kết quả'} cho "{currentSearch}"
                  </>
                )}
              </>
            ) : (
              `Kết quả tìm kiếm cho "${currentSearch}"`
            )}
          </h2>
        </div>
      )}

      {/* Location Results Header */}
      {currentLocation && !currentSearch && (
        <div className="search-results-header">
          <h2 className="search-results-title">
            {loading ? (
              'Đang tải...'
            ) : locationResultCount !== null ? (
              <>
                {locationResultCount === 0 ? (
                  'Không tìm thấy kết quả'
                ) : (
                  <>
                    {locationResultCount.toLocaleString('vi-VN')} {locationResultCount === 1 ? 'ảnh' : 'ảnh'} tại "{currentLocation}"
                  </>
                )}
              </>
            ) : (
              `Ảnh tại "${currentLocation}"`
            )}
          </h2>
        </div>
      )}

      {/* Main Image Grid */}
      {/* Show loading skeleton only when truly loading with no images and not transitioning */}
      {loading && displayImages.length === 0 && !pagination ? (
        <ImageGridSkeleton />
          ) : filteredImages.length === 0 && prevImages.length === 0 ? (
        <div className="empty-state" role="status" aria-live="polite">
          {currentSearch ? (
            <>
              <p>Không tìm thấy kết quả cho "{currentSearch}"</p>
              <p className="empty-state-suggestions">
                Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc tìm kiếm
              </p>
            </>
          ) : currentLocation ? (
            <>
              <p>Không có ảnh nào tại "{currentLocation}"</p>
              <p className="empty-state-suggestions">
                Thử chọn địa điểm khác hoặc xem tất cả ảnh
              </p>
            </>
          ) : currentCategory ? (
            <>
              <p>Không có ảnh nào trong danh mục "{currentCategory}"</p>
              <p className="empty-state-suggestions">
                Thử chọn danh mục khác hoặc xem tất cả ảnh
              </p>
            </>
          ) : (
            <p>Chưa có ảnh nào. Hãy tải ảnh lên để bắt đầu!</p>
          )}
        </div>
      ) : (
        <div 
          className="masonry-grid"
          role="list" 
          aria-label="Danh sách ảnh"
          style={{ position: 'relative' }}
        >
          {/* Show previous images fading out (keep visible until new ones render) */}
          {/* Only show prevImages if we're loading OR if displayImages has images (transition state) */}
          {prevImages.length > 0 && (loading || displayImages.length > 0) && (() => {
            const filteredPrevImages = applyImageFilters(prevImages, filters, imageTypes);
            return filteredPrevImages.map((image) => {
              const imageType = imageTypes.get(image._id);
              const aspectRatio = imageAspectRatios.get(image._id);
              const displayType = imageType || 'landscape';
              
              return (
                <ImageGridItem
                  key={`prev-${image._id}`}
                  image={image}
                  imageType={displayType}
                  aspectRatio={aspectRatio}
                  onSelect={() => {}}
                  onDownload={handleDownloadImage}
                  onImageLoad={handleImageLoad}
                  currentImageIds={currentImageIds}
                  processedImages={processedImages}
                  isFadingOut={true}
                />
              );
            });
          })()}
          
          {/* Show current images */}
          {filteredImages.length > 0 ? filteredImages.map((image) => {
            // Get image type and aspect ratio
            const imageType = imageTypes.get(image._id);
            const aspectRatio = imageAspectRatios.get(image._id);
            
            // If type is not determined yet, we still render but with a stable default
            // The preload will determine the type quickly, and handleImageLoad will update it
            // Use 'landscape' as default but ensure consistent sizing
            const displayType = imageType || 'landscape';
            
            return (
              <ImageGridItem
                key={image._id}
                image={image}
                imageType={displayType}
                aspectRatio={aspectRatio}
                onSelect={(img) => {
                  // Set flag to indicate we're opening from grid (not refresh)
                  sessionStorage.setItem('imagePage_fromGrid', 'true');

                  // Update URL with search param instead of navigating
                  // This keeps the grid mounted (like Unsplash)
                  const slug = generateImageSlug(img.imageTitle, img._id);
                  setSearchParams(prev => {
                    const newParams = new URLSearchParams(prev);
                    newParams.set('image', slug);
                    return newParams;
                  });
                }}
                onDownload={handleDownloadImage}
                onImageLoad={handleImageLoad}
                currentImageIds={currentImageIds}
                processedImages={processedImages}
              />
            );
          }) : null}
        </div>
      )}
      {/* Infinite Scroll Trigger - invisible element at bottom */}
      {pagination && pagination.page < pagination.pages && (
        <div ref={loadMoreRef} className="infinite-scroll-trigger" />
      )}

      {/* Loading indicator */}
      {loading && images.length > 0 && (
        <div className="loading-more">
          <div className="loading-spinner" />
          <p>Đang tải thêm ảnh...</p>
        </div>
      )}

      {/* End of results */}
      {pagination && pagination.page >= pagination.pages && images.length > 0 && (
        <div className="end-of-results">
          <p>Tất cả ảnh đã được hiển thị</p>
        </div>
      )}

      {/* Image Modal - shown as overlay when image param exists */}
      {/* Always render as modal (not page) when opened from grid */}
      {selectedImage && (
        <ImageModal
          image={selectedImage}
          images={images}
          onClose={() => {
            // Remove image param from URL when closing
            setSearchParams(prev => {
              const newParams = new URLSearchParams(prev);
              newParams.delete('image');
              return newParams;
            });
          }}
          onImageSelect={(updatedImage) => {
            handleImageUpdate(updatedImage);
            // Set fromGrid flag to prevent HomePage from redirecting when changing images in modal
            sessionStorage.setItem('imagePage_fromGrid', 'true');
            // Update URL to reflect the selected image with slug
            const slug = generateImageSlug(updatedImage.imageTitle, updatedImage._id);
            setSearchParams(prev => {
              const newParams = new URLSearchParams(prev);
              newParams.set('image', slug);
              return newParams;
            });
          }}
          onDownload={handleDownloadImage}
          imageTypes={imageTypes}
          onImageLoad={handleImageLoad}
          currentImageIds={currentImageIds}
          processedImages={processedImages}
          renderAsPage={false} // Always modal when opened from grid
        />
      )}
    </div>
  );
});

ImageGrid.displayName = 'ImageGrid';

export default ImageGrid;

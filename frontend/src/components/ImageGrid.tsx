import { useEffect, useMemo, useState, useRef, useCallback, memo } from 'react';
import { useImageStore } from '@/stores/useImageStore';
import { Download, MapPin } from 'lucide-react';
import type { Image } from '@/types/image';
import ProgressiveImage from './ProgressiveImage';
import CategoryNavigation from './CategoryNavigation';
import ImageModal from './ImageModal';
import { Skeleton } from './ui/skeleton';
import { toast } from 'sonner';
import api from '@/lib/axios';
import './ImageGrid.css';

// Memoized image item component to prevent unnecessary re-renders
const ImageGridItem = memo(({ 
  image, 
  imageType, 
  onSelect, 
  onDownload,
  onImageLoad,
  currentImageIds,
  processedImages
}: {
  image: Image;
  imageType: 'portrait' | 'landscape';
  onSelect: (image: Image) => void;
  onDownload: (image: Image, e: React.MouseEvent) => void;
  onImageLoad: (imageId: string, img: HTMLImageElement) => void;
  currentImageIds: Set<string>;
  processedImages: React.MutableRefObject<Set<string>>;
}) => {
  const hasUserInfo = image.uploadedBy && (image.uploadedBy.displayName || image.uploadedBy.username);
  
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
    onDownload(image, e);
  }, [image, onDownload]);

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

  return (
    <div
      key={image._id}
      className={`masonry-item ${imageType}`}
      role="listitem"
      aria-label={`Ảnh: ${image.imageTitle || 'Không có tiêu đề'}`}
    >
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
              title="Download"
              aria-label="Download image"
            >
              <Download size={20} />
            </button>
          </div>

          {hasUserInfo && (
            <div className="image-info">
              <div className="image-author-info">
                {image.uploadedBy.avatarUrl ? (
                  <img
                    src={image.uploadedBy.avatarUrl}
                    alt={image.uploadedBy.displayName || image.uploadedBy.username}
                    className="author-avatar"
                    style={{ width: '32px', height: '32px', minWidth: '32px', minHeight: '32px', maxWidth: '32px', maxHeight: '32px' }}
                    onError={(e) => {
                      // Hide avatar if it fails to load
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="author-avatar-placeholder" style={{ width: '32px', height: '32px', minWidth: '32px', minHeight: '32px', maxWidth: '32px', maxHeight: '32px' }}>
                    {(image.uploadedBy.displayName || image.uploadedBy.username || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
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
    </div>
  );
});

ImageGridItem.displayName = 'ImageGridItem';

const ImageGrid = memo(() => {
  const { images, loading, error, pagination, currentSearch, currentCategory, currentLocation, fetchImages } = useImageStore();

  const loadMoreRef = useRef<HTMLDivElement>(null);
  const isLoadingMoreRef = useRef(false);
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);

  // Update image in the store when stats change
  const handleImageUpdate = useCallback((updatedImage: Image) => {
    setSelectedImage(updatedImage);
    // Update the image in the store's images array
    useImageStore.setState((state) => {
      const index = state.images.findIndex(img => img._id === updatedImage._id);
      if (index !== -1) {
        state.images[index] = updatedImage;
      }
    });
  }, []);

  // Initial load
  useEffect(() => {
    fetchImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // Note: Header component handles the refresh event to maintain category filters
  // ImageGrid doesn't need to listen to refresh events to avoid conflicts

  // Infinite scroll: Load more when reaching bottom
  useEffect(() => {
    if (!loadMoreRef.current || !pagination) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        // If load more trigger is visible and we have more pages
        if (
          entry.isIntersecting &&
          !loading &&
          !isLoadingMoreRef.current &&
          pagination.page < pagination.pages
        ) {
          isLoadingMoreRef.current = true;

          // Load next page with current search/category/location from store
          fetchImages({
            page: pagination.page + 1,
            search: currentSearch,
            category: currentCategory,
            location: currentLocation,
          }).finally(() => {
            isLoadingMoreRef.current = false;
          });
        }
      },
      {
        rootMargin: '400px', // Start loading 400px before reaching bottom
      }
    );

    observer.observe(loadMoreRef.current);

    return () => {
      observer.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination, loading, currentSearch, currentCategory, currentLocation]);

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
  const processedImages = useRef<Set<string>>(new Set());

  // Get current image IDs for comparison
  const currentImageIds = useMemo(() => new Set(images.map(img => img._id)), [images]);

  // Determine image type when it loads - memoized to prevent recreation
  const handleImageLoad = useCallback((imageId: string, img: HTMLImageElement) => {
    // Only process once per image and only if image still exists
    if (!currentImageIds.has(imageId) || processedImages.current.has(imageId)) return;

    processedImages.current.add(imageId);
    const isPortrait = img.naturalHeight > img.naturalWidth;
    const imageType = isPortrait ? 'portrait' : 'landscape';

    // Update state only if not already set (prevent unnecessary re-renders)
    setImageTypes(prev => {
      if (prev.has(imageId)) return prev;
      const newMap = new Map(prev);
      newMap.set(imageId, imageType);
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
      {loading && images.length === 0 ? (
        <ImageGridSkeleton />
      ) : images.length === 0 ? (
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
        <div className="masonry-grid" role="list" aria-label="Danh sách ảnh">
          {images.map((image) => {
            const imageType = imageTypes.get(image._id) || 'landscape';
            return (
              <ImageGridItem
                key={image._id}
                image={image}
                imageType={imageType}
                onSelect={setSelectedImage}
                onDownload={handleDownloadImage}
                onImageLoad={handleImageLoad}
                currentImageIds={currentImageIds}
                processedImages={processedImages}
              />
            );
          })}
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

      {/* Image Modal */}
      {selectedImage && (
        <ImageModal
          image={selectedImage}
          images={images}
          onClose={() => setSelectedImage(null)}
          onImageSelect={handleImageUpdate}
          onDownload={handleDownloadImage}
          imageTypes={imageTypes}
          onImageLoad={handleImageLoad}
          currentImageIds={currentImageIds}
          processedImages={processedImages}
        />
      )}
    </div>
  );
});

ImageGrid.displayName = 'ImageGrid';

export default ImageGrid;

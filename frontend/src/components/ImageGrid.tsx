import { useEffect, useMemo, useState, useRef, useCallback, memo } from 'react';
import { useImageStore } from '@/stores/useImageStore';
import { Download } from 'lucide-react';
import type { Image } from '@/types/image';
import ProgressiveImage from './ProgressiveImage';
import CategoryNavigation from './CategoryNavigation';
import ImageModal from './ImageModal';
import { Skeleton } from './ui/skeleton';
import { toast } from 'sonner';
import './ImageGrid.css';

const ImageGrid = memo(() => {
  const { images, loading, error, pagination, currentSearch, currentCategory, fetchImages } = useImageStore();

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

          // Load next page with current search/category from store
          fetchImages({
            page: pagination.page + 1,
            search: currentSearch,
            category: currentCategory,
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
  }, [pagination, loading, currentSearch, currentCategory]);

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

  // Download image function - handles CORS and Cloudinary URLs
  // Fetches the original/highest quality image from Cloudinary
  const handleDownloadImage = useCallback(async (image: Image, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      // Construct the original/highest quality URL from Cloudinary
      // Cloudinary stores the original, and we want to download it without any transformations
      let downloadUrl: string;

      if (image.publicId && image.imageUrl?.includes('cloudinary.com')) {
        // Extract cloud_name from URL and construct original URL
        // Cloudinary URL pattern: https://res.cloudinary.com/{cloud_name}/image/upload/{transformations}/{public_id}.{format}
        // For original (no transformations): https://res.cloudinary.com/{cloud_name}/image/upload/{public_id}.{format}

        // Extract cloud name from URL (simpler approach)
        const urlParts = image.imageUrl.split('/');
        const cloudNameIndex = urlParts.findIndex(part => part === 'cloudinary.com') + 1;
        const cloudName = cloudNameIndex > 0 && urlParts[cloudNameIndex] ? urlParts[cloudNameIndex] : null;

        if (cloudName) {
          // Extract format from the original URL (it's usually at the end before query params)
          const formatMatch = image.imageUrl.match(/\.([a-z]+)(?:\?|$)/i);
          const format = formatMatch ? formatMatch[1] : 'jpg';

          // Construct original URL without any transformations
          // This will fetch the original uploaded image at full quality
          downloadUrl = `https://res.cloudinary.com/${cloudName}/image/upload/${image.publicId}.${format}`;
        } else {
          // Fallback: try to remove transformations from existing URL
          downloadUrl = image.imageUrl.replace(/\/upload\/[^/]+\//, '/upload/');
        }
      } else if (image.imageUrl?.includes('cloudinary.com')) {
        // No publicId, but it's a Cloudinary URL - try to get original by removing transformations
        // Pattern: .../upload/{transformations}/{public_id} -> .../upload/{public_id}
        downloadUrl = image.imageUrl.replace(/\/upload\/[^/]+\//, '/upload/');
      } else {
        // Not a Cloudinary URL or no publicId - use the highest quality URL available
        downloadUrl = image.imageUrl || image.regularUrl || image.smallUrl || '';
      }

      if (!downloadUrl) {
        throw new Error('Lỗi khi lấy Url của ảnh');
      }

      // Fetch the image as a blob to handle CORS
      const response = await fetch(downloadUrl, {
        mode: 'cors',
        credentials: 'omit',
      });

      if (!response.ok) {
        throw new Error('Lỗi khi lấy ảnh');
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      // Create download link
      const link = document.createElement('a');
      link.href = blobUrl;

      // Get file extension from the download URL or use default
      const urlExtension = downloadUrl.match(/\.([a-z]+)(?:\?|$)/i)?.[1] || 'jpg';
      const sanitizedTitle = (image.imageTitle || 'photo').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const fileName = `${sanitizedTitle}.${urlExtension}`;
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
        window.open(image.imageUrl, '_blank');
      } catch (fallbackError) {
        console.error('Lỗi fallback khi tải ảnh:', fallbackError);
      }
    }
  }, []);

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

  return (
    <div className="image-grid-container">
      {/* Category Navigation */}
      <CategoryNavigation />

      {/* Main Image Grid */}
      {loading && images.length === 0 ? (
        <ImageGridSkeleton />
      ) : images.length === 0 ? (
        <div className="empty-state" role="status" aria-live="polite">
          <p>Chưa có ảnh nào, hãy thêm ảnh.</p>
        </div>
      ) : (
        <div className="masonry-grid" role="list" aria-label="Danh sách ảnh">
          {images.map((image) => {
            const imageType = imageTypes.get(image._id) || 'landscape'; // Get from state
            const hasUserInfo = image.uploadedBy && (image.uploadedBy.displayName || image.uploadedBy.username);
            return (
              <div
                key={image._id}
                className={`masonry-item ${imageType}`}
                role="listitem"
                aria-label={`Ảnh: ${image.imageTitle || 'Không có tiêu đề'}`}
              >
                <div
                  className="masonry-link"
                  onClick={() => {
                    setSelectedImage(image);
                  }}
                  style={{ cursor: 'pointer' }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedImage(image);
                    }
                  }}
                  aria-label={`View ${image.imageTitle || 'image'}`}
                >
                  <ProgressiveImage
                    src={image.imageUrl}
                    thumbnailUrl={image.thumbnailUrl}
                    smallUrl={image.smallUrl}
                    regularUrl={image.regularUrl}
                    alt={image.imageTitle || 'Photo'}
                    onLoad={(img) => {
                      // Handle image load for aspect ratio detection
                      if (!processedImages.current.has(image._id) && currentImageIds.has(image._id)) {
                        handleImageLoad(image._id, img);
                      }
                    }}
                    onError={() => {
                      // Error handling is done in ProgressiveImage component
                    }}
                  />
                  <div
                    className="masonry-overlay"
                    onMouseMove={(e) => {
                      const overlay = e.currentTarget;
                      const rect = overlay.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const y = e.clientY - rect.top;
                      // Keep tooltip within bounds (with 10px margin)
                      const tooltipWidth = 200;
                      const tooltipHeight = 40;
                      const adjustedX = Math.max(tooltipWidth / 2, Math.min(x, rect.width - tooltipWidth / 2));
                      const adjustedY = Math.max(tooltipHeight / 2, Math.min(y, rect.height - tooltipHeight / 2));
                      overlay.style.setProperty('--mouse-x', `${adjustedX}px`);
                      overlay.style.setProperty('--mouse-y', `${adjustedY}px`);
                    }}
                  >
                    {/* Image Title Tooltip - follows mouse */}
                    {image.imageTitle && (
                      <div className="image-title-tooltip">
                        {image.imageTitle}
                      </div>
                    )}

                    {/* Top Right - Download Button */}
                    <div className="image-actions">
                      <button
                        className="image-action-btn download-btn"
                        onClick={(e) => handleDownloadImage(image, e)}
                        title="Download"
                        aria-label="Download image"
                      >
                        <Download size={20} />
                      </button>
                    </div>

                    {/* Bottom Left - User Info */}
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

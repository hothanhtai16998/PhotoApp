import { useEffect, useLayoutEffect, useMemo, useState, useRef, useCallback, memo, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Image } from '@/types/image';
import CategoryNavigation from './CategoryNavigation';
import { Skeleton } from './ui/skeleton';
import { toast } from 'sonner';
import api from '@/lib/axios';
import { generateImageSlug, extractIdFromSlug } from '@/lib/utils';
import { ImageGridItem } from './image/ImageGridItem';
import { useImageGrid } from './image/hooks/useImageGrid';
import { applyImageFilters } from '@/utils/imageFilters';
import { useImageStore } from '@/stores/useImageStore';
import { useIsMobile } from '@/hooks/useIsMobile';
import { imageGridConfig } from '@/config/imageGridConfig';
import { appConfig } from '@/config/appConfig';
import './ImageGrid.css';

// Lazy load ImageModal - conditionally rendered
const ImageModal = lazy(() => import('./ImageModal'));

const ImageGrid = memo(() => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Detect if we're on mobile
  const isMobileState = useIsMobile();

  // Track image aspect ratios (portrait vs landscape)
  const [imageTypes, setImageTypes] = useState<Map<string, 'portrait' | 'landscape'>>(new Map());
  const [imageAspectRatios, setImageAspectRatios] = useState<Map<string, number>>(new Map());
  const processedImages = useRef<Set<string>>(new Set());
  const preloadQueue = useRef<Set<string>>(new Set());
  
  // Improved transition tracking - keep old images visible to prevent flash
  const [displayImages, setDisplayImages] = useState<Image[]>([]);
  const [prevImages, setPrevImages] = useState<Image[]>([]);
  const previousCategoryRef = useRef<string | undefined>(undefined);
  const previousImagesRef = useRef<Image[]>([]);

  // Get images from store
  const { images, loading, error, pagination, currentSearch, currentCategory, currentLocation, fetchImages } = useImageStore();

  // Use the image grid hook for filtering and pagination
  const {
    filters,
    filteredImages,
    searchResultCount,
    locationResultCount,
    loadMoreRef,
    navigate: navigateFromHook,
  } = useImageGrid({
    displayImages,
    imageTypes,
    images,
    loading,
    pagination,
    currentSearch,
    currentCategory,
    currentLocation,
    fetchImages,
  });

  const navigate = navigateFromHook;

  // Get selected image slug from URL search params
  const imageSlugFromUrl = searchParams.get('image');

  // Sync displayImages with images from store
  useEffect(() => {
    if (images.length > 0) {
      setDisplayImages(images);
      previousImagesRef.current = images;
    }
  }, [images]);

  // MOBILE ONLY: If URL has ?image=slug on mobile, redirect to ImagePage
  useEffect(() => {
    if (imageSlugFromUrl && isMobileState) {
      // Set flag to indicate we're opening from grid
      sessionStorage.setItem(appConfig.storage.imagePageFromGridKey, 'true');
      // Navigate to ImagePage with images state
      navigate(`/photos/${imageSlugFromUrl}`, {
        state: { 
          images,
          fromGrid: true 
        },
        replace: true // Replace current URL to avoid back button issues
      });
      // Clear the image param from current URL
      setSearchParams(prev => {
        const newParams = new URLSearchParams(prev);
        newParams.delete('image');
        return newParams;
      });
    }
  }, [imageSlugFromUrl, isMobileState, navigate, images, setSearchParams]);

  // Find selected image from URL slug (DESKTOP ONLY - for modal)
  const selectedImage = useMemo(() => {
    // Don't show modal on mobile
    if (isMobileState) return null;
    if (!imageSlugFromUrl) return null;

    // Extract short ID from slug and find matching image
    const shortId = extractIdFromSlug(imageSlugFromUrl);
    if (!shortId) return null;

    // Find image by matching the last 12 characters of ID
    return images.find(img => {
      const imgShortId = img._id.slice(-12);
      return imgShortId === shortId;
    }) || null;
  }, [imageSlugFromUrl, images, isMobileState]);

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

  const currentImageIds = useMemo(() => new Set(filteredImages.map(img => img._id)), [filteredImages]);

  // IntersectionObserver-based preloading for image type detection
  // Only preload images that are approaching the viewport
  useEffect(() => {
    if (images.length === 0) return;

    // Limit concurrent preloads to avoid overwhelming the browser
    const MAX_CONCURRENT_PRELOADS = 5;
    let activePreloads = 0;
    const pendingPreloads = new Set<string>(); // Track images being preloaded
    const preloadQueue: Array<Image> = []; // Queue for images waiting to be preloaded

    // Function to preload a single image to detect its type
    const preloadImage = (img: Image) => {
      if (activePreloads >= MAX_CONCURRENT_PRELOADS) {
        // Add to queue if not already there
        if (!preloadQueue.includes(img) && !pendingPreloads.has(img._id)) {
          preloadQueue.push(img);
        }
        return;
      }

      if (imageTypes.has(img._id) || pendingPreloads.has(img._id)) {
        return; // Already processed or in progress
      }

      activePreloads++;
      pendingPreloads.add(img._id);

      const testImg = new Image();
      testImg.crossOrigin = 'anonymous';

      const cleanup = () => {
        activePreloads--;
        pendingPreloads.delete(img._id);
        // Process next in queue
        if (preloadQueue.length > 0 && activePreloads < MAX_CONCURRENT_PRELOADS) {
          const next = preloadQueue.shift();
          if (next && !imageTypes.has(next._id) && !pendingPreloads.has(next._id)) {
            preloadImage(next);
          }
        }
      };

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

        cleanup();
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

        cleanup();
      };

      // Use thumbnail or small URL for faster detection
      testImg.src = img.thumbnailUrl || img.smallUrl || img.imageUrl;
    };

    // Find all image grid items that need type detection
    const imageElements = document.querySelectorAll('[data-image-id]');
    const observers: IntersectionObserver[] = [];

    // Optimize rootMargin based on connection speed
    interface NavigatorWithConnection extends Navigator {
      connection?: { effectiveType?: string };
      mozConnection?: { effectiveType?: string };
      webkitConnection?: { effectiveType?: string };
    }
    const nav = navigator as NavigatorWithConnection;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
    const isSlowConnection = connection && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g');
    const rootMargin = isSlowConnection 
      ? imageGridConfig.preload.slowConnectionMargin 
      : imageGridConfig.preload.normalConnectionMargin;

    imageElements.forEach((element) => {
      const imageId = element.getAttribute('data-image-id');
      if (!imageId) return;

      const img = images.find(i => i._id === imageId);
      if (!img) return;

      // Skip if already processed
      if (imageTypes.has(img._id)) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              // Image is approaching viewport, preload it
              if (!imageTypes.has(img._id) && !pendingPreloads.has(img._id)) {
                preloadImage(img);
              }
              // Disconnect after first intersection (one-time check)
              observer.disconnect();
            }
          });
        },
        {
          rootMargin,
          threshold: imageGridConfig.intersectionThreshold,
        }
      );

      observer.observe(element);
      observers.push(observer);
    });

    // Preload first images immediately (above the fold)
    // These are critical for initial render
    const eagerImages = images.slice(0, imageGridConfig.eagerImageCount).filter(img => 
      !imageTypes.has(img._id) && 
      !pendingPreloads.has(img._id) &&
      (img.thumbnailUrl || img.smallUrl || img.imageUrl)
    );

    eagerImages.forEach(img => {
      preloadImage(img);
    });

    // Cleanup
    return () => {
      observers.forEach(observer => observer.disconnect());
    };
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
      {Array.from({ length: imageGridConfig.eagerImageCount }).map((_, index) => (
        <div
          key={`skeleton-${index}`}
          className={`masonry-item ${index % 3 === 0 ? 'portrait' : 'landscape'}`}
        >
          <Skeleton className="w-full h-full min-h-[200px] rounded-lg" />
        </div>
      ))}
    </div>
  );


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
          {filteredImages.length > 0 ? filteredImages.map((image, index) => {
            // Get image type and aspect ratio
            const imageType = imageTypes.get(image._id);
            const aspectRatio = imageAspectRatios.get(image._id);
            
            // If type is not determined yet, we still render but with a stable default
            // The preload will determine the type quickly, and handleImageLoad will update it
            // Use 'landscape' as default but ensure consistent sizing
            const displayType = imageType || 'landscape';
            
            // Load first 12 images eagerly (above the fold + buffer)
            // This improves LCP (Largest Contentful Paint) for initial view
            const isEager = index < imageGridConfig.eagerImageCount;
            
            return (
              <ImageGridItem
                key={image._id}
                image={image}
                imageType={displayType}
                aspectRatio={aspectRatio}
                eager={isEager}
                onSelect={(img) => {
                  // MOBILE ONLY: Navigate to ImagePage instead of opening modal
                  if (isMobileState) {
                    // Set flag to indicate we're opening from grid
                    sessionStorage.setItem(appConfig.storage.imagePageFromGridKey, 'true');
                    // Pass images via state for navigation
                    const slug = generateImageSlug(img.imageTitle, img._id);
                    navigate(`/photos/${slug}`, {
                      state: { 
                        images,
                        fromGrid: true 
                      }
                    });
                    return;
                  }

                  // DESKTOP: Use modal (existing behavior)
                  // Set flag to indicate we're opening from grid (not refresh)
                  sessionStorage.setItem(appConfig.storage.imagePageFromGridKey, 'true');

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

      {/* Image Modal - shown as overlay when image param exists - DESKTOP ONLY */}
      {/* On mobile, we navigate to ImagePage instead */}
      {selectedImage && !isMobileState && window.innerWidth > appConfig.mobileBreakpoint && (
        <Suspense fallback={null}>
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
              sessionStorage.setItem(appConfig.storage.imagePageFromGridKey, 'true');
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
        </Suspense>
      )}
    </div>
  );
});

ImageGrid.displayName = 'ImageGrid';

export default ImageGrid;

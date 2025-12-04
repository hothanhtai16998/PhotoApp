import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import type { Image } from '@/types/image';
import MasonryGrid from '@/components/MasonryGrid';
import { useImageGridState, useImageGridCategory, useImageGridColumns } from '@/pages/ImageGrid/hooks';
import { useInfiniteScroll } from '@/components/image/hooks/useInfiniteScroll';
import { downloadImage } from '@/utils/downloadService';
import { Skeleton } from '@/components/ui/skeleton';
import { Heart, Download, Share2, Plus, ChevronLeft, ChevronRight, X, Eye } from 'lucide-react';
import { CategoryNavigation } from '@/components/CategoryNavigation';
import './UnsplashModalTest.css';

// Preload modal images for visible images in viewport
const useImagePreloader = (images: Image[], preloadCache: React.MutableRefObject<Map<string, HTMLImageElement>>) => {
  useEffect(() => {
    // Don't run if no images
    if (!images || images.length === 0) return;

    // Preload modal images for all visible images
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const imageId = entry.target.getAttribute('data-image-id');
            const image = images.find(img => img._id === imageId);
            if (image) {
              const modalImageUrl = image.regularUrl || image.imageUrl || image.smallUrl;
              if (modalImageUrl && !preloadCache.current.has(modalImageUrl)) {
                const img = new Image();
                img.onload = () => {
                  preloadCache.current.set(modalImageUrl, img);
                };
                img.src = modalImageUrl;
              }
            }
          }
        });
      },
      { rootMargin: '300px' } // Start preloading 300px before image enters viewport
    );

    // Use setTimeout to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      const items = document.querySelectorAll('[data-image-id]');
      items.forEach(item => observer.observe(item));
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      const items = document.querySelectorAll('[data-image-id]');
      items.forEach(item => observer.unobserve(item));
    };
  }, [images, preloadCache]);
};

/**
 * Test page to replicate Unsplash's image modal behavior
 * Based on analysis of how Unsplash displays images when clicked
 */
export default function UnsplashModalTest() {
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [placeholderLoaded, setPlaceholderLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const preloadCache = useRef<Map<string, HTMLImageElement>>(new Map());

  // Category management
  const { category } = useImageGridCategory();

  // Image state and data fetching
  const {
    loading,
    isLoadingMore,
    hasMore,
    filteredImages,
    imageTypes,
    processedImages,
    currentImageIds,
    handleLoadMore,
    handleImageLoad,
  } = useImageGridState({ category });
  
  // Preload modal images for visible images (after filteredImages is defined)
  useImagePreloader(filteredImages || [], preloadCache);

  // Responsive columns
  const columnCount = useImageGridColumns();

  // Infinite scroll
  const { loadMoreRef } = useInfiniteScroll({
    hasMore,
    isLoading: loading || isLoadingMore,
    onLoadMore: handleLoadMore,
  });

  const handleImageClick = useCallback((image: Image) => {
    setSelectedImage(image);
    setImageLoaded(false);
    setPlaceholderLoaded(false);

    const modalImageUrl = image.regularUrl || image.imageUrl || image.smallUrl;
    // Use smallUrl or thumbnailUrl as placeholder (smaller, faster to load)
    const placeholderUrl = image.smallUrl || image.thumbnailUrl || image.imageUrl;

    // Check if placeholder is cached synchronously (like ProgressiveImage does)
    let placeholderCached = false;
    if (placeholderUrl && typeof window !== 'undefined') {
      try {
        const testImg = new Image();
        testImg.src = placeholderUrl;
        // If complete immediately, it's cached
        if (testImg.complete && testImg.naturalWidth > 0) {
          placeholderCached = true;
        }
      } catch {
        // Ignore errors
      }
    }

    // If placeholder is cached, show modal immediately
    // Otherwise, wait for placeholder to load first
    if (placeholderCached) {
      setIsModalOpen(true);
      setPlaceholderLoaded(true);
    } else {
      // Load placeholder first, then show modal
      const placeholderImg = new Image();
      placeholderImg.onload = () => {
        setIsModalOpen(true);
        setPlaceholderLoaded(true);
        // Now load the main image
        loadMainImage(modalImageUrl, image.imageUrl);
      };
      placeholderImg.onerror = () => {
        // Even if placeholder fails, show modal
        setIsModalOpen(true);
        setPlaceholderLoaded(true);
        loadMainImage(modalImageUrl, image.imageUrl);
      };
      placeholderImg.src = placeholderUrl;
      return;
    }

    // Load main image
    loadMainImage(modalImageUrl, image.imageUrl);
    
    function loadMainImage(modalUrl: string | undefined, gridUrl: string | undefined) {
      // Check if modal image is the same as grid image
      if (modalUrl === gridUrl) {
        setImageLoaded(true);
        return;
      }

      // Check if already preloaded
      if (modalUrl && preloadCache.current.has(modalUrl)) {
        const cachedImg = preloadCache.current.get(modalUrl);
        if (cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0) {
          setImageLoaded(true);
          return;
        }
      }

      // Load full image
      if (modalUrl) {
        const fullImg = new Image();
        fullImg.onload = () => {
          if (fullImg.complete && fullImg.naturalWidth > 0) {
            setImageLoaded(true);
            preloadCache.current.set(modalUrl, fullImg);
          }
        };
        fullImg.src = modalUrl;
      }
    }
  }, []);


  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  useEffect(() => {
    if (selectedImage && filteredImages.length > 0) {
      const index = filteredImages.findIndex(img => img._id === selectedImage._id);
      if (index !== -1) {
        setCurrentImageIndex(index);
      }
    }
  }, [selectedImage, filteredImages]);

  // Use useLayoutEffect to ensure placeholder is ready before paint (like ProgressiveImage)
  useLayoutEffect(() => {
    if (isModalOpen && selectedImage && !placeholderLoaded) {
      const placeholderUrl = selectedImage.smallUrl || selectedImage.thumbnailUrl || selectedImage.imageUrl;
      
      if (placeholderUrl) {
        // Synchronously check if placeholder is cached
        const testImg = new Image();
        testImg.src = placeholderUrl;
        
        // If cached, mark as loaded before paint
        if (testImg.complete && testImg.naturalWidth > 0) {
          setPlaceholderLoaded(true);
        }
      }
    }
  }, [isModalOpen, selectedImage, placeholderLoaded]);

  // Keyboard navigation
  useEffect(() => {
    if (!isModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseModal();
      } else if (e.key === 'ArrowLeft' && currentImageIndex > 0) {
        e.preventDefault();
        handleImageClick(filteredImages[currentImageIndex - 1]);
      } else if (e.key === 'ArrowRight' && currentImageIndex < filteredImages.length - 1) {
        e.preventDefault();
        handleImageClick(filteredImages[currentImageIndex + 1]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, currentImageIndex, filteredImages, handleImageClick]);

  // Scroll lock when modal is open
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [isModalOpen]);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedImage(null);
    setImageLoaded(false);
  };

  const handlePreviousImage = () => {
    if (currentImageIndex > 0) {
      handleImageClick(filteredImages[currentImageIndex - 1]);
    }
  };

  const handleNextImage = () => {
    if (currentImageIndex < filteredImages.length - 1) {
      handleImageClick(filteredImages[currentImageIndex + 1]);
    }
  };

  const handleShare = () => {
    if (navigator.share && selectedImage) {
      navigator.share({
        title: selectedImage.imageTitle || 'Photo',
        url: window.location.href,
      }).catch(() => {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(window.location.href);
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  // Download handler
  const handleDownload = async (image: Image, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await downloadImage(image);
    } catch (error) {
      console.error('Failed to download image:', error);
    }
  };

  if (!selectedImage) {
    return (
      <div className="unsplash-test-page">
        <div className="test-header">
          <h1>Unsplash Modal Test - Image Grid</h1>
          <p className="test-description">Click any image to open modal with Unsplash-style loading. Change category to test if images flash.</p>
        </div>

        {/* Category Navigation */}
        <CategoryNavigation />

        <div className="test-grid-container">
          {loading && filteredImages.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} className="w-full h-64" />
              ))}
            </div>
          ) : (
            <MasonryGrid
              images={filteredImages}
              onImageClick={handleImageClick}
              columnCount={columnCount}
              onDownload={handleDownload}
              onDownloadWithSize={handleDownload}
              onAddToCollection={() => {}}
            />
          )}
          <div ref={loadMoreRef} />
          {isLoadingMore && <p className="text-center py-4">Loading more...</p>}
        </div>
      </div>
    );
  }

  const modalImageUrl = selectedImage.regularUrl || selectedImage.imageUrl || selectedImage.smallUrl;
  // Use grid image as placeholder - it's already loaded, so appears instantly
  const placeholderUrl = selectedImage.imageUrl || selectedImage.smallUrl || selectedImage.regularUrl;

  return (
    <div className="unsplash-test-page">
      <div className="test-header">
        <h1>Unsplash Modal Test - Image Grid</h1>
        <p className="test-description">Click any image to open modal with Unsplash-style loading. Change category to test if images flash.</p>
      </div>

      {/* Category Navigation */}
      <CategoryNavigation />

      <div className="test-grid-container">
        {loading && filteredImages.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="w-full h-64" />
            ))}
          </div>
        ) : (
          <MasonryGrid
            images={filteredImages}
            onImageClick={handleImageClick}
            columnCount={columnCount}
            onDownload={handleDownload}
            onDownloadWithSize={handleDownload}
            onAddToCollection={() => {}}
          />
        )}
        <div ref={loadMoreRef} />
        {isLoadingMore && <p className="text-center py-4">Loading more...</p>}
      </div>

      {isModalOpen && selectedImage && (
        <div className="unsplash-modal-overlay" onClick={handleCloseModal}>
          <div className="unsplash-modal-container" onClick={(e) => e.stopPropagation()}>
            {/* Top Bar */}
            <div className="unsplash-modal-top-bar">
              {/* Left: Author Info */}
              <div className="unsplash-modal-author-info">
                <img
                  src={selectedImage.uploadedBy?.avatarUrl || '/default-avatar.png'}
                  alt={selectedImage.uploadedBy?.displayName || selectedImage.uploadedBy?.username || 'User'}
                  className="unsplash-modal-avatar"
                />
                <div className="unsplash-modal-author-details">
                  <div className="unsplash-modal-author-name">
                    {selectedImage.uploadedBy?.displayName || selectedImage.uploadedBy?.username || 'Unknown'}
                  </div>
                  <div className="unsplash-modal-author-secondary">
                    {selectedImage.imageTitle || 'Untitled'}
                  </div>
                </div>
                <button className="unsplash-modal-follow-btn">Follow</button>
              </div>

              {/* Right: Actions */}
              <div className="unsplash-modal-actions">
                <button className="unsplash-modal-action-btn" title="Add to collection">
                  <Plus size={20} />
                </button>
                <button className="unsplash-modal-action-btn" title="Share" onClick={handleShare}>
                  <Share2 size={20} />
                </button>
                <button 
                  className="unsplash-modal-close"
                  onClick={handleCloseModal}
                  aria-label="Close modal"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Image Container */}
            <div className="unsplash-modal-image-container">
            {/* Placeholder - always visible immediately, fades out when image loads */}
            <div 
              className={`unsplash-modal-placeholder ${imageLoaded ? 'fade-out' : ''}`}
              style={{
                backgroundImage: placeholderUrl ? `url(${placeholderUrl})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />

              {/* Navigation Arrows */}
              {currentImageIndex > 0 && (
                <button
                  className="unsplash-modal-nav unsplash-modal-nav-left"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePreviousImage();
                  }}
                  aria-label="Previous image"
                >
                  <ChevronLeft size={24} />
                </button>
              )}
              {currentImageIndex < filteredImages.length - 1 && (
                <button
                  className="unsplash-modal-nav unsplash-modal-nav-right"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNextImage();
                  }}
                  aria-label="Next image"
                >
                  <ChevronRight size={24} />
                </button>
              )}

              {/* Main image - fades in when loaded */}
              {modalImageUrl && (
                <img
                  ref={imgRef}
                  src={modalImageUrl}
                  alt={selectedImage.imageTitle || 'Photo'}
                  className={`unsplash-modal-image ${imageLoaded ? 'loaded' : 'loading'}`}
                  style={{
                    opacity: imageLoaded ? 1 : 0,
                    transition: imageLoaded ? 'opacity 0.2s ease-in' : 'none',
                    width: 'auto',
                    height: 'auto',
                    maxWidth: '100%',
                    maxHeight: 'calc(100vh - 240px)',
                    aspectRatio: selectedImage.width && selectedImage.height 
                      ? `${selectedImage.width} / ${selectedImage.height}` 
                      : undefined,
                    objectFit: 'contain',
                    loading: 'eager',
                    fetchPriority: 'high',
                  }}
                  onLoad={(e) => {
                    const img = e.currentTarget;
                    // Ensure image is fully loaded and decoded before showing
                    if (img.complete && img.naturalWidth > 0) {
                      // Use useLayoutEffect timing - but since we're in onLoad, use RAF
                      // This ensures smooth transition after image is ready
                      requestAnimationFrame(() => {
                        setImageLoaded(true);
                        if (modalImageUrl && imgRef.current) {
                          preloadCache.current.set(modalImageUrl, imgRef.current);
                        }
                      });
                    }
                  }}
                />
              )}
            </div>

            {/* Bottom Bar */}
            <div className="unsplash-modal-bottom-bar">
              {/* Left: Metadata */}
              <div className="unsplash-modal-metadata">
                {selectedImage.views !== undefined && (
                  <div className="unsplash-modal-meta-item">
                    <Eye size={16} />
                    <span>{selectedImage.views.toLocaleString()}</span>
                  </div>
                )}
                {selectedImage.downloads !== undefined && (
                  <div className="unsplash-modal-meta-item">
                    <Download size={16} />
                    <span>{selectedImage.downloads.toLocaleString()}</span>
                  </div>
                )}
                {selectedImage.cameraModel && (
                  <div className="unsplash-modal-meta-item">
                    <span>{selectedImage.cameraModel}</span>
                  </div>
                )}
                {selectedImage.tags && selectedImage.tags.length > 0 && (
                  <div className="unsplash-modal-tags">
                    {selectedImage.tags.slice(0, 3).map((tag, idx) => (
                      <span key={idx} className="unsplash-modal-tag">{tag}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: Download Button */}
              <button
                className="unsplash-modal-download-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload(selectedImage, e);
                }}
              >
                <Download size={16} />
                <span>Download free</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


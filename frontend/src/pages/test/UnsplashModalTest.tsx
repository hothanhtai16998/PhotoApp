import { useState, useRef } from 'react';
import type { Image } from '@/types/image';
import MasonryGrid from '@/components/MasonryGrid';
import { useImageGridState, useImageGridCategory, useImageGridColumns } from '@/pages/ImageGrid/hooks';
import { useInfiniteScroll } from '@/components/image/hooks/useInfiniteScroll';
import { downloadImage } from '@/utils/downloadService';
import { Skeleton } from '@/components/ui/skeleton';
import { CategoryNavigation } from '@/components/CategoryNavigation';
import { X } from 'lucide-react';
import './UnsplashModalTest.css';

/**
 * Test page for Unsplash-style modal
 */
export default function UnsplashModalTest() {
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Category management
  const { category } = useImageGridCategory();

  // Image state and data fetching
  const {
    loading,
    isLoadingMore,
    hasMore,
    filteredImages,
    handleLoadMore,
  } = useImageGridState({ category });

  // Responsive columns
  const columnCount = useImageGridColumns();

  // Infinite scroll
  const { loadMoreRef } = useInfiniteScroll({
    hasMore,
    isLoading: loading || isLoadingMore,
    onLoadMore: handleLoadMore,
  });

  // Image click handler - open modal
  const handleImageClick = (image: Image) => {
    setSelectedImage(image);
    setIsModalOpen(true);
    setImageLoaded(false); // Reset loaded state for new image
  };

  // Close modal handler
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedImage(null);
    setImageLoaded(false);
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

  // Download with size handler
  const handleDownloadWithSize = async (image: Image, _size: 'small' | 'medium' | 'large' | 'original') => {
    try {
      await downloadImage(image);
    } catch (error) {
      console.error('Failed to download image:', error);
    }
  };

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
            onDownloadWithSize={handleDownloadWithSize}
            onAddToCollection={() => { }}
          />
        )}
        <div ref={loadMoreRef} />
        {isLoadingMore && <p className="text-center py-4">Loading more...</p>}
      </div>

      {/* Modal */}
      {isModalOpen && selectedImage && (
        <div
          className="unsplash-modal-overlay"
          onClick={handleCloseModal}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
          }}
        >
          <div
            className="unsplash-modal-container"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '1400px',
              maxHeight: 'calc(100vh - 80px)',
              background: '#ffffff',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            {/* Close button */}
            <button
              onClick={handleCloseModal}
              aria-label="Close modal"
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                zIndex: 10,
                background: 'rgba(255, 255, 255, 0.9)',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={20} />
            </button>

            {/* Image Container */}
            <div
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '400px',
                maxHeight: 'calc(100vh - 80px)',
                background: '#f0f0f0',
                overflow: 'hidden',
              }}
            >
              {/* Blurred placeholder - show while loading */}
              {!imageLoaded && (
                <img
                  src={selectedImage.smallUrl || selectedImage.thumbnailUrl || selectedImage.imageUrl}
                  alt=""
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    filter: 'blur(20px)',
                    transform: 'scale(1.1)',
                    zIndex: 1,
                  }}
                />
              )}

              {/* Main image */}
              <img
                ref={imgRef}
                key={selectedImage._id}
                src={selectedImage.regularUrl || selectedImage.imageUrl || selectedImage.smallUrl}
                alt={selectedImage.imageTitle || 'Photo'}
                onLoad={() => {
                  setImageLoaded(true);
                }}
                style={{
                  position: 'relative',
                  zIndex: 2,
                  maxWidth: '100%',
                  maxHeight: 'calc(100vh - 80px)',
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain',
                  display: 'block',
                  opacity: imageLoaded ? 1 : 0,
                  transition: 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

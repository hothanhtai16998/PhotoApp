import { useEffect, useCallback, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import type { Image } from '@/types/image';
import { downloadImage } from '@/utils/downloadService';
import { toast } from 'sonner';
import './TestImageModal.css';

interface TestImageModalProps {
  image: Image;
  images: Image[];
  onClose: () => void;
  onNavigate: (image: Image) => void;
}

const TestImageModal = ({ image, images, onClose, onNavigate }: TestImageModalProps) => {
  const currentIndex = images.findIndex(img => img._id === image._id);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < images.length - 1;
  const [highQualityLoaded, setHighQualityLoaded] = useState(false);

  const handlePrevious = useCallback(() => {
    if (hasPrevious) {
      const prevImage = images[currentIndex - 1];
      if (prevImage) {
        onNavigate(prevImage);
      }
    }
  }, [hasPrevious, currentIndex, images, onNavigate]);

  const handleNext = useCallback(() => {
    if (hasNext) {
      const nextImage = images[currentIndex + 1];
      if (nextImage) {
        onNavigate(nextImage);
      }
    }
  }, [hasNext, currentIndex, images, onNavigate]);

  const handleDownload = useCallback(async () => {
    try {
      await downloadImage(image, 'original');
      toast.success(`Downloaded: ${image.imageTitle}`);
    } catch (_error) {
      toast.error('Download failed');
    }
  }, [image]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, handlePrevious, handleNext]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="test-image-modal-overlay" onClick={handleBackdropClick}>
      <div className="test-image-modal-content">
        {/* Close Button */}
        <button className="test-modal-close" onClick={onClose} aria-label="Close">
          <X size={24} />
        </button>

        {/* Previous Button */}
        {hasPrevious && (
          <button
            className="test-modal-nav test-modal-nav-prev"
            onClick={handlePrevious}
            aria-label="Previous image"
          >
            <ChevronLeft size={32} />
          </button>
        )}

        {/* Next Button */}
        {hasNext && (
          <button
            className="test-modal-nav test-modal-nav-next"
            onClick={handleNext}
            aria-label="Next image"
          >
            <ChevronRight size={32} />
          </button>
        )}

        {/* Image Container */}
        <div className="test-modal-image-container" key={image._id}>
          {/* Low quality thumbnail - always visible first */}
          <img
            src={image.thumbnailUrl || image.smallUrl || image.imageUrl}
            alt={image.imageTitle || 'Image'}
            className={`test-modal-image test-modal-image-thumbnail ${highQualityLoaded ? 'hidden' : ''}`}
          />
          {/* High quality image - loads on top */}
          <img
            src={image.imageUrl}
            alt={image.imageTitle || 'Image'}
            className={`test-modal-image test-modal-image-full ${highQualityLoaded ? 'loaded' : ''}`}
            onLoad={() => setHighQualityLoaded(true)}
          />
        </div>

        {/* Image Info */}
        <div className="test-modal-info">
          <div className="test-modal-info-content">
            <div className="test-modal-title-section">
              <h2>{image.imageTitle || 'Untitled'}</h2>
              {image.description && <p className="test-modal-description">{image.description}</p>}
            </div>

            <div className="test-modal-meta">
              <div className="test-modal-author">
                {image.uploadedBy.avatarUrl && (
                  <img
                    src={image.uploadedBy.avatarUrl}
                    alt={image.uploadedBy.displayName}
                    className="test-modal-avatar"
                  />
                )}
                <div className="test-modal-author-info">
                  <div className="test-modal-author-name">{image.uploadedBy.displayName}</div>
                  {image.uploadedBy.bio && (
                    <div className="test-modal-author-bio">{image.uploadedBy.bio}</div>
                  )}
                </div>
              </div>

              <button className="test-modal-download-btn" onClick={handleDownload}>
                <Download size={18} />
                Download
              </button>
            </div>

            <div className="test-modal-details">
              <div className="test-modal-detail-item">
                <span className="label">Dimensions:</span>
                <span className="value">{image.width} × {image.height}</span>
              </div>
              <div className="test-modal-detail-item">
                <span className="label">Type:</span>
                <span className="value">
                  {image.height > image.width ? 'Portrait' :
                   image.width > image.height ? 'Landscape' : 'Square'}
                </span>
              </div>
              {image.views !== undefined && (
                <div className="test-modal-detail-item">
                  <span className="label">Views:</span>
                  <span className="value">{image.views.toLocaleString()}</span>
                </div>
              )}
              {image.downloads !== undefined && (
                <div className="test-modal-detail-item">
                  <span className="label">Downloads:</span>
                  <span className="value">{image.downloads.toLocaleString()}</span>
                </div>
              )}
            </div>

            <div className="test-modal-navigation-info">
              <span>Image {currentIndex + 1} of {images.length}</span>
              <span className="test-modal-hint">Use ← → arrow keys to navigate</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestImageModal;

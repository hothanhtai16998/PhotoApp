import { useEffect, useState, useRef } from 'react';
import type { Image } from '@/types/image';
import EditImageModal from './EditImageModal';
import CollectionModal from './CollectionModal';
import { useImageModal } from './image/hooks/useImageModal';
import { useImageZoom } from './image/hooks/useImageZoom';
import { useImageModalActions } from './image/hooks/useImageModalActions';
import { useRelatedImages } from './image/hooks/useRelatedImages';
import { ImageModalHeader } from './image/ImageModalHeader';
import { ImageModalContent } from './image/ImageModalContent';
import { ImageModalSidebar } from './image/ImageModalSidebar';
import { ImageModalRelated } from './image/ImageModalRelated';
import { useUserStore } from '@/stores/useUserStore';
import { appConfig } from '@/config/appConfig';
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
  renderAsPage?: boolean; // When true, renders as page (no overlay)
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
  renderAsPage = false,
}: ImageModalProps) => {
  const modalContentRef = useRef<HTMLDivElement>(null);
  const { user } = useUserStore();

  // Detect mobile to show author banner on mobile regardless of renderAsPage
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth <= appConfig.mobileBreakpoint;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= appConfig.mobileBreakpoint);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Image zoom functionality
  const zoomProps = useImageZoom({
    minZoom: 1,
    maxZoom: 5,
    zoomStep: 0.25,
    doubleClickZoom: 2,
  });

  // Actions hook
  const {
    showEditModal,
    showCollectionModal,
    handleDownloadWithSize,
    handleEdit,
    handleEditClose,
    handleEditUpdate,
    handleOpenCollection,
    handleCollectionClose,
    handleViewProfile,
  } = useImageModalActions({
    image,
    onImageSelect,
    onClose,
  });

  // Use the custom hook for modal state and logic
  const {
    views,
    downloads,
    isFavorited,
    isTogglingFavorite,
    modalPlaceholderSrc,
    modalImageSrc,
    isModalImageLoaded,
    setIsModalImageLoaded,
    handleToggleFavorite,
  } = useImageModal({
    image,
    images,
    onImageSelect,
    onClose,
    onDownload,
    onDownloadWithSize: handleDownloadWithSize,
  });

  // Related images hook
  const {
    relatedImages,
    hasMoreRelatedImages,
    isLoadingRelatedImages,
    loadMoreRef: relatedImagesLoadMoreRef,
  } = useRelatedImages({
    image,
    images,
    modalContentRef,
  });

  // Add zoom keyboard shortcuts
  useEffect(() => {
    const { zoom, isZoomed, zoomIn, zoomOut, resetZoom } = zoomProps;
    if (!isZoomed && zoom === 1) return;

    const handleKeyboard = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomIn();
      } else if (e.key === '-') {
        e.preventDefault();
        zoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        resetZoom();
      }
    };

    document.addEventListener('keydown', handleKeyboard);
    return () => document.removeEventListener('keydown', handleKeyboard);
  }, [zoomProps]);

  // Lock body scroll when modal is open (only when rendered as modal, not page)
  useEffect(() => {
    if (!renderAsPage) {
      // Store current scroll position
      const scrollY = window.scrollY;

      // Calculate scrollbar width to prevent layout shift
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

      // Use both overflow hidden AND position fixed for maximum scroll prevention
      // This ensures scroll is prevented on all browsers and devices
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
      // Add class to body to indicate modal is open (for other components to check)
      document.body.classList.add('image-modal-open');
      // Add padding to compensate for scrollbar to prevent layout shift
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`;
      }

      // Prevent scroll events on overlay and redirect to modal content
      const handleOverlayWheel = (e: WheelEvent) => {
        e.preventDefault();
        e.stopPropagation();
        // Redirect scroll to modal content if it exists
        const modalContent = document.querySelector('.image-modal-content') as HTMLElement;
        if (modalContent) {
          const delta = e.deltaY;
          modalContent.scrollTop += delta;
        }
      };

      // Prevent touch scrolling on overlay
      const handleOverlayTouchMove = (e: TouchEvent) => {
        const target = e.target as HTMLElement;
        // Allow touch scrolling within modal content
        if (target.closest('.image-modal-content')) {
          return;
        }
        e.preventDefault();
      };

      // Prevent scroll events from reaching body - more aggressive approach
      const preventBodyScroll = (e: Event) => {
        const target = e.target as Element;
        // Allow scrolling within modal content only
        const modalContent = target.closest('.image-modal-content');
        if (modalContent) {
          // Check if the scroll event is actually on the modal content element
          if (target === modalContent || modalContent.contains(target)) {
            return; // Allow this scroll
          }
        }
        // Prevent all other scrolling - be aggressive
        e.preventDefault();
        e.stopPropagation();
        return false;
      };

      // Prevent scroll events on document and window
      const preventScroll = (e: Event) => {
        const target = e.target as Element;
        // Only allow scrolling within modal content
        const modalContent = target.closest('.image-modal-content');
        if (modalContent) {
          // Check if the scroll event is actually on the modal content element
          if (target === modalContent || modalContent.contains(target)) {
            return; // Allow this scroll
          }
        }
        // Prevent everything else
        e.preventDefault();
        e.stopPropagation();
        return false;
      };

      // Additional handler specifically for scroll events (not wheel/touch)
      const preventScrollEvent = (e: Event) => {
        // For scroll events, we need to check if it's the window/document scrolling
        // If it's not the modal content scrolling, prevent it
        const target = e.target as Element;
        if (target === document.documentElement || target === document.body) {
          // This is a body/document scroll - prevent it
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
        // Allow scroll events within modal content
        if (target.closest('.image-modal-content')) {
          return;
        }
        // Prevent all other scroll events
        e.preventDefault();
        e.stopPropagation();
        return false;
      };

      // Wait for overlay to be rendered
      const timer = setTimeout(() => {
        const overlay = document.querySelector('.image-modal-overlay') as HTMLElement;
        if (overlay) {
          overlay.addEventListener('wheel', handleOverlayWheel, { passive: false });
          overlay.addEventListener('touchmove', handleOverlayTouchMove, { passive: false });
        }
      }, 0);

      // Prevent scroll events at multiple levels - use capture phase to catch early
      // Use preventScrollEvent for scroll events specifically
      document.addEventListener('scroll', preventScrollEvent, { passive: false, capture: true });
      document.documentElement.addEventListener('scroll', preventScrollEvent, { passive: false, capture: true });
      document.body.addEventListener('scroll', preventScrollEvent, { passive: false, capture: true });
      window.addEventListener('scroll', preventScrollEvent, { passive: false, capture: true });

      // Use preventScroll for wheel and touchmove
      document.addEventListener('wheel', preventScroll, { passive: false, capture: true });
      document.addEventListener('touchmove', preventScroll, { passive: false, capture: true });
      window.addEventListener('wheel', preventBodyScroll, { passive: false, capture: true });
      window.addEventListener('touchmove', preventBodyScroll, { passive: false, capture: true });

      // Also prevent on body and documentElement directly
      document.body.addEventListener('wheel', preventScroll, { passive: false, capture: true });
      document.body.addEventListener('touchmove', preventScroll, { passive: false, capture: true });
      document.documentElement.addEventListener('wheel', preventScroll, { passive: false, capture: true });
      document.documentElement.addEventListener('touchmove', preventScroll, { passive: false, capture: true });

      // Prevent keyboard scrolling on body (but allow in modal content)
      const handleKeyboardScroll = (e: KeyboardEvent) => {
        const target = e.target as HTMLElement;
        // Allow keyboard scrolling within modal content and input fields
        if (target.closest('.image-modal-content') ||
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable) {
          return;
        }

        // Prevent keyboard scrolling on body
        if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(e.key)) {
          e.preventDefault();
        }
      };

      document.addEventListener('keydown', handleKeyboardScroll, { passive: false });

      // Cleanup
      return () => {
        clearTimeout(timer);
        const overlay = document.querySelector('.image-modal-overlay') as HTMLElement;
        if (overlay) {
          overlay.removeEventListener('wheel', handleOverlayWheel);
          overlay.removeEventListener('touchmove', handleOverlayTouchMove);
        }

        document.removeEventListener('scroll', preventScrollEvent, { capture: true } as EventListenerOptions);
        document.documentElement.removeEventListener('scroll', preventScrollEvent, { capture: true } as EventListenerOptions);
        document.body.removeEventListener('scroll', preventScrollEvent, { capture: true } as EventListenerOptions);
        window.removeEventListener('scroll', preventScrollEvent, { capture: true } as EventListenerOptions);
        document.removeEventListener('wheel', preventScroll, { capture: true } as EventListenerOptions);
        document.removeEventListener('touchmove', preventScroll, { capture: true } as EventListenerOptions);
        window.removeEventListener('wheel', preventBodyScroll, { capture: true } as EventListenerOptions);
        window.removeEventListener('touchmove', preventBodyScroll, { capture: true } as EventListenerOptions);
        document.body.removeEventListener('wheel', preventScroll, { capture: true } as EventListenerOptions);
        document.body.removeEventListener('touchmove', preventScroll, { capture: true } as EventListenerOptions);
        document.documentElement.removeEventListener('wheel', preventScroll, { capture: true } as EventListenerOptions);
        document.documentElement.removeEventListener('touchmove', preventScroll, { capture: true } as EventListenerOptions);
        document.removeEventListener('keydown', handleKeyboardScroll);

        // Restore body scrolling
        document.documentElement.style.overflow = '';
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.width = '';
        document.body.classList.remove('image-modal-open');
        document.body.style.paddingRight = '';

        // Restore scroll position
        window.scrollTo(0, scrollY);
      };
    }
    return undefined;
  }, [renderAsPage]);

  return (
    <>
      {!renderAsPage && (
        <div
          className="image-modal-overlay"
          onClick={onClose}
        />
      )}
      <div
        className={`image-modal ${renderAsPage ? 'image-modal-page' : ''}`}
        onClick={(e) => !renderAsPage && e.stopPropagation()}
        onWheel={(e) => {
          // Prevent scroll events from bubbling to body
          if (!renderAsPage) {
            e.stopPropagation();
            // If scrolling on modal (not content), redirect to content
            const target = e.target as HTMLElement;
            if (!target.closest('.image-modal-content')) {
              e.preventDefault();
              const modalContent = modalContentRef.current;
              if (modalContent) {
                modalContent.scrollTop += e.deltaY;
              }
            }
          }
        }}
      >
        {/* Modal Header */}
        <ImageModalHeader
          image={image}
          user={user}
          isMobile={isMobile}
          renderAsPage={renderAsPage}
          isFavorited={isFavorited}
          handleToggleFavorite={handleToggleFavorite}
          handleDownloadWithSize={handleDownloadWithSize}
          handleViewProfile={handleViewProfile}
          handleOpenCollection={handleOpenCollection}
          onClose={onClose}
          modalContentRef={modalContentRef}
          onImageSelect={onImageSelect}
        />

        {/* Modal Image Content - Scrollable */}
        <div
          className="image-modal-content"
          ref={modalContentRef}
        >
          {/* Main Image with Zoom */}
          <ImageModalContent
            image={image}
            imageTypes={imageTypes}
            modalImageSrc={modalImageSrc}
            modalPlaceholderSrc={modalPlaceholderSrc}
            isModalImageLoaded={isModalImageLoaded}
            setIsModalImageLoaded={setIsModalImageLoaded}
            zoomProps={zoomProps}
          />

          {/* Modal Footer / Sidebar */}
          <ImageModalSidebar
            image={image}
            views={views}
            downloads={downloads}
            isFavorited={isFavorited}
            isTogglingFavorite={isTogglingFavorite}
            user={user}
            handleToggleFavorite={handleToggleFavorite}
            handleOpenCollection={handleOpenCollection}
            handleEdit={handleEdit}
            onClose={onClose}
          />

          {/* Related Images Section */}
          <ImageModalRelated
            relatedImages={relatedImages}
            hasMoreRelatedImages={hasMoreRelatedImages}
            isLoadingRelatedImages={isLoadingRelatedImages}
            imageTypes={imageTypes}
            currentImageIds={currentImageIds}
            processedImages={processedImages}
            onImageSelect={onImageSelect}
            onImageLoad={onImageLoad}
            modalContentRef={modalContentRef}
            loadMoreRef={relatedImagesLoadMoreRef}
          />
        </div>
      </div>

      {/* Edit Image Modal */}
      <EditImageModal
        image={image}
        isOpen={showEditModal}
        onClose={handleEditClose}
        onUpdate={handleEditUpdate}
      />

      {/* Collection Modal */}
      <CollectionModal
        isOpen={showCollectionModal}
        onClose={handleCollectionClose}
        imageId={image._id}
        onCollectionUpdate={() => {
          // Optionally refresh data if needed
        }}
      />
    </>
  );
};

export default ImageModal;

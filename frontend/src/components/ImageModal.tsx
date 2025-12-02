import { useEffect, useState, useRef } from 'react';
import type { Image } from '@/types/image';
import EditImageModal from './EditImageModal';
import CollectionModal from './CollectionModal';
import { useImageModal } from './image/hooks/useImageModal';
import { useImageZoom } from './image/hooks/useImageZoom';
import { useImageModalActions } from './image/hooks/useImageModalActions';
import { useRelatedImages } from './image/hooks/useRelatedImages';
import { useScrollLock } from '@/hooks/useScrollLock';
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
  useScrollLock(!renderAsPage, '.image-modal-content');

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

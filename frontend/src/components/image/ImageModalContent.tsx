import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useMemo } from 'react';
import type { Image } from '@/types/image';
import type { UseImageZoomReturn } from './hooks/useImageZoom';
import {
  getImageClassName,
  generateModalSrcSet,
  getModalImageStyles,
  MODAL_IMAGE
} from './imageModalUtils';
import { t } from '@/i18n';

interface ImageModalContentProps {
  image: Image;
  imageTypes: Map<string, 'portrait' | 'landscape'>;
  modalImageSrc: string | null;
  modalPlaceholderSrc: string | null;
  isModalImageLoaded: boolean;
  setIsModalImageLoaded: (loaded: boolean) => void;
  zoomProps: UseImageZoomReturn;
  wasCachedInitially: boolean;
}

export const ImageModalContent = ({
  image,
  imageTypes,
  modalImageSrc,
  modalPlaceholderSrc,
  isModalImageLoaded,
  setIsModalImageLoaded,
  zoomProps,
  wasCachedInitially,
}: ImageModalContentProps) => {
  // Use modalImageSrc if available, otherwise fallback to image URLs
  const imageSrc = modalImageSrc || image.regularUrl || image.imageUrl || image.smallUrl || '';

  // Compute values once
  const imageType = (imageTypes.get(image._id) ?? 'landscape') as 'portrait' | 'landscape';
  const imageStyles = useMemo(() => getModalImageStyles(modalPlaceholderSrc), [modalPlaceholderSrc]);
  const imageClassName = getImageClassName(isModalImageLoaded, imageType);

  // Generate srcSets
  const avifSrcSet = useMemo(
    () => generateModalSrcSet(
      image.thumbnailAvifUrl,
      image.smallAvifUrl,
      image.regularAvifUrl,
      image.imageAvifUrl
    ),
    [image.thumbnailAvifUrl, image.smallAvifUrl, image.regularAvifUrl, image.imageAvifUrl]
  );

  const webpSrcSet = useMemo(
    () => generateModalSrcSet(
      image.thumbnailUrl,
      image.smallUrl,
      image.regularUrl,
      image.imageUrl
    ),
    [image.thumbnailUrl, image.smallUrl, image.regularUrl, image.imageUrl]
  );

  const {
    zoom,
    pan,
    isZoomed,
    containerRef: zoomContainerRef,
    imageRef: zoomImageRef,
    zoomIn,
    zoomOut,
    resetZoom,
    handleDoubleClick,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = zoomProps;

  // Track previous image to detect changes and reset loaded state
  const prevImageIdRef = useRef<string | null>(null);

  // Reset loaded state when image changes to prevent showing old image
  useEffect(() => {
    const imageChanged = prevImageIdRef.current !== image._id;
    if (imageChanged) {
      prevImageIdRef.current = image._id;
      // Only force loading state if we don't already have the image cached.
      if (!wasCachedInitially) {
        setIsModalImageLoaded(false);
      }
    };
  }, [image._id, setIsModalImageLoaded, wasCachedInitially]);

  // Shared image load handler
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setIsModalImageLoaded(true);
    // Update class if orientation was misdetected
    const img = e.currentTarget;
    const isPortraitImg = img.naturalHeight > img.naturalWidth;
    const shouldBePortrait = isPortraitImg;
    if (shouldBePortrait !== (imageType === 'portrait')) {
      img.classList.toggle('landscape', !shouldBePortrait);
      img.classList.toggle('portrait', shouldBePortrait);
    }
  };

  return (
    <div
      className="modal-main-image-container"
      ref={zoomContainerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        cursor: isZoomed ? (zoom > 1 ? 'grab' : 'default') : 'zoom-in',
        userSelect: 'none',
        touchAction: 'none',
      }}
    >
      <div
        className="modal-image-wrapper"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
          transition: 'none',
        }}
      >
        {avifSrcSet || webpSrcSet ? (
          <picture>
            {avifSrcSet && (
              <source
                srcSet={avifSrcSet}
                type="image/avif"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 98vw, 1920px"
              />
            )}
            {webpSrcSet && (
              <source
                srcSet={webpSrcSet}
                type="image/webp"
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 98vw, 1920px"
              />
            )}
            <img
              ref={zoomImageRef}
              src={imageSrc}
              key={image._id}
              alt={image.imageTitle ?? 'Photo'}
              style={imageStyles}
              className={imageClassName}
              loading="eager"
              decoding="async"
              fetchPriority="high"
              crossOrigin="anonymous"
              onDoubleClick={handleDoubleClick}
              draggable={false}
              onLoad={handleImageLoad}
            />
          </picture>
        ) : (
          <img
            ref={zoomImageRef}
            src={imageSrc}
            key={image._id}
            alt={image.imageTitle ?? 'Photo'}
            style={imageStyles}
            className={imageClassName}
            loading="eager"
            decoding="async"
            fetchPriority="high"
            crossOrigin="anonymous"
            onDoubleClick={handleDoubleClick}
            draggable={false}
            onLoad={handleImageLoad}
          />
        )}
      </div>

      {/* Zoom Controls */}
      {isZoomed && (
        <div className="modal-zoom-controls">
          <button
            className="modal-zoom-btn"
            onClick={zoomOut}
            title={t('zoom.out')}
            aria-label={t('zoom.out')}
          >
            <ZoomOut size={MODAL_IMAGE.ZOOM_ICON_SIZE} />
          </button>
          <span className="modal-zoom-level">
            {Math.round(zoom * MODAL_IMAGE.ZOOM_PERCENTAGE_MULTIPLIER)}%
          </span>
          <button
            className="modal-zoom-btn"
            onClick={zoomIn}
            disabled={zoom >= MODAL_IMAGE.MAX_ZOOM}
            title={t('zoom.in')}
            aria-label={t('zoom.in')}
          >
            <ZoomIn size={MODAL_IMAGE.ZOOM_ICON_SIZE} />
          </button>
          <button
            className="modal-zoom-btn"
            onClick={resetZoom}
            title={t('zoom.reset')}
            aria-label={t('zoom.reset')}
          >
            <RotateCcw size={MODAL_IMAGE.ZOOM_ICON_SIZE} />
          </button>
        </div>
      )}
    </div>
  );
};


import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { useEffect, useRef } from 'react';
import type { Image } from '@/types/image';
import type { UseImageZoomReturn } from './hooks/useImageZoom';

interface ImageModalContentProps {
  image: Image;
  imageTypes: Map<string, 'portrait' | 'landscape'>;
  modalImageSrc: string | null;
  modalPlaceholderSrc: string | null;
  isModalImageLoaded: boolean;
  setIsModalImageLoaded: (loaded: boolean) => void;
  zoomProps: UseImageZoomReturn;
}

export const ImageModalContent = ({
  image,
  imageTypes,
  modalImageSrc,
  modalPlaceholderSrc,
  isModalImageLoaded,
  setIsModalImageLoaded,
  zoomProps,
}: ImageModalContentProps) => {
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

  // Track previous image to detect changes
  const prevImageIdRef = useRef<string | null>(null);

  // Update image src manually without re-rendering to prevent flash
  useEffect(() => {
    const img = zoomImageRef.current;
    if (!img) return;

    const imageChanged = prevImageIdRef.current !== image._id;
    if (!imageChanged) return;

    prevImageIdRef.current = image._id;

    // Update src without causing React re-render
    const newSrc = modalImageSrc ?? image.regularUrl ?? image.smallUrl ?? image.imageUrl;
    if (img.src !== newSrc) {
      img.src = newSrc;
    }
  }, [image._id, modalImageSrc, image.regularUrl, image.smallUrl, image.imageUrl, zoomImageRef]);

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
        {image.imageAvifUrl || image.regularAvifUrl || image.smallAvifUrl || image.thumbnailAvifUrl ? (
          <picture>
            {/* AVIF sources with responsive sizes */}
            <source
              srcSet={
                image.thumbnailAvifUrl && image.smallAvifUrl && image.regularAvifUrl && image.imageAvifUrl
                  ? `${image.thumbnailAvifUrl} 200w, ${image.smallAvifUrl} 800w, ${image.regularAvifUrl} 1080w, ${image.imageAvifUrl} 1920w`
                  : image.regularAvifUrl ?? image.imageAvifUrl ?? ''
              }
              type="image/avif"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 98vw, 1920px"
            />
            {/* WebP sources with responsive sizes (fallback) */}
            <source
              srcSet={
                image.thumbnailUrl && image.smallUrl && image.regularUrl && image.imageUrl
                  ? `${image.thumbnailUrl} 200w, ${image.smallUrl} 800w, ${image.regularUrl} 1080w, ${image.imageUrl} 1920w`
                  : undefined
              }
              type="image/webp"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 98vw, 1920px"
            />
            {/* Fallback img element with blur-up technique */}
            <img
              ref={zoomImageRef}
              alt={image.imageTitle ?? 'Photo'}
              style={{
                backgroundImage: modalPlaceholderSrc
                  ? `url("${modalPlaceholderSrc}")`
                  : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundColor: '#f0f0f0',
                maxWidth: '100%',
                maxHeight: 'calc(100vh - 240px)',
                width: 'auto',
                height: 'auto',
              }}
              className={`modal-image ${isModalImageLoaded ? 'loaded' : 'loading'} ${(imageTypes.get(image._id) ?? 'landscape') === 'landscape' ? 'landscape' : 'portrait'}`}
              loading="eager"
              decoding="async"
              fetchPriority="high"
              onDoubleClick={handleDoubleClick}
              draggable={false}
              onLoad={(e) => {
                setIsModalImageLoaded(true);
                // Update class if orientation was misdetected
                const img = e.currentTarget;
                const isPortraitImg = img.naturalHeight > img.naturalWidth;
                const currentType = imageTypes.get(image._id) ?? 'landscape';
                const shouldBePortrait = isPortraitImg;
                if (shouldBePortrait !== (currentType === 'portrait')) {
                  img.classList.toggle('landscape', !shouldBePortrait);
                  img.classList.toggle('portrait', shouldBePortrait);
                }
              }}
            />
          </picture>
        ) : (
          <img
            ref={zoomImageRef}
            srcSet={
              image.thumbnailUrl && image.smallUrl && image.regularUrl && image.imageUrl
                ? `${image.thumbnailUrl} 200w, ${image.smallUrl} 800w, ${image.regularUrl} 1080w, ${image.imageUrl} 1920w`
                : undefined
            }
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 98vw, 1920px"
            alt={image.imageTitle || 'Photo'}
            style={{
              backgroundImage: modalPlaceholderSrc
                ? `url("${modalPlaceholderSrc}")`
                : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundColor: '#f0f0f0',
              maxWidth: '100%',
              maxHeight: 'calc(100vh - 240px)',
              width: 'auto',
              height: 'auto',
            }}
            className={`modal-image ${isModalImageLoaded ? 'loaded' : 'loading'} ${(imageTypes.get(image._id) ?? 'landscape') === 'landscape' ? 'landscape' : 'portrait'}`}
            loading="eager"
            decoding="async"
            fetchPriority="high"
            crossOrigin="anonymous"
            onDoubleClick={handleDoubleClick}
            draggable={false}
            onLoad={(e) => {
              setIsModalImageLoaded(true);
              // Update class if orientation was misdetected
              const img = e.currentTarget;
              const isPortraitImg = img.naturalHeight > img.naturalWidth;
              const currentType = imageTypes.get(image._id) || 'landscape';
              const shouldBePortrait = isPortraitImg;
              if (shouldBePortrait !== (currentType === 'portrait')) {
                img.classList.toggle('landscape', !shouldBePortrait);
                img.classList.toggle('portrait', shouldBePortrait);
              }
            }}
          />
        )}
      </div>

      {/* Zoom Controls */}
      {isZoomed && (
        <div className="modal-zoom-controls">
          <button
            className="modal-zoom-btn"
            onClick={zoomOut}
            title="Thu nhỏ"
            aria-label="Thu nhỏ"
          >
            <ZoomOut size={18} />
          </button>
          <span className="modal-zoom-level">{Math.round(zoom * 100)}%</span>
          <button
            className="modal-zoom-btn"
            onClick={zoomIn}
            disabled={zoom >= 5}
            title="Phóng to"
            aria-label="Phóng to"
          >
            <ZoomIn size={18} />
          </button>
          <button
            className="modal-zoom-btn"
            onClick={resetZoom}
            title="Đặt lại (Esc)"
            aria-label="Đặt lại zoom"
          >
            <RotateCcw size={18} />
          </button>
        </div>
      )}
    </div>
  );
};


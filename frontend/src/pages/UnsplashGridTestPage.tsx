
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useImageStore } from '@/stores/useImageStore';
import { UnsplashGridLayout } from '@/components/unsplash/UnsplashGridLayout';
import ProgressiveImage from '@/components/ProgressiveImage';
import { toast } from 'sonner';
import api from '@/lib/axios';

export default function UnsplashGridTestPage() {
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const { images, loading, fetchImages } = useImageStore();

  // Grid configuration
  const [columnCount, setColumnCount] = useState(3);
  const [columnWidth, setColumnWidth] = useState(400);
  const gap = 16;

  // Image metadata
  const [imageTypes, setImageTypes] = useState<Map<string, 'portrait' | 'landscape'>>(new Map());
  const [imageAspectRatios, setImageAspectRatios] = useState<Map<string, number>>(new Map());
  const processedImages = useRef<Set<string>>(new Set());

  // Modal state
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);

  // Responsive columns based on viewport
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setColumnCount(1);
        setColumnWidth(width - 32);
      } else if (width < 1024) {
        setColumnCount(2);
        setColumnWidth((width - 48) / 2);
      } else if (width < 1536) {
        setColumnCount(3);
        setColumnWidth((width - 64) / 3);
      } else {
        setColumnCount(4);
        setColumnWidth((width - 80) / 4);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch images on mount
  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  // Preload image metadata (aspect ratios)
  useEffect(() => {
    if (images.length === 0) return;

    const MAX_CONCURRENT_PRELOADS = 5;
    let activePreloads = 0;
    const pendingPreloads = new Set<string>();
    const preloadQueue: Image[] = [];

    const preloadImage = (img: Image) => {
      if (activePreloads >= MAX_CONCURRENT_PRELOADS) {
        if (!preloadQueue.includes(img) && !pendingPreloads.has(img._id)) {
          preloadQueue.push(img);
        }
        return;
      }

      if (imageTypes.has(img._id) || pendingPreloads.has(img._id)) {
        return;
      }

      activePreloads++;
      pendingPreloads.add(img._id);

      const testImg = new Image();
      testImg.crossOrigin = 'anonymous';

      const cleanup = () => {
        activePreloads--;
        pendingPreloads.delete(img._id);
        if (preloadQueue.length > 0 && activePreloads < MAX_CONCURRENT_PRELOADS) {
          const next = preloadQueue.shift();
          if (next && !imageTypes.has(next._id) && !pendingPreloads.has(next._id)) {
            preloadImage(next);
          }
        }
      };

      testImg.onload = () => {
        const aspectRatio = testImg.naturalWidth / testImg.naturalHeight;
        setImageAspectRatios((prev) => {
          if (prev.has(img._id)) return prev;
          const newMap = new Map(prev);
          newMap.set(img._id, aspectRatio);
          return newMap;
        });

        const isPortrait = testImg.naturalHeight > testImg.naturalWidth;
        setImageTypes((prev) => {
          if (prev.has(img._id)) return prev;
          const newMap = new Map(prev);
          newMap.set(img._id, isPortrait ? 'portrait' : 'landscape');
          return newMap;
        });

        cleanup();
      };

      testImg.onerror = cleanup;
      testImg.src = img.imageUrl;
    };

    images.forEach((img) => {
      if (!processedImages.current.has(img._id)) {
        processedImages.current.add(img._id);
        preloadImage(img);
      }
    });
  }, [images, imageTypes, imageAspectRatios]);

  const handleImageClick = useCallback(
    (image: Image) => {
      setSelectedImage(image);
    },
    []
  );

  const renderImage = useCallback(
    (image: Image, height: number) => (
      <ProgressiveImage
        src={image.imageUrl}
        thumbnailUrl={image.thumbnailUrl}
        smallUrl={image.smallUrl}
        regularUrl={image.regularUrl}
        alt={image.imageTitle}
        className="w-full h-full object-cover"
      />
    ),
    []
  );

  return (
    <div className="min-h-screen bg-white">
      <div className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-3xl font-bold">Unsplash-Style Grid Test</h1>
          <p className="text-gray-600 mt-1">Column-based masonry layout with dynamic balancing</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading images...</p>
            </div>
          </div>
        ) : images.length === 0 ? (
          <div className="flex items-center justify-center h-96">
            <p className="text-gray-600">No images found</p>
          </div>
        ) : (
          <UnsplashGridLayout
            images={images}
            columnCount={columnCount}
            gap={gap}
            columnWidth={columnWidth}
            imageTypes={imageTypes}
            imageAspectRatios={imageAspectRatios}
            onImageClick={handleImageClick}
            renderImage={renderImage}
          />
        )}
      </div>
    </div>
  );
}

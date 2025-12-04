import { useEffect, useState, useRef, useLayoutEffect } from 'react';
import type { Image } from '@/types/image';

interface UseImagePreloadReturn {
  placeholderSrc: string; // Small/thumbnail URL for background-image (blur-up)
  imageSrc: string; // Full image URL for src
  isLoaded: boolean;
  setIsLoaded: (loaded: boolean) => void;
}

// Global cache to track loaded images across modal navigation
const modalImageCache = new Set<string>();

/**
 * Check if an image URL is already loaded in browser cache
 */
const isImageCached = (url: string): Promise<boolean> => {
  return new Promise((resolve) => {
    if (modalImageCache.has(url)) {
      resolve(true);
      return;
    }

    const img = new Image();
    // Removed crossOrigin to avoid CORS issues
    // img.crossOrigin = 'anonymous';
    let resolved = false;

    const resolveOnce = (value: boolean) => {
      if (!resolved) {
        resolved = true;
        if (value) {
          modalImageCache.add(url);
        }
        resolve(value);
      }
    };

    // Short timeout - if image loads quickly, it's cached
    const timeout = setTimeout(() => resolveOnce(false), 50);

    img.onload = () => {
      clearTimeout(timeout);
      resolveOnce(true);
    };
    img.onerror = () => {
      clearTimeout(timeout);
      resolveOnce(false);
    };

    img.src = url;
  });
};

/**
 * Custom hook for blur-up image loading (Unsplash-style)
 * Uses a small placeholder as background-image and full image as src
 * This prevents flashing by always showing the placeholder until full image loads
 */
export const useImagePreload = (image: Image): UseImagePreloadReturn => {
  const [placeholderSrc, setPlaceholderSrc] = useState<string>('');
  const [imageSrc, setImageSrc] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);
  const currentImageIdRef = useRef<string | null>(null);
  const previousImageIdRef = useRef<string | null>(null);
  const imageObjectsRef = useRef<HTMLImageElement[]>([]);

  // Use useLayoutEffect for synchronous state updates to prevent flashing
  // This is intentional - we need synchronous updates to prevent visual flashing
  useLayoutEffect(() => {
    const imageId = image._id;
    previousImageIdRef.current = imageId;
    currentImageIdRef.current = imageId;

    // Placeholder: Use smallest available (thumbnailUrl > smallUrl > regularUrl)
    const placeholder =
      image.thumbnailUrl ||
      image.smallUrl ||
      image.regularUrl ||
      image.imageUrl ||
      '';

    // Full image: Use regularUrl (1080px) or imageUrl (full size)
    const fullImage =
      image.regularUrl || image.imageUrl || image.smallUrl || '';

    // Set immediately (synchronous) to prevent flashing
    // Note: Linter warns about setState in useLayoutEffect, but this is intentional
    // to prevent visual flashing when changing images
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlaceholderSrc(placeholder);
    setImageSrc(fullImage);
  }, [
    image._id,
    image.thumbnailUrl,
    image.smallUrl,
    image.regularUrl,
    image.imageUrl,
  ]);

  // Use useEffect for async operations and cleanup
  useEffect(() => {
    const imageId = image._id;
    const imageChanged = previousImageIdRef.current !== imageId;

    // Cleanup previous image objects
    imageObjectsRef.current.forEach((img) => {
      img.src = '';
      img.onload = null;
      img.onerror = null;
    });
    imageObjectsRef.current = [];

    const fullImage =
      image.regularUrl || image.imageUrl || image.smallUrl || '';

    // Check cache before resetting isLoaded to prevent flashing
    if (fullImage) {
      // Quick synchronous check - if image is already complete, it's cached
      const testImg = new Image();
      testImg.crossOrigin = 'anonymous';
      testImg.src = fullImage;

      if (testImg.complete && testImg.naturalWidth > 0) {
        // Image is already loaded (browser cache)
        modalImageCache.add(fullImage);
        // Set state synchronously to prevent flashing - this is intentional
        // Note: This triggers a linter warning, but it's necessary to prevent flashing
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setIsLoaded(true);
      } else {
        // Check cache asynchronously
        isImageCached(fullImage).then((cached) => {
          if (currentImageIdRef.current === imageId) {
            if (cached) {
              setIsLoaded(true);
            } else if (imageChanged) {
              // Only reset if image actually changed and not cached
              setIsLoaded(false);
            }
          }
        });
      }
    } else if (imageChanged) {
      setIsLoaded(false);
    }

    // If we have a full-size imageUrl and it's different from regularUrl, preload it
    if (
      image.imageUrl &&
      image.imageUrl !== image.regularUrl &&
      image.regularUrl
    ) {
      const fullSizeImg = new Image();
      fullSizeImg.crossOrigin = 'anonymous';
      imageObjectsRef.current.push(fullSizeImg);

      fullSizeImg.onload = () => {
        // Upgrade to full size after it's loaded
        if (currentImageIdRef.current === imageId) {
          modalImageCache.add(image.imageUrl!);
          setImageSrc(image.imageUrl);
        }
      };
      fullSizeImg.onerror = () => {
        // If full size fails, keep the regularUrl
        console.warn('Failed to preload full-size image');
      };
      fullSizeImg.src = image.imageUrl;
    }

    // Cleanup function
    return () => {
      // Cleanup image objects when component unmounts or image changes
      imageObjectsRef.current.forEach((img) => {
        img.src = '';
        img.onload = null;
        img.onerror = null;
      });
      imageObjectsRef.current = [];
    };
  }, [
    image._id,
    image.thumbnailUrl,
    image.smallUrl,
    image.regularUrl,
    image.imageUrl,
  ]);

  return {
    placeholderSrc,
    imageSrc,
    isLoaded,
    setIsLoaded,
  };
};

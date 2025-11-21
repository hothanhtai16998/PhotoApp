import { useEffect, useState, useRef } from 'react';
import type { Image } from '@/types/image';

interface UseImagePreloadReturn {
  imageSrc: string;
  isLoaded: boolean;
  setIsLoaded: (loaded: boolean) => void;
}

/**
 * Custom hook for progressive image preloading
 * Starts with a smaller size (regularUrl) and upgrades to full size (imageUrl) in background
 */
export const useImagePreload = (image: Image): UseImagePreloadReturn => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState(false);
  const currentImageIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Reset state when image changes
    setIsLoaded(false);
    currentImageIdRef.current = image._id;

    // Start with regularUrl (1080px) for better performance, fallback to smallUrl or imageUrl
    const initialSrc = image.regularUrl || image.smallUrl || image.imageUrl;
    setImageSrc(initialSrc || '');

    // If we have a full-size imageUrl and it's different from initial, preload it in background
    if (image.imageUrl && image.imageUrl !== initialSrc && (image.regularUrl || image.smallUrl)) {
      const fullSizeImg = new Image();
      fullSizeImg.onload = () => {
        // Upgrade to full size after initial load completes
        if (currentImageIdRef.current === image._id) {
          setImageSrc(image.imageUrl);
        }
      };
      fullSizeImg.onerror = () => {
        // If full size fails, keep the initial src
        console.warn('Failed to preload full-size image');
      };
      fullSizeImg.src = image.imageUrl;
    }
  }, [image._id, image.regularUrl, image.smallUrl, image.imageUrl]);

  return {
    imageSrc,
    isLoaded,
    setIsLoaded,
  };
};


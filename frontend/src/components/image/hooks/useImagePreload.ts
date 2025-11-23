import { useEffect, useState, useRef } from 'react';
import type { Image } from '@/types/image';

interface UseImagePreloadReturn {
  placeholderSrc: string; // Small/thumbnail URL for background-image (blur-up)
  imageSrc: string; // Full image URL for src
  isLoaded: boolean;
  setIsLoaded: (loaded: boolean) => void;
}

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

  useEffect(() => {
    // Reset state when image changes
    setIsLoaded(false);
    currentImageIdRef.current = image._id;

    // Placeholder: Use smallest available (thumbnailUrl > smallUrl > regularUrl)
    // This will be used as background-image for instant display
    const placeholder =
      image.thumbnailUrl ||
      image.smallUrl ||
      image.regularUrl ||
      image.imageUrl ||
      '';
    setPlaceholderSrc(placeholder);

    // Full image: Use regularUrl (1080px) or imageUrl (full size)
    // This will be used as src and will load on top of the placeholder
    const fullImage =
      image.regularUrl || image.imageUrl || image.smallUrl || '';
    setImageSrc(fullImage);

    // If we have a full-size imageUrl and it's different from regularUrl, preload it
    if (
      image.imageUrl &&
      image.imageUrl !== image.regularUrl &&
      image.regularUrl
    ) {
      const fullSizeImg = new Image();
      fullSizeImg.crossOrigin = 'anonymous';
      fullSizeImg.onload = () => {
        // Upgrade to full size after it's loaded
        if (currentImageIdRef.current === image._id) {
          setImageSrc(image.imageUrl);
        }
      };
      fullSizeImg.onerror = () => {
        // If full size fails, keep the regularUrl
        console.warn('Failed to preload full-size image');
      };
      fullSizeImg.src = image.imageUrl;
    }
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

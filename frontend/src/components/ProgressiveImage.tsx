import { useState, useEffect, useLayoutEffect, useRef, useCallback, memo } from 'react';
import './ProgressiveImage.css';

interface ProgressiveImageProps {
  src: string;
  thumbnailUrl?: string;
  smallUrl?: string;
  regularUrl?: string;
  // AVIF versions for better compression
  thumbnailAvifUrl?: string;
  smallAvifUrl?: string;
  regularAvifUrl?: string;
  imageAvifUrl?: string;
  alt: string;
  className?: string;
  onLoad?: (img: HTMLImageElement) => void;
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

/**
 * Fallback to original URL if size-specific URLs are not available
 * (for backward compatibility with old images)
 */
const generateThumbnailUrl = (imageUrl: string): string => {
  return imageUrl;
};

/**
 * Fallback to original URL if size-specific URLs are not available
 */
const generateSmallUrl = (imageUrl: string): string => {
  return imageUrl;
};

// Module-level cache to persist loaded image URLs across component mounts
// This prevents flashing when navigating back to the grid
const globalLoadedImages = new Set<string>();

/**
 * Check if an image is already loaded in the browser cache
 * Returns true if image loads quickly (likely cached)
 */
const isImageCached = (url: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    let resolved = false;

    const resolveOnce = (value: boolean) => {
      if (!resolved) {
        resolved = true;
        resolve(value);
      }
    };

    // Set a short timeout - if image loads quickly, it's likely cached
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
 * ProgressiveImage component - loads images progressively like Unsplash
 * 1. Shows blur-up placeholder (thumbnail)
 * 2. Loads small size for grid view
 * 3. Optionally loads full size on hover/click
 */
const ProgressiveImage = memo(({
  src,
  thumbnailUrl,
  smallUrl,
  thumbnailAvifUrl,
  smallAvifUrl,
  regularAvifUrl,
  imageAvifUrl,
  alt,
  className = '',
  onLoad,
  onError,
}: ProgressiveImageProps) => {
  // Generate URLs on-the-fly if not provided (for old images)
  const effectiveThumbnail = thumbnailUrl || generateThumbnailUrl(src);
  const effectiveSmall = smallUrl || generateSmallUrl(src);

  // AVIF URLs (fallback to WebP if not available)
  const effectiveThumbnailAvif = thumbnailAvifUrl || effectiveThumbnail;
  const effectiveSmallAvif = smallAvifUrl || effectiveSmall;
  const effectiveOriginalAvif = imageAvifUrl || src;

  // Check if image was already loaded (from global cache or browser cache)
  // Synchronously check cache to prevent any flash
  const isCached = globalLoadedImages.has(effectiveSmall) || globalLoadedImages.has(effectiveThumbnail);
  const cachedSrc = globalLoadedImages.has(effectiveSmall) ? effectiveSmall : effectiveThumbnail;

  // Also check if image might be in browser cache by creating a test image
  // This helps catch images that were loaded but not added to global cache
  let browserCached = false;
  if (!isCached && typeof window !== 'undefined') {
    try {
      const testImg = new Image();
      testImg.crossOrigin = 'anonymous';
      // Set src to check if it's in browser cache
      // If complete is true immediately after setting src, it's cached
      const testUrl = effectiveSmall !== effectiveThumbnail ? effectiveSmall : effectiveThumbnail;
      testImg.src = testUrl;
      // Check if image is already complete (cached)
      if (testImg.complete && testImg.naturalWidth > 0) {
        browserCached = true;
        // Add to global cache for future use
        globalLoadedImages.add(testUrl);
      }
    } catch (e) {
      // Ignore errors in cache check
    }
  }

  const isActuallyCached = isCached || browserCached;
  const finalCachedSrc = isCached ? cachedSrc : (browserCached ? (effectiveSmall !== effectiveThumbnail ? effectiveSmall : effectiveThumbnail) : effectiveThumbnail);

  const [currentSrc, setCurrentSrc] = useState<string>(finalCachedSrc);
  const [isLoaded, setIsLoaded] = useState(isActuallyCached);
  const [skipTransition, setSkipTransition] = useState(isActuallyCached); // Skip transition for cached images
  const [isError, setIsError] = useState(false);
  const [shouldLoadEagerly, setShouldLoadEagerly] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const loadedSrcs = useRef<Set<string>>(new Set());
  const preloadedRef = useRef<boolean>(false);

  // Callback ref to check if image is already loaded when element mounts
  // This runs synchronously when React attaches the ref, before paint
  const setImgRef = useCallback((node: HTMLImageElement | null) => {
    imgRef.current = node;
    if (node) {
      // Immediately check if image is complete (browser cache)
      if (node.complete && node.naturalWidth > 0) {
        // Image is already loaded in browser, force immediate visibility
        node.style.setProperty('opacity', '1', 'important');
        node.style.setProperty('transition', 'none', 'important');
        // Add to global cache for future use
        globalLoadedImages.add(node.src);
        if (!isLoaded) {
          setIsLoaded(true);
          setSkipTransition(true);
        }
      } else if (isLoaded || skipTransition || isActuallyCached) {
        // Image is in our cache, force immediate visibility
        node.style.setProperty('opacity', '1', 'important');
        node.style.setProperty('transition', 'none', 'important');
        // Check if src is in cache
        const imgSrc = node.src || currentSrc;
        if (globalLoadedImages.has(imgSrc)) {
          node.style.setProperty('opacity', '1', 'important');
          node.style.setProperty('transition', 'none', 'important');
        }
      }
    }
  }, [isLoaded, skipTransition, isActuallyCached, currentSrc]);

  // Reset state when src changes - but preserve loaded state if already loaded
  useEffect(() => {
    const currentSrcValue = effectiveThumbnail;
    // Only reset if src actually changed
    if (currentSrc !== currentSrcValue) {
      // Check multiple sources for cached state
      const isInGlobalCache = globalLoadedImages.has(effectiveSmall) || globalLoadedImages.has(effectiveThumbnail);
      const isInLocalCache = loadedSrcs.current.has(effectiveSmall) || loadedSrcs.current.has(effectiveThumbnail);

      if (isInGlobalCache || isInLocalCache) {
        // Image was already loaded, restore immediately without transition
        setCurrentSrc(effectiveSmall !== effectiveThumbnail && globalLoadedImages.has(effectiveSmall) ? effectiveSmall : currentSrcValue);
        setIsLoaded(true);
        setSkipTransition(true); // Skip transition for cached images
      } else {
        // New src, check browser cache asynchronously
        // But set initial state optimistically - if it's not in cache, it will reset
        const targetUrl = effectiveSmall !== effectiveThumbnail ? effectiveSmall : effectiveThumbnail;
        isImageCached(targetUrl).then((cached) => {
          if (cached) {
            setCurrentSrc(targetUrl);
            setIsLoaded(true);
            setSkipTransition(true);
            globalLoadedImages.add(targetUrl);
          } else {
            // Not cached, reset state
            setCurrentSrc(currentSrcValue);
            setIsLoaded(false);
            setSkipTransition(false);
            setIsError(false);
            setShouldLoadEagerly(false);
            preloadedRef.current = false;
          }
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, effectiveThumbnail, effectiveSmall]);

  // Use useLayoutEffect to check cache synchronously before paint
  // This prevents any flash by ensuring cached images are marked as loaded before render
  useLayoutEffect(() => {
    // Double-check cache synchronously before first paint
    if (!isLoaded) {
      const isInCache = globalLoadedImages.has(effectiveSmall) || globalLoadedImages.has(effectiveThumbnail);
      if (isInCache) {
        const cachedUrl = globalLoadedImages.has(effectiveSmall) ? effectiveSmall : effectiveThumbnail;
        setCurrentSrc(cachedUrl);
        setIsLoaded(true);
        setSkipTransition(true);
      }
    }

    // If image element exists, force immediate visibility if cached
    if (imgRef.current) {
      const img = imgRef.current;
      const imgSrc = img.src || currentSrc;

      // Check if this image URL is in the global cache
      if (globalLoadedImages.has(imgSrc) || globalLoadedImages.has(effectiveSmall) || globalLoadedImages.has(effectiveThumbnail)) {
        // Force immediate visibility - set before browser paints
        img.style.setProperty('opacity', '1', 'important');
        img.style.setProperty('transition', 'none', 'important');

        // If image is already complete, it's definitely loaded
        if (img.complete && img.naturalWidth > 0) {
          img.style.setProperty('opacity', '1', 'important');
        }
      }
    }
  }, [isLoaded, skipTransition, effectiveSmall, effectiveThumbnail, currentSrc]);

  // Preload images using Intersection Observer (like Unsplash)
  useEffect(() => {
    if (!containerRef.current || preloadedRef.current) return;

    // If already loaded from cache, skip preloading
    if (isLoaded && skipTransition) {
      preloadedRef.current = true;
      return;
    }

    const loadSmallImage = () => {
      if (effectiveSmall !== effectiveThumbnail && !loadedSrcs.current.has(effectiveSmall) && !globalLoadedImages.has(effectiveSmall)) {
        const smallImg = new Image();
        smallImg.crossOrigin = 'anonymous';
        smallImg.onload = () => {
          loadedSrcs.current.add(effectiveSmall);
          globalLoadedImages.add(effectiveSmall); // Add to global cache
          setCurrentSrc(effectiveSmall);
          setIsLoaded(true);
          setSkipTransition(false); // Allow transition for newly loaded images
          if (onLoad && imgRef.current) {
            onLoad(imgRef.current);
          }
        };
        smallImg.onerror = () => {
          // If small size fails, keep thumbnail
          setIsLoaded(true);
          if (onLoad && imgRef.current) {
            onLoad(imgRef.current);
          }
        };
        smallImg.src = effectiveSmall;
      } else if (globalLoadedImages.has(effectiveSmall)) {
        // Already in global cache, use it immediately
        setCurrentSrc(effectiveSmall);
        setIsLoaded(true);
      }
    };

    // Check if already in viewport
    const rect = containerRef.current.getBoundingClientRect();
    const isInViewport = rect.top < window.innerHeight + 200 && rect.bottom > -200;

    if (isInViewport && !preloadedRef.current) {
      // Already visible, start loading immediately
      preloadedRef.current = true;
      // Use requestAnimationFrame for better performance
      requestAnimationFrame(() => {
        setShouldLoadEagerly(true);
        loadSmallImage();
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !preloadedRef.current) {
            // Image is about to be visible, preload it
            preloadedRef.current = true;
            // Use requestAnimationFrame for better performance
            requestAnimationFrame(() => {
              setShouldLoadEagerly(true);
              loadSmallImage();
            });
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '300px', // Start loading 300px before image enters viewport
      }
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [effectiveThumbnail, effectiveSmall, onLoad]);

  const handleLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.currentTarget;
    const loadedSrc = img.src;

    // If image was already loaded from cache, skip processing to prevent flash
    if (isLoaded && skipTransition && (globalLoadedImages.has(loadedSrc) || loadedSrcs.current.has(loadedSrc))) {
      return;
    }

    // Mark this source as loaded
    loadedSrcs.current.add(loadedSrc);
    globalLoadedImages.add(loadedSrc); // Add to global cache

    // If we just loaded thumbnail, upgrade to small
    if (loadedSrc === effectiveThumbnail && !isLoaded) {
      if (effectiveSmall !== effectiveThumbnail && !loadedSrcs.current.has(effectiveSmall) && !globalLoadedImages.has(effectiveSmall)) {
        // Load the small size in the background
        const nextImg = new Image();
        nextImg.crossOrigin = 'anonymous';
        nextImg.onload = () => {
          loadedSrcs.current.add(effectiveSmall);
          globalLoadedImages.add(effectiveSmall); // Add to global cache
          setCurrentSrc(effectiveSmall);
          setIsLoaded(true);
          setSkipTransition(false); // Allow transition for newly loaded images
          if (onLoad && imgRef.current) {
            onLoad(imgRef.current);
          }
        };
        nextImg.onerror = () => {
          // If next size fails, keep current
          setIsLoaded(true);
          if (onLoad && imgRef.current) {
            onLoad(imgRef.current);
          }
        };
        nextImg.src = effectiveSmall;
        return;
      } else if (globalLoadedImages.has(effectiveSmall)) {
        // Already in global cache, use it immediately
        setCurrentSrc(effectiveSmall);
        setIsLoaded(true);
        if (onLoad && imgRef.current) {
          onLoad(imgRef.current);
        }
        return;
      }
    }

    setIsLoaded(true);
    if (onLoad) onLoad(img);
  };

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setIsError(true);
    if (onError) {
      onError(e);
    } else {
      // Fallback to placeholder
      const target = e.currentTarget;
      target.src = '/placeholder-image.png';
      target.onerror = null;
    }
  };

  // For cached images, always render with loaded state to prevent any flash
  // Never show loading state if image is cached
  const shouldRenderAsLoaded = isLoaded || skipTransition || isActuallyCached;
  const finalClassName = `progressive-image ${shouldRenderAsLoaded ? 'loaded' : 'loading'} ${isError ? 'error' : ''} ${skipTransition ? 'no-transition' : ''}`;

  // Determine which URLs to use based on current state
  const getCurrentUrls = () => {
    if (currentSrc === effectiveSmall) {
      return {
        avif: effectiveSmallAvif,
        webp: effectiveSmall,
      };
    } else if (currentSrc === effectiveThumbnail) {
      return {
        avif: effectiveThumbnailAvif,
        webp: effectiveThumbnail,
      };
    } else {
      return {
        avif: effectiveOriginalAvif,
        webp: currentSrc,
      };
    }
  };

  const { avif: currentAvifUrl, webp: currentWebpUrl } = getCurrentUrls();
  const hasAvif = thumbnailAvifUrl || smallAvifUrl || regularAvifUrl || imageAvifUrl;

  return (
    <div ref={containerRef} className={`progressive-image-wrapper ${className}`}>
      {hasAvif ? (
        // Use <picture> element for AVIF support with WebP fallback
        <picture>
          {/* AVIF source (modern browsers) */}
          <source
            srcSet={currentAvifUrl}
            type="image/avif"
          />
          {/* WebP source (fallback) */}
          <source
            srcSet={currentWebpUrl}
            type="image/webp"
          />
          {/* Fallback img element */}
          <img
            ref={setImgRef}
            src={currentWebpUrl}
            alt={alt}
            className={finalClassName}
            onLoad={handleLoad}
            onError={handleError}
            loading={shouldLoadEagerly || isActuallyCached ? 'eager' : 'lazy'}
            decoding="async"
            crossOrigin="anonymous"
            style={
              skipTransition || isActuallyCached
                ? {
                  opacity: 1,
                  transition: 'none',
                  visibility: 'visible',
                  // Force GPU acceleration for smoother rendering
                  transform: 'translateZ(0)',
                  willChange: 'auto'
                }
                : isLoaded
                  ? { opacity: 1 }
                  : undefined
            }
            data-cached={(skipTransition || isActuallyCached) ? 'true' : undefined}
          />
        </picture>
      ) : (
        // Fallback to regular img for images without AVIF
        <img
          ref={setImgRef}
          src={currentSrc}
          alt={alt}
          className={finalClassName}
          onLoad={handleLoad}
          onError={handleError}
          loading={shouldLoadEagerly || isActuallyCached ? 'eager' : 'lazy'}
          decoding="async"
          crossOrigin="anonymous"
          style={
            skipTransition || isActuallyCached
              ? {
                opacity: 1,
                transition: 'none',
                visibility: 'visible',
                // Force GPU acceleration for smoother rendering
                transform: 'translateZ(0)',
                willChange: 'auto'
              }
              : isLoaded
                ? { opacity: 1 }
                : undefined
          }
          data-cached={(skipTransition || isActuallyCached) ? 'true' : undefined}
        />
      )}
      {/* Blur-up overlay effect while loading - don't show for cached images */}
      {!isLoaded && !skipTransition && effectiveThumbnail && (
        <div
          className="progressive-image-blur"
          style={{
            backgroundImage: `url(${effectiveThumbnail})`,
          }}
        />
      )}
    </div>
  );
});

ProgressiveImage.displayName = 'ProgressiveImage';

export default ProgressiveImage;


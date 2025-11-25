/**
 * Shared image caching utilities
 * Provides consistent image cache checking across components
 */

// Global cache to track loaded images across component mounts
// This prevents flashing when navigating between pages
const globalImageCache = new Set<string>();

// Cache timeout for checking if image is cached (ms)
const CACHE_CHECK_TIMEOUT = 50;

/**
 * Check if an image is already loaded in the browser cache
 * Returns true if image loads quickly (likely cached)
 * 
 * @param url - Image URL to check
 * @param useGlobalCache - Whether to use global cache tracking (default: true)
 * @returns Promise that resolves to true if image is cached, false otherwise
 */
export function isImageCached(
  url: string,
  useGlobalCache: boolean = true
): Promise<boolean> {
  return new Promise((resolve) => {
    // Check global cache first if enabled
    if (useGlobalCache && globalImageCache.has(url)) {
      resolve(true);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    let resolved = false;

    const resolveOnce = (value: boolean) => {
      if (!resolved) {
        resolved = true;
        if (value && useGlobalCache) {
          globalImageCache.add(url);
        }
        resolve(value);
      }
    };

    // Set a short timeout - if image loads quickly, it's likely cached
    const timeout = setTimeout(() => resolveOnce(false), CACHE_CHECK_TIMEOUT);

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
}

/**
 * Add an image URL to the global cache
 * Useful when you know an image has been loaded
 * 
 * @param url - Image URL to add to cache
 */
export function addToImageCache(url: string): void {
  globalImageCache.add(url);
}

/**
 * Remove an image URL from the global cache
 * 
 * @param url - Image URL to remove from cache
 */
export function removeFromImageCache(url: string): void {
  globalImageCache.delete(url);
}

/**
 * Clear all cached image URLs
 */
export function clearImageCache(): void {
  globalImageCache.clear();
}

/**
 * Get the current size of the image cache
 * 
 * @returns Number of cached image URLs
 */
export function getImageCacheSize(): number {
  return globalImageCache.size;
}


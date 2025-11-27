/**
 * Hook to batch favorite status checks for multiple images
 * Reduces API calls by checking all images in one request
 */

import { useEffect, useState, useRef } from 'react';
import { favoriteService } from '@/services/favoriteService';
import { useAuthStore } from '@/stores/useAuthStore';

// Global batching state
const pendingChecks = new Map<string, Set<(result: boolean) => void>>();
const checkTimeoutRef: { current: ReturnType<typeof setTimeout> | null } = { current: null };
const BATCH_DELAY = 100; // Wait 100ms to collect all requests

// Cache for favorite status to allow immediate updates
const favoriteCache = new Map<string, boolean>();

/**
 * Manually update favorite status in cache (called after toggle)
 */
export function updateFavoriteCache(imageId: string, isFavorited: boolean) {
  const validImageId = String(imageId).trim();
  favoriteCache.set(validImageId, isFavorited);
  
  // Immediately notify all callbacks for this image
  const callbacks = pendingChecks.get(validImageId);
  if (callbacks && callbacks.size > 0) {
    // Create a copy of the set to avoid issues during iteration
    const callbacksCopy = new Set(callbacks);
    callbacksCopy.forEach(cb => {
      try {
        cb(isFavorited);
      } catch (error) {
        console.error('Error in favorite callback:', error);
      }
    });
  }
  
  // Also dispatch a custom event for components that might not have registered callbacks yet
  window.dispatchEvent(new CustomEvent('favoriteCacheUpdated', {
    detail: { imageId: validImageId, isFavorited }
  }));
}

/**
 * Hook to get favorite status for an image (batched)
 * @param imageId - Image ID to check
 * @returns Favorite status
 */
export function useBatchedFavoriteCheck(imageId: string | undefined): boolean {
  const { accessToken } = useAuthStore();
  const validImageIdRef = useRef<string | null>(null);
  
  // Initialize state from cache if available
  const getInitialState = () => {
    if (!imageId || !accessToken) return false;
    const validId = String(imageId).trim();
    return favoriteCache.get(validId) ?? false;
  };
  
  const [isFavorited, setIsFavorited] = useState<boolean>(getInitialState);
  const callbackRef = useRef<((result: boolean) => void) | null>(null);

  useEffect(() => {
    if (!accessToken || !imageId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsFavorited(false);
      validImageIdRef.current = null;
      return;
    }

    // Validate MongoDB ObjectId format
    const isValidMongoId = /^[0-9a-fA-F]{24}$/.test(String(imageId).trim());
    if (!isValidMongoId) {
      setIsFavorited(false);
      validImageIdRef.current = null;
      return;
    }

    const validImageId = String(imageId).trim();
    validImageIdRef.current = validImageId;

    // Check cache first for immediate updates
    if (favoriteCache.has(validImageId)) {
      setIsFavorited(favoriteCache.get(validImageId)!);
    }

    // Create callback for this image
    const callback = (result: boolean) => {
      setIsFavorited(result);
      // Update cache when we get a result
      favoriteCache.set(validImageId, result);
    };
    callbackRef.current = callback;

    // Add to pending checks
    if (!pendingChecks.has(validImageId)) {
      pendingChecks.set(validImageId, new Set());
    }
    pendingChecks.get(validImageId)!.add(callback);

    // Clear existing timeout
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current);
    }

    // Schedule batch check
    checkTimeoutRef.current = setTimeout(() => {
      const imageIds = Array.from(pendingChecks.keys());
      
      if (imageIds.length > 0) {
        // Make batch request
        favoriteService.checkFavorites(imageIds)
          .then((response) => {
            if (response && response.favorites && typeof response.favorites === 'object') {
              // Distribute results to all callbacks
              for (const id of imageIds) {
                const callbacks = pendingChecks.get(id);
                if (callbacks) {
                  const isFavorited = response.favorites[id] === true ||
                    response.favorites[String(id)] === true;
                  
                  const favoritedStatus = !!isFavorited;
                  // Update cache
                  favoriteCache.set(id, favoritedStatus);
                  // Notify all callbacks
                  callbacks.forEach(cb => cb(favoritedStatus));
                  pendingChecks.delete(id);
                }
              }
            }
          })
          .catch((error) => {
            console.error('Failed to check favorites:', error);
            // Clear all pending checks on error
            pendingChecks.clear();
          });
      }
    }, BATCH_DELAY);

    // Cleanup
    return () => {
      const callbacks = pendingChecks.get(validImageId);
      if (callbacks && callbackRef.current) {
        callbacks.delete(callbackRef.current);
        if (callbacks.size === 0) {
          pendingChecks.delete(validImageId);
        }
      }
      validImageIdRef.current = null;
    };
  }, [imageId, accessToken]);

  // Listen for cache updates via custom event (for immediate UI updates)
  useEffect(() => {
    if (!validImageIdRef.current) return;

    const handleCacheUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ imageId: string; isFavorited: boolean }>;
      if (customEvent.detail && customEvent.detail.imageId === validImageIdRef.current) {
        setIsFavorited(customEvent.detail.isFavorited);
      }
    };

    window.addEventListener('favoriteCacheUpdated', handleCacheUpdate);
    return () => {
      window.removeEventListener('favoriteCacheUpdated', handleCacheUpdate);
    };
  }, [imageId]);

  return isFavorited;
}


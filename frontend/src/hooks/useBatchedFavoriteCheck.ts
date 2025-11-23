/**
 * Hook to batch favorite status checks for multiple images
 * Reduces API calls by checking all images in one request
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { favoriteService } from '@/services/favoriteService';
import { useAuthStore } from '@/stores/useAuthStore';

// Global batching state
const pendingChecks = new Map<string, Set<(result: boolean) => void>>();
const checkTimeoutRef: { current: ReturnType<typeof setTimeout> | null } = { current: null };
const BATCH_DELAY = 100; // Wait 100ms to collect all requests

/**
 * Hook to get favorite status for an image (batched)
 * @param imageId - Image ID to check
 * @returns Favorite status
 */
export function useBatchedFavoriteCheck(imageId: string | undefined): boolean {
  const { accessToken } = useAuthStore();
  const [isFavorited, setIsFavorited] = useState<boolean>(false);
  const callbackRef = useRef<(result: boolean) => void>();

  useEffect(() => {
    if (!accessToken || !imageId) {
      setIsFavorited(false);
      return;
    }

    // Validate MongoDB ObjectId format
    const isValidMongoId = /^[0-9a-fA-F]{24}$/.test(String(imageId).trim());
    if (!isValidMongoId) {
      setIsFavorited(false);
      return;
    }

    const validImageId = String(imageId).trim();

    // Create callback for this image
    const callback = (result: boolean) => {
      setIsFavorited(result);
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
                  
                  callbacks.forEach(cb => cb(!!isFavorited));
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
    };
  }, [imageId, accessToken]);

  return isFavorited;
}


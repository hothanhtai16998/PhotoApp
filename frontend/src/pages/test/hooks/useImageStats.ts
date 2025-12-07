import { useEffect, useState, useRef, useCallback } from 'react';
import type { Image } from '@/types/image';
import { imageService } from '@/services/imageService';
import { timingConfig } from '@/config/timingConfig';

interface UseImageStatsProps {
  image: Image;
  onImageUpdate?: (updatedImage: Image) => void;
}

interface UseImageStatsReturn {
  views: number;
  downloads: number;
  handleDownload: (
    e: React.MouseEvent,
    onDownload?: (image: Image, e: React.MouseEvent) => void
  ) => Promise<void>;
}

// localStorage keys for tracking viewed/downloaded images
const VIEWED_IMAGES_KEY = 'photoapp_viewed_images';
const DOWNLOADED_IMAGES_KEY = 'photoapp_downloaded_images';

// Get expiration time from config (convert hours to milliseconds)
const EXPIRATION_MS = timingConfig.imageStats.expirationHours * 60 * 60 * 1000;

interface TrackedImage {
  imageId: string;
  timestamp: number;
}

/**
 * Get tracked images from localStorage with expiration check
 */
const getTrackedImages = (key: string): Map<string, number> => {
  if (typeof window === 'undefined') return new Map();
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return new Map();

    const data: TrackedImage[] = JSON.parse(stored);
    const now = Date.now();
    const valid = new Map<string, number>();

    // Filter out expired entries
    data.forEach((item) => {
      if (now - item.timestamp < EXPIRATION_MS) {
        valid.set(item.imageId, item.timestamp);
      }
    });

    // Update localStorage if expired items were removed
    if (valid.size !== data.length) {
      const updated = Array.from(valid.entries()).map(
        ([imageId, timestamp]) => ({
          imageId,
          timestamp,
        })
      );
      localStorage.setItem(key, JSON.stringify(updated));
    }

    return valid;
  } catch {
    return new Map();
  }
};

/**
 * Get set of viewed image IDs from localStorage (with expiration)
 */
const getViewedImages = (): Map<string, number> => {
  return getTrackedImages(VIEWED_IMAGES_KEY);
};

/**
 * Mark an image as viewed in localStorage with timestamp
 */
const markImageAsViewed = (imageId: string): void => {
  if (typeof window === 'undefined') return;
  try {
    const viewed = getViewedImages();
    viewed.set(imageId, Date.now());

    const data: TrackedImage[] = Array.from(viewed.entries()).map(
      ([id, timestamp]) => ({
        imageId: id,
        timestamp,
      })
    );

    localStorage.setItem(VIEWED_IMAGES_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to mark image as viewed in localStorage:', error);
  }
};

/**
 * Check if an image has been viewed (within expiration time)
 */
const hasViewedImage = (imageId: string): boolean => {
  return getViewedImages().has(imageId);
};

/**
 * Get set of downloaded image IDs from localStorage (with expiration)
 */
const getDownloadedImages = (): Map<string, number> => {
  return getTrackedImages(DOWNLOADED_IMAGES_KEY);
};

/**
 * Mark an image as downloaded in localStorage with timestamp
 */
const markImageAsDownloaded = (imageId: string): void => {
  if (typeof window === 'undefined') return;
  try {
    const downloaded = getDownloadedImages();
    downloaded.set(imageId, Date.now());

    const data: TrackedImage[] = Array.from(downloaded.entries()).map(
      ([id, timestamp]) => ({
        imageId: id,
        timestamp,
      })
    );

    localStorage.setItem(DOWNLOADED_IMAGES_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to mark image as downloaded in localStorage:', error);
  }
};

/**
 * Check if an image has been downloaded (within expiration time)
 */
const hasDownloadedImage = (imageId: string): boolean => {
  return getDownloadedImages().has(imageId);
};

/**
 * Custom hook for tracking image views and downloads
 * Uses localStorage with configurable expiration to prevent duplicate counts (like Unsplash)
 * - Views: Only counted once per expiration period (configurable in timingConfig)
 * - Downloads: Only counted once per expiration period (configurable in timingConfig)
 * - Expiration time is configurable via timingConfig.imageStats.expirationHours
 */
export const useImageStats = ({
  image,
  onImageUpdate,
}: UseImageStatsProps): UseImageStatsReturn => {
  const [views, setViews] = useState<number>(image.views || 0);
  const [downloads, setDownloads] = useState<number>(image.downloads || 0);
  const currentImageIdRef = useRef<string | null>(null);
  // Track pending API calls to prevent race conditions on rapid navigation
  const pendingViewCallRef = useRef<string | null>(null);
  const pendingDownloadCallRef = useRef<string | null>(null);
  // Track if we've optimistically updated to handle reverts gracefully
  const optimisticViewUpdateRef = useRef<boolean>(false);
  const optimisticDownloadUpdateRef = useRef<boolean>(false);

  // Reset stats when image changes
  useEffect(() => {
    if (image?._id) {
      setViews(image.views || 0);
      setDownloads(image.downloads || 0);
      currentImageIdRef.current = image._id;
      // Cancel any pending calls for previous image
      pendingViewCallRef.current = null;
      pendingDownloadCallRef.current = null;
      optimisticViewUpdateRef.current = false;
      optimisticDownloadUpdateRef.current = false;
    } else {
      setViews(0);
      setDownloads(0);
      currentImageIdRef.current = null;
      pendingViewCallRef.current = null;
      pendingDownloadCallRef.current = null;
      optimisticViewUpdateRef.current = false;
      optimisticDownloadUpdateRef.current = false;
    }
  }, [image?._id, image?.views, image?.downloads]);

  // Increment view count when image is displayed (only once per expiration period)
  useEffect(() => {
    const imageId = image?._id;
    // Only increment if we have a valid image ID and haven't viewed it within expiration time
    if (imageId && !hasViewedImage(imageId)) {
      // Mark as viewed immediately to prevent duplicate calls
      markImageAsViewed(imageId);

      // Track this API call to prevent race conditions
      pendingViewCallRef.current = imageId;
      optimisticViewUpdateRef.current = true;

      // Optimistically increment view count immediately (for instant UI feedback)
      setViews((prevViews) => prevViews + 1);

      imageService
        .incrementView(imageId)
        .then((response) => {
          // Only process response if this is still the current image and call is still pending
          // This prevents race conditions when user navigates quickly
          if (
            pendingViewCallRef.current === imageId &&
            currentImageIdRef.current === imageId
          ) {
            // Update with actual server response (may differ from optimistic update)
            setViews(response.views);
            optimisticViewUpdateRef.current = false;

            // Update the image in the parent component if callback provided
            if (onImageUpdate) {
              const mergedDailyViews = {
                ...(image.dailyViews || {}),
                ...(response.dailyViews || {}),
              };
              onImageUpdate({
                ...image,
                views: response.views,
                dailyViews: mergedDailyViews,
              });
            }
          }
          // Clear pending call ref if this was the active call
          if (pendingViewCallRef.current === imageId) {
            pendingViewCallRef.current = null;
          }
        })
        .catch((error) => {
          // Only handle error if this is still the current image and call is still pending
          // Note: Rate limit cases return 200, so they're handled in .then(), not here
          if (
            pendingViewCallRef.current === imageId &&
            currentImageIdRef.current === imageId
          ) {
            // Real network/server error - revert optimistic update after a small delay to avoid flicker
            console.error('Failed to increment view:', error);
            setTimeout(() => {
              // Double-check we're still on the same image before reverting
              if (
                currentImageIdRef.current === imageId &&
                optimisticViewUpdateRef.current
              ) {
                setViews((prevViews) => Math.max(0, prevViews - 1));
                optimisticViewUpdateRef.current = false;

                // Remove from localStorage on error so it can be retried
                try {
                  const viewed = getViewedImages();
                  viewed.delete(imageId);
                  const data: TrackedImage[] = Array.from(viewed.entries()).map(
                    ([id, timestamp]) => ({
                      imageId: id,
                      timestamp,
                    })
                  );
                  localStorage.setItem(VIEWED_IMAGES_KEY, JSON.stringify(data));
                } catch {
                  // Ignore localStorage errors
                }
              }
            }, 500); // Small delay to avoid flicker
          }
          // Clear pending call ref if this was the active call
          if (pendingViewCallRef.current === imageId) {
            pendingViewCallRef.current = null;
          }
        });
    }
    // Only depend on image._id to avoid re-running when image object changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image?._id]);

  // Handle download with increment (only once per expiration period)
  const handleDownload = useCallback(
    async (
      e: React.MouseEvent,
      onDownload?: (image: Image, e: React.MouseEvent) => void
    ) => {
      e.stopPropagation();

      if (!image?._id) {
        console.error('Cannot increment download: image ID is missing');
        return;
      }

      // Check if already downloaded within expiration time
      const alreadyDownloaded = hasDownloadedImage(image._id);

      // Always trigger the download callback (user should be able to download multiple times)
      if (onDownload) {
        onDownload(image, e);
      }

      // Only increment download count if not already downloaded in this session
      if (!alreadyDownloaded) {
        // Mark as downloaded immediately to prevent duplicate calls
        markImageAsDownloaded(image._id);

        // Track this API call to prevent race conditions
        const imageId = image._id;
        pendingDownloadCallRef.current = imageId;
        optimisticDownloadUpdateRef.current = true;

        // Optimistically increment download count immediately (for instant UI feedback)
        setDownloads((prevDownloads) => prevDownloads + 1);

        try {
          const response = await imageService.incrementDownload(image._id);

          // Only process response if this is still the current image and call is still pending
          // This prevents race conditions when user navigates quickly
          if (
            pendingDownloadCallRef.current === imageId &&
            currentImageIdRef.current === imageId
          ) {
            // Update with actual server response (may differ from optimistic update)
            setDownloads(response.downloads);
            optimisticDownloadUpdateRef.current = false;

            // Update the image in the parent component if callback provided
            if (onImageUpdate) {
              onImageUpdate({
                ...image,
                downloads: response.downloads,
                dailyDownloads: response.dailyDownloads || image.dailyDownloads,
              });
            }
          }
        } catch (error: any) {
          // Only handle error if this is still the current image and call is still pending
          // Note: Rate limit cases return 200, so they're handled in try block, not here
          if (
            pendingDownloadCallRef.current === imageId &&
            currentImageIdRef.current === imageId
          ) {
            // Real network/server error - revert optimistic update after a small delay to avoid flicker
            console.error('Failed to increment download:', error);
            setTimeout(() => {
              // Double-check we're still on the same image before reverting
              if (
                currentImageIdRef.current === imageId &&
                optimisticDownloadUpdateRef.current
              ) {
                setDownloads((prevDownloads) => Math.max(0, prevDownloads - 1));
                optimisticDownloadUpdateRef.current = false;

                // Remove from localStorage on error so it can be retried
                try {
                  const downloaded = getDownloadedImages();
                  downloaded.delete(image._id);
                  const data: TrackedImage[] = Array.from(
                    downloaded.entries()
                  ).map(([id, timestamp]) => ({
                    imageId: id,
                    timestamp,
                  }));
                  localStorage.setItem(
                    DOWNLOADED_IMAGES_KEY,
                    JSON.stringify(data)
                  );
                } catch {
                  // Ignore localStorage errors
                }
              }
            }, 500); // Small delay to avoid flicker
          }
        } finally {
          // Clear pending call ref if this was the active call
          if (pendingDownloadCallRef.current === imageId) {
            pendingDownloadCallRef.current = null;
          }
        }
      }
    },
    [image, onImageUpdate]
  );

  return {
    views,
    downloads,
    handleDownload,
  };
};

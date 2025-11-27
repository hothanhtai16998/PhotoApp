import { useState, useMemo, useCallback } from 'react';
import type { Image } from '@/types/image';
import { useInfiniteScroll } from './useInfiniteScroll';

interface UseRelatedImagesProps {
  image: Image;
  images: Image[];
  modalContentRef: React.RefObject<HTMLDivElement | null>;
}

export const useRelatedImages = ({
  image,
  images,
  modalContentRef,
}: UseRelatedImagesProps) => {
  const [relatedImagesLimit, setRelatedImagesLimit] = useState(12);
  const [isLoadingRelatedImages, setIsLoadingRelatedImages] = useState(false);

  // Get related images with improved algorithm (same photographer, location, category, title similarity)
  const { relatedImages, hasMoreRelatedImages } = useMemo(() => {
    if (!image || images.length === 0) {
      return { relatedImages: [], hasMoreRelatedImages: false };
    }

    // Get current image properties
    const currentCategoryId = typeof image.imageCategory === 'string'
      ? image.imageCategory
      : image.imageCategory?._id;
    const currentPhotographerId = image.uploadedBy?._id || image.uploadedBy;
    const currentLocation = image.location?.toLowerCase().trim();
    const currentTitle = image.imageTitle?.toLowerCase().trim() || '';

    // Calculate relevance score for each image
    const scoredImages = images
      .filter(img => img._id !== image._id) // Exclude current image
      .map(img => {
        let score = 0;
        const reasons: string[] = []; // Track why images are related (for debugging)

        // Same photographer (highest priority - 100 points)
        const imgPhotographerId = img.uploadedBy?._id || img.uploadedBy;
        if (currentPhotographerId && imgPhotographerId &&
          String(currentPhotographerId) === String(imgPhotographerId)) {
          score += 100;
          reasons.push('same photographer');
        }

        // Same location (high priority - 50 points)
        const imgLocation = img.location?.toLowerCase().trim();
        if (currentLocation && imgLocation && currentLocation === imgLocation) {
          score += 50;
          reasons.push('same location');
        }

        // Same category (medium priority - 30 points, but only if we have other matches)
        const imgCategoryId = typeof img.imageCategory === 'string'
          ? img.imageCategory
          : img.imageCategory?._id;
        if (currentCategoryId && imgCategoryId &&
          String(currentCategoryId) === String(imgCategoryId)) {
          score += 30;
          reasons.push('same category');
        }

        // Title similarity (low priority - up to 20 points)
        const imgTitle = img.imageTitle?.toLowerCase().trim() || '';
        if (currentTitle && imgTitle) {
          // Check for common words
          const currentWords = currentTitle.split(/\s+/).filter(w => w.length > 2);
          const imgWords = imgTitle.split(/\s+/).filter(w => w.length > 2);
          const commonWords = currentWords.filter(w => imgWords.includes(w));
          if (commonWords.length > 0) {
            score += Math.min(commonWords.length * 5, 20);
            reasons.push(`title similarity (${commonWords.length} words)`);
          }
        }

        return { image: img, score, reasons };
      })
      // Require minimum score threshold - only show images with meaningful relevance
      // Minimum 30 points means: same category OR same location OR title similarity + category
      // This prevents showing completely unrelated images while still showing category matches
      .filter(item => item.score >= 30)
      .sort((a, b) => b.score - a.score) // Sort by score descending
      .map(item => item.image); // Extract just the images

    // Use scored images if we have any matches
    // Prioritize higher-scored images (same photographer, location) over category-only matches
    let filtered: Image[];
    if (scoredImages.length > 0) {
      // If we have highly relevant images (score >= 50), prioritize those
      // Otherwise, show category matches (score >= 30) which are still somewhat relevant
      filtered = scoredImages;
    } else {
      // If no matches at all, don't show related images
      filtered = [];
    }

    // Return limited images for infinite scroll and check if more available
    return {
      relatedImages: filtered.slice(0, relatedImagesLimit),
      hasMoreRelatedImages: filtered.length > relatedImagesLimit,
    };
  }, [image, images, relatedImagesLimit]);

  // Load more related images handler
  const handleLoadMoreRelatedImages = useCallback(async () => {
    setIsLoadingRelatedImages(true);
    setRelatedImagesLimit(prev => prev + 12);
    // Reset loading state after a delay
    setTimeout(() => setIsLoadingRelatedImages(false), 300);
  }, []);

  // Infinite scroll for related images (modal content scrolling)
  const { loadMoreRef } = useInfiniteScroll({
    hasMore: hasMoreRelatedImages,
    isLoading: isLoadingRelatedImages,
    onLoadMore: handleLoadMoreRelatedImages,
    root: modalContentRef.current,
    rootMargin: '200px',
    delay: 300,
  });

  return {
    relatedImages,
    hasMoreRelatedImages,
    isLoadingRelatedImages,
    loadMoreRef,
  };
};


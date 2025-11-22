import type { Image } from '@/types/image';
import type { SearchFilters } from '@/components/SearchFilters';

/**
 * Filter images by orientation (portrait/landscape/square)
 */
export const filterByOrientation = (images: Image[], orientation: SearchFilters['orientation']): Image[] => {
  if (orientation === 'all') return images;

  return images.filter(img => {
    // We need to check the actual image dimensions
    // For now, we'll use a placeholder - in real implementation, 
    // we'd need to check imageTypes or load image dimensions
    // This is a simplified version - in production, you'd want to
    // store aspect ratio in the image metadata or check it client-side
    
    // For now, return all images and let client-side filtering handle it
    // The actual filtering will be done in ImageGrid using imageTypes
    return true;
  });
};

/**
 * Filter images by date range
 */
export const filterByDateRange = (images: Image[], dateFrom: string, dateTo: string): Image[] => {
  if (!dateFrom && !dateTo) return images;

  return images.filter(img => {
    if (!img.createdAt) return false;
    
    const imgDate = new Date(img.createdAt);
    const fromDate = dateFrom ? new Date(dateFrom) : null;
    const toDate = dateTo ? new Date(dateTo + 'T23:59:59') : null; // End of day

    if (fromDate && imgDate < fromDate) return false;
    if (toDate && imgDate > toDate) return false;
    
    return true;
  });
};

/**
 * Apply all filters to images
 * Note: Color and orientation filtering would ideally be done on backend
 * For now, we do date filtering on frontend
 */
export const applyImageFilters = (
  images: Image[],
  filters: SearchFilters,
  imageTypes: Map<string, 'portrait' | 'landscape'>
): Image[] => {
  let filtered = [...images];

  // Filter by orientation (using imageTypes map)
  if (filters.orientation !== 'all') {
    filtered = filtered.filter(img => {
      const imgType = imageTypes.get(img._id);
      
      // If image type hasn't been determined yet, try to infer from image URL metadata
      // or exclude it to prevent showing wrong results
      if (!imgType) {
        // Try to preload image to determine type quickly
        // For now, we'll exclude undetermined images when filtering is active
        // This prevents showing wrong results (e.g., showing portrait as landscape)
        // In production, you'd want to store dimensions in backend metadata
        return false;
      }
      
      // Now filter based on determined type
      if (filters.orientation === 'portrait') {
        return imgType === 'portrait';
      } else if (filters.orientation === 'landscape') {
        return imgType === 'landscape';
      } else if (filters.orientation === 'square') {
        // Square detection would need actual dimensions
        // For now, we'll skip this or implement a check
        return false; // Placeholder - would need image dimensions
      }
      return true;
    });
  }

  // Filter by date range
  filtered = filterByDateRange(filtered, filters.dateFrom, filters.dateTo);

  // Color filtering would require image analysis
  // For now, we'll skip it or implement a basic version
  // In production, you'd want to extract dominant colors on upload

  return filtered;
};


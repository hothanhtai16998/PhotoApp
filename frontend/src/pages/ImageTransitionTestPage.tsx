import { useState, useLayoutEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './ImageTransitionTestPage.css';

interface ImageItem {
  id: string;
  url: string;
  width: number;
  height: number;
  aspectRatio: number;
  title: string;
  category: string;
}

// Create a shared image pool with stable URLs and IDs for caching
const allImagesPool: ImageItem[] = [
  // Portrait images - fixed seeds for caching
  ...Array.from({ length: 20 }, (_, i) => ({
    id: `portrait-${i}`, // Stable, unique ID
    url: `https://picsum.photos/seed/portrait${i}/400/600`,
    width: 400,
    height: 600,
    aspectRatio: 400 / 600,
    title: `Portrait ${i + 1}`,
    category: 'Chân dung',
  })),
  // Travel images - fixed seeds
  ...Array.from({ length: 20 }, (_, i) => ({
    id: `travel-${i}`, // Stable, unique ID
    url: `https://picsum.photos/seed/travel${i}/800/500`,
    width: 800,
    height: 500,
    aspectRatio: 800 / 500,
    title: `Travel ${i + 1}`,
    category: 'Du lịch',
  })),
  // Architecture images - fixed seeds
  ...Array.from({ length: 20 }, (_, i) => ({
    id: `architecture-${i}`, // Stable, unique ID
    url: `https://picsum.photos/seed/arch${i}/600/800`,
    width: 600,
    height: 800,
    aspectRatio: 600 / 800,
    title: `Architecture ${i + 1}`,
    category: 'Kiến trúc',
  })),
  // Outdoor images - fixed seeds
  ...Array.from({ length: 20 }, (_, i) => ({
    id: `outdoor-${i}`, // Stable, unique ID
    url: `https://picsum.photos/seed/outdoor${i}/800/600`,
    width: 800,
    height: 600,
    aspectRatio: 800 / 600,
    title: `Outdoor ${i + 1}`,
    category: 'Ngoài trời',
  })),
  // Nature images - fixed seeds
  ...Array.from({ length: 20 }, (_, i) => ({
    id: `nature-${i}`, // Stable, unique ID
    url: `https://picsum.photos/seed/nature${i}/700/700`,
    width: 700,
    height: 700,
    aspectRatio: 1,
    title: `Nature ${i + 1}`,
    category: 'Thiên nhiên',
  })),
];

const categories = ['Tất cả', 'Chân dung', 'Du lịch', 'Kiến trúc', 'Ngoài trời', 'Thiên nhiên'];

// Map category names to URL-friendly slugs
const categoryToSlug: Record<string, string> = {
  'Tất cả': 'all',
  'Chân dung': 'portrait',
  'Du lịch': 'travel',
  'Kiến trúc': 'architecture',
  'Ngoài trời': 'outdoor',
  'Thiên nhiên': 'nature',
};

const slugToCategory: Record<string, string> = {
  'all': 'Tất cả',
  'portrait': 'Chân dung',
  'travel': 'Du lịch',
  'architecture': 'Kiến trúc',
  'outdoor': 'Ngoài trời',
  'nature': 'Thiên nhiên',
};

// Cache the shuffled "Tất cả" result so it's consistent
let cachedAllImages: ImageItem[] | null = null;

function getCategoryImages(category: string): ImageItem[] {
  if (category === 'Tất cả') {
    // Use cached shuffled result for consistency (allows browser caching)
    if (!cachedAllImages) {
      cachedAllImages = [...allImagesPool].sort(() => Math.random() - 0.5).slice(0, 30);
    }
    return cachedAllImages;
  }
  // Filter by category - these images have stable URLs
  return allImagesPool.filter(img => img.category === category);
}

// Global store for images per category (persists across route changes)
const globalImagesCache = new Map<string, ImageItem[]>();

// Track which images are preloaded and ready to display
const preloadedImages = new Map<string, Set<string>>(); // category -> Set of image IDs

/**
 * Preload images and wait for them to be ready
 * Returns a promise that resolves when all images are loaded
 * For cached images, this resolves almost instantly
 */
function preloadImages(images: ImageItem[], category: string): Promise<void> {
  return new Promise((resolve) => {
    if (images.length === 0) {
      resolve();
      return;
    }

    let loadedCount = 0;
    let errorCount = 0;
    const totalImages = images.length;
    const maxWaitTime = 2000; // Max 2 seconds wait for any image
    
    const checkComplete = () => {
      // Resolve when all images are either loaded or errored
      if (loadedCount + errorCount === totalImages) {
        resolve();
      }
    };

    // Timeout fallback - don't wait forever
    const timeout = setTimeout(() => {
      resolve(); // Resolve anyway after timeout
    }, maxWaitTime);

    images.forEach((image) => {
      // Check if already preloaded
      const categorySet = preloadedImages.get(category) || new Set();
      if (categorySet.has(image.id)) {
        loadedCount++;
        checkComplete();
        return;
      }

      const img = new Image();
      
      img.onload = () => {
        categorySet.add(image.id);
        preloadedImages.set(category, categorySet);
        loadedCount++;
        checkComplete();
      };
      
      img.onerror = () => {
        // Even on error, count it as processed
        errorCount++;
        checkComplete();
      };
      
      // Start loading - if cached, onload fires immediately
      img.src = image.url;
      
      // Check if already loaded (cached images load instantly)
      if (img.complete && img.naturalHeight !== 0) {
        // Image was already cached - mark as loaded
        categorySet.add(image.id);
        preloadedImages.set(category, categorySet);
        loadedCount++;
        checkComplete();
      }
    });

    // Clear timeout if all images load quickly
    if (loadedCount + errorCount === totalImages) {
      clearTimeout(timeout);
    }
  });
}

export default function ImageTransitionTestPage() {
  const { category: categorySlug } = useParams<{ category?: string }>();
  const navigate = useNavigate();
  
  // Get category from URL or default to 'Tất cả'
  const currentCategory = categorySlug ? (slugToCategory[categorySlug] || 'Tất cả') : 'Tất cả';
  
  // Store images per category - persists in global cache
  const [imagesByCategory, setImagesByCategory] = useState<Map<string, ImageItem[]>>(() => {
    const map = new Map(globalImagesCache);
    // Initialize if empty
    if (!map.has('Tất cả')) {
      const initialImages = getCategoryImages('Tất cả');
      map.set('Tất cả', initialImages);
      globalImagesCache.set('Tất cả', initialImages);
    }
    return map;
  });
  
  const [isLoading, setIsLoading] = useState(false);
  
  // Get display images from cache or load them
  const getDisplayImages = (category: string): ImageItem[] => {
    // Check global cache first
    if (globalImagesCache.has(category)) {
      return globalImagesCache.get(category)!;
    }
    // Check local state
    if (imagesByCategory.has(category)) {
      return imagesByCategory.get(category)!;
    }
    // Load and cache
    const images = getCategoryImages(category);
    globalImagesCache.set(category, images);
    return images;
  };
  
  const [displayImages, setDisplayImages] = useState<ImageItem[]>(() => getDisplayImages(currentCategory));
  const [prevImages, setPrevImages] = useState<ImageItem[]>([]); // Keep old images visible
  const [loadedImageIds, setLoadedImageIds] = useState<Set<string>>(new Set()); // Track which images are fully loaded
  const [cachedImageIds, setCachedImageIds] = useState<Set<string>>(new Set()); // Track cached images
  const previousCategoryRef = useRef<string>(currentCategory);
  
  // Initial load - redirect to default category if no category in URL
  useLayoutEffect(() => {
    if (!categorySlug) {
      // No category in URL - redirect to default
      navigate('/image-transition-test/all', { replace: true });
      return;
    }
  }, [categorySlug, navigate]);
  
  // Sync with URL when category changes - USE useLayoutEffect to prevent flickering
  useLayoutEffect(() => {
    if (!categorySlug) return;
    
    const categoryFromUrl = slugToCategory[categorySlug] || 'Tất cả';
    
    // Check if category actually changed
    if (categoryFromUrl === previousCategoryRef.current && displayImages.length > 0) {
      // Same category and we already have images - don't do anything
      return;
    }
    
    previousCategoryRef.current = categoryFromUrl;
    
    // Check global cache first
    const existingImages = globalImagesCache.get(categoryFromUrl);
    
    if (existingImages && existingImages.length > 0) {
      // Images already in cache - show immediately (useLayoutEffect prevents flash)
      console.log('✅ Showing cached images for:', categoryFromUrl, existingImages.length, 'images');
      
      // Keep old images visible while new ones render
      const currentDisplay = displayImages;
      if (currentDisplay.length > 0 && currentDisplay[0]?.category !== categoryFromUrl) {
        setPrevImages(currentDisplay);
      }
      
      // Synchronously set new images (useLayoutEffect runs before paint)
      setDisplayImages(existingImages);
      setIsLoading(false);
      setLoadedImageIds(new Set()); // Clear loaded state
      
      // Update local state
      setImagesByCategory(prev => {
        const newMap = new Map(prev);
        newMap.set(categoryFromUrl, existingImages);
        return newMap;
      });
      
      // Preload in background (async, but images already set to display)
      preloadImages(existingImages, categoryFromUrl);
    } else {
      // First time visiting this category - load images
      console.log('⏳ Loading new images for:', categoryFromUrl);
      setIsLoading(true);
      const currentDisplay = displayImages;
      if (currentDisplay.length > 0) {
        setPrevImages(currentDisplay);
      }
      
      const newImages = getCategoryImages(categoryFromUrl);
      // Store in global cache immediately
      globalImagesCache.set(categoryFromUrl, newImages);
      
      // Synchronously set new images (useLayoutEffect runs before paint)
      setDisplayImages(newImages);
      setLoadedImageIds(new Set()); // Clear loaded state
      
      setImagesByCategory(prev => {
        const newMap = new Map(prev);
        newMap.set(categoryFromUrl, newImages);
        return newMap;
      });
      
      // Preload in background
      preloadImages(newImages, categoryFromUrl).then(() => {
        setIsLoading(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categorySlug]);

  // Handle category change from UI (navigates to route)
  const handleCategoryChange = (category: string) => {
    if (isLoading) return;
    
    // Navigate to the category route (this will trigger the useLayoutEffect above)
    const slug = categoryToSlug[category] || 'all';
    navigate(`/image-transition-test/${slug}`, { replace: true });
  };

  return (
    <div className="image-transition-test-page">
      <div className="test-page-header">
        <h1>Image Transition Test Page</h1>
        <p>Testing: useLayoutEffect + Stable Keys + Preloading + Placeholder Technique</p>
      </div>

      <div className="category-navigation">
        {categories.map((category) => {
          const isActive = currentCategory === category;
          return (
            <button
              key={category} // Stable key - category name doesn't change
              className={`category-btn ${isActive ? 'active' : ''}`}
              onClick={() => handleCategoryChange(category)}
              disabled={isLoading}
            >
              {category}
            </button>
          );
        })}
        {isLoading && (
          <div className="loading-indicator">
            <span>Đang tải...</span>
          </div>
        )}
      </div>

      <div className="image-grid" style={{ position: 'relative' }}>
        {/* Show previous images fading out (keep visible until new ones render) */}
        {prevImages.length > 0 && (
          <>
            {prevImages.map((image) => (
              <div
                key={`prev-${image.id}`} // Stable key with prefix
                className="grid-item fading-out"
                style={{
                  aspectRatio: `${image.width} / ${image.height}`,
                  opacity: 1,
                }}
              >
                <div className="image-wrapper">
                  <img
                    src={image.url}
                    alt={image.title}
                    style={{
                      aspectRatio: `${image.width} / ${image.height}`,
                    }}
                  />
                </div>
              </div>
            ))}
          </>
        )}
        
        {/* Show new images - use last image as placeholder technique */}
        {displayImages.map((image, index) => {
          // Find previous image at same position (use as placeholder)
          const prevImageAtPosition = prevImages[index];
          const isLoaded = loadedImageIds.has(image.id);
          
          return (
            <div
              key={image.id} // STABLE KEY - image.id is unique and doesn't change
              className="grid-item new-image"
              style={{
                aspectRatio: `${image.width} / ${image.height}`,
              }}
            >
              <div className="image-wrapper">
                {/* Show previous image as placeholder while new image loads (react-native-fast-image technique) */}
                {!isLoaded && prevImageAtPosition && (
                  <img
                    key={`placeholder-${prevImageAtPosition.id}`} // Stable key
                    src={prevImageAtPosition.url}
                    alt={prevImageAtPosition.title}
                    className="image-placeholder-layer"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      zIndex: 1,
                    }}
                  />
                )}
                
                {/* New image - loads in background, appears when ready */}
                <img
                  ref={(imgElement) => {
                    // Check if image is already loaded when element is created (cached images)
                    if (imgElement && imgElement.complete && imgElement.naturalHeight !== 0) {
                      // Image is already loaded (cached) - mark it immediately
                      setLoadedImageIds(prev => {
                        if (prev.has(image.id)) return prev;
                        const newSet = new Set(prev);
                        newSet.add(image.id);
                        
                        // Check if all images are now loaded
                        const allLoaded = displayImages.every(img => 
                          newSet.has(img.id) || prev.has(img.id)
                        );
                        
                        if (allLoaded) {
                          // All images loaded - clear old images
                          setTimeout(() => {
                            setPrevImages([]);
                          }, 100);
                        }
                        
                        return newSet;
                      });
                      
                      // Mark as cached
                      if (!cachedImageIds.has(image.id)) {
                        setCachedImageIds(prev => {
                          if (prev.has(image.id)) return prev;
                          const newSet = new Set(prev);
                          newSet.add(image.id);
                          return newSet;
                        });
                      }
                    }
                  }}
                  src={image.url}
                  alt={image.title}
                  loading="lazy"
                  style={{
                    aspectRatio: `${image.width} / ${image.height}`,
                    display: 'block',
                    position: 'relative',
                    zIndex: 2,
                    // Show image when loaded, hide until then (placeholder shows instead)
                    opacity: isLoaded ? 1 : 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    transition: 'opacity 0.3s ease-in',
                  }}
                  onLoad={(e) => {
                    // Mark image as loaded
                    const target = e.currentTarget;
                    
                    // Mark as loaded
                    setLoadedImageIds(prev => {
                      if (prev.has(image.id)) return prev;
                      const newSet = new Set(prev);
                      newSet.add(image.id);
                      
                      // Check if all images are now loaded
                      const allLoaded = displayImages.every(img => 
                        newSet.has(img.id) || prev.has(img.id)
                      );
                      
                      if (allLoaded) {
                        // All images loaded - clear old images after a brief moment
                        setTimeout(() => {
                          setPrevImages([]);
                        }, 200);
                      }
                      
                      return newSet;
                    });
                    
                    // Mark as cached if it loaded quickly
                    if (target.complete && !cachedImageIds.has(image.id)) {
                      setCachedImageIds(prev => {
                        if (prev.has(image.id)) return prev;
                        const newSet = new Set(prev);
                        newSet.add(image.id);
                        return newSet;
                      });
                    }
                  }}
                  onError={(e) => {
                    console.error('Failed to load image:', image.url, e);
                  }}
                />
                {/* Cache indicator badge */}
                {cachedImageIds.has(image.id) && (
                  <div className="cache-indicator" title="Loaded from browser cache">
                    <span>✓ Cache</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


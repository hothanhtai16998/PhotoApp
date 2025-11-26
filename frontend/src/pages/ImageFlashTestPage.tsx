import { useState, useEffect, useRef } from 'react';
import './ImageFlashTestPage.css';

// Create a shared image pool - all images are pre-defined and cached
// This simulates real app where images are already loaded/cached
const allImagesPool: ImageItem[] = [
  // Portrait images (for Chân dung)
  ...Array.from({ length: 15 }, (_, i) => ({
    id: `portrait-${i}`,
    url: `https://picsum.photos/seed/portrait-${i}/400/600`,
    thumbnailUrl: `https://picsum.photos/seed/portrait-${i}/40/60`,
    width: 400,
    height: 600,
    aspectRatio: 400 / 600,
    title: `Portrait ${i + 1}`,
    category: 'Chân dung',
  })),
  // Travel images (for Du lịch)
  ...Array.from({ length: 15 }, (_, i) => ({
    id: `travel-${i}`,
    url: `https://picsum.photos/seed/travel-${i}/800/500`,
    thumbnailUrl: `https://picsum.photos/seed/travel-${i}/80/50`,
    width: 800,
    height: 500,
    aspectRatio: 800 / 500,
    title: `Travel ${i + 1}`,
    category: 'Du lịch',
  })),
  // Architecture images (for Kiến trúc)
  ...Array.from({ length: 15 }, (_, i) => ({
    id: `architecture-${i}`,
    url: `https://picsum.photos/seed/architecture-${i}/600/800`,
    thumbnailUrl: `https://picsum.photos/seed/architecture-${i}/60/80`,
    width: 600,
    height: 800,
    aspectRatio: 600 / 800,
    title: `Architecture ${i + 1}`,
    category: 'Kiến trúc',
  })),
  // Outdoor images (for Ngoài trời)
  ...Array.from({ length: 15 }, (_, i) => ({
    id: `outdoor-${i}`,
    url: `https://picsum.photos/seed/outdoor-${i}/800/600`,
    thumbnailUrl: `https://picsum.photos/seed/outdoor-${i}/80/60`,
    width: 800,
    height: 600,
    aspectRatio: 800 / 600,
    title: `Outdoor ${i + 1}`,
    category: 'Ngoài trời',
  })),
  // Landscape images (for Phong cảnh)
  ...Array.from({ length: 15 }, (_, i) => ({
    id: `landscape-${i}`,
    url: `https://picsum.photos/seed/landscape-${i}/1000/600`,
    thumbnailUrl: `https://picsum.photos/seed/landscape-${i}/100/60`,
    width: 1000,
    height: 600,
    aspectRatio: 1000 / 600,
    title: `Landscape ${i + 1}`,
    category: 'Phong cảnh',
  })),
  // Pet images (for Thú cưng)
  ...Array.from({ length: 15 }, (_, i) => ({
    id: `pets-${i}`,
    url: `https://picsum.photos/seed/pets-${i}/500/500`,
    thumbnailUrl: `https://picsum.photos/seed/pets-${i}/50/50`,
    width: 500,
    height: 500,
    aspectRatio: 1,
    title: `Pet ${i + 1}`,
    category: 'Thú cưng',
  })),
  // Fashion images (for Thời trang)
  ...Array.from({ length: 15 }, (_, i) => ({
    id: `fashion-${i}`,
    url: `https://picsum.photos/seed/fashion-${i}/600/900`,
    thumbnailUrl: `https://picsum.photos/seed/fashion-${i}/60/90`,
    width: 600,
    height: 900,
    aspectRatio: 600 / 900,
    title: `Fashion ${i + 1}`,
    category: 'Thời trang',
  })),
];

interface ImageItem {
  id: string | number;
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  aspectRatio: number;
  title: string;
  category?: string;
}

// Category-based image filtering (reuses images from pool, no re-download)
const getCategoryImages = (category: string): ImageItem[] => {
  if (category === 'Tất cả') {
    // Return mix of all images
    return allImagesPool.slice(0, 30);
  }
  // Filter by category - images are already in browser cache
  return allImagesPool.filter(img => img.category === category).slice(0, 20);
};

const categories = ['Tất cả', 'Chân dung', 'Du lịch', 'Kiến trúc', 'Ngoài trời', 'Phong cảnh', 'Thú cưng', 'Thời trang'];

export default function ImageFlashTestPage() {
  const [images, setImages] = useState<ImageItem[]>(() => getCategoryImages('Tất cả'));
  const [prevImages, setPrevImages] = useState<ImageItem[]>([]); // Keep previous images for cross-fade
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentCategory, setCurrentCategory] = useState('Tất cả');
  const [loadedImageIds, setLoadedImageIds] = useState<Set<string | number>>(new Set());
  const [newImagesReady, setNewImagesReady] = useState(false); // Track when new images are ready
  const [useTechniques, setUseTechniques] = useState({
    aspectRatio: true,
    placeholder: true,
    blurUp: true,
    opacityTransition: true,
    skeleton: false,
    cssContainment: true,
    overlapLoading: true, // Default to true - this prevents flash
  });

  // Simulate search/filter change
  const handleSearch = () => {
    setIsLoading(true);
    
    // Simulate API delay
    setTimeout(() => {
      // Shuffle current images to simulate search results
      const shuffled = [...images].sort(() => Math.random() - 0.5);
      setImages(shuffled);
      setIsLoading(false);
    }, 300);
  };

  // Simulate filter change
  const handleFilterChange = () => {
    setIsLoading(true);
    
    setTimeout(() => {
      // Shuffle images to simulate filter
      const shuffled = [...images].sort(() => Math.random() - 0.5);
      setImages(shuffled);
      setIsLoading(false);
    }, 300);
  };

  // Handle category change (simulates real app behavior)
  // Images are filtered from the pool - browser cache is reused!
  const handleCategoryChange = (category: string) => {
    if (category === currentCategory || isLoading) return;
    
    setIsLoading(true);
    setNewImagesReady(false);
    setCurrentCategory(category);
    
    // Save current images as previous (for cross-fade)
    if (useTechniques.overlapLoading) {
      setPrevImages(images);
    }
    
    // Get new images immediately (no artificial delay)
    // In real app, this would be from API, but we simulate instant response
    const newImages = getCategoryImages(category);
    
      if (useTechniques.overlapLoading) {
        // Unsplash technique: Show new images immediately, keep old ones visible
        // New images appear instantly with placeholders/blur, old ones fade out
        setImages(newImages);
        setNewImagesReady(true); // Mark as ready immediately
        
        // Start fading out old images after a brief moment
        // This gives new images time to show placeholders/blur
        requestAnimationFrame(() => {
          setTimeout(() => {
            setPrevImages([]);
            setIsLoading(false);
          }, 500); // Time for cross-fade transition
        });
      } else {
      // Clear and load new (causes flash - this is what we're testing against)
      setPrevImages([]);
      setImages([]);
      setTimeout(() => {
        setImages(newImages);
        setIsLoading(false);
      }, 50);
    }
  };

  // Track which images have been loaded (for cache indicator)
  const handleImageLoaded = (imageId: string | number) => {
    setLoadedImageIds(prev => new Set([...prev, imageId]));
  };

  // Reset to initial state
  const handleReset = () => {
    setCurrentCategory('Tất cả');
    setImages(getCategoryImages('Tất cả'));
    setSearchQuery('');
    setIsLoading(false);
    setLoadedImageIds(new Set());
  };

  return (
    <div className="flash-test-page">
      <div className="flash-test-header">
        <h1>Image Flash Prevention Test Page</h1>
        <p>Test different techniques to prevent image flashing during search/filter changes</p>
      </div>

      <div className="flash-test-controls">
        <div className="control-group">
          <h3>Techniques Toggle</h3>
          <label>
            <input
              type="checkbox"
              checked={useTechniques.aspectRatio}
              onChange={(e) =>
                setUseTechniques({ ...useTechniques, aspectRatio: e.target.checked })
              }
            />
            Aspect Ratio Containers
          </label>
          <label>
            <input
              type="checkbox"
              checked={useTechniques.placeholder}
              onChange={(e) =>
                setUseTechniques({ ...useTechniques, placeholder: e.target.checked })
              }
            />
            Placeholder/Skeleton
          </label>
          <label>
            <input
              type="checkbox"
              checked={useTechniques.blurUp}
              onChange={(e) =>
                setUseTechniques({ ...useTechniques, blurUp: e.target.checked })
              }
            />
            Blur-Up (LQIP)
          </label>
          <label>
            <input
              type="checkbox"
              checked={useTechniques.opacityTransition}
              onChange={(e) =>
                setUseTechniques({ ...useTechniques, opacityTransition: e.target.checked })
              }
            />
            Opacity Transition
          </label>
          <label>
            <input
              type="checkbox"
              checked={useTechniques.cssContainment}
              onChange={(e) =>
                setUseTechniques({ ...useTechniques, cssContainment: e.target.checked })
              }
            />
            CSS Containment
          </label>
          <label>
            <input
              type="checkbox"
              checked={useTechniques.overlapLoading}
              onChange={(e) =>
                setUseTechniques({ ...useTechniques, overlapLoading: e.target.checked })
              }
            />
            Overlap Loading (Keep old images)
          </label>
        </div>

        <div className="control-group">
          <h3>Test Actions</h3>
          <button onClick={handleSearch} disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Simulate Search'}
          </button>
          <button onClick={handleFilterChange} disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Simulate Filter'}
          </button>
          <button onClick={handleReset}>Reset</button>
        </div>

        <div className="control-group">
          <h3>Search</h3>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search images..."
          />
        </div>
      </div>

      {/* Category Navigation - Simulates real app */}
      <div className="flash-test-categories">
        <div className="category-navigation">
          {categories.map((category) => (
            <button
              key={category}
              className={`category-nav-button ${
                currentCategory === category ? 'active' : ''
              }`}
              onClick={() => handleCategoryChange(category)}
              disabled={isLoading}
            >
              {category}
            </button>
          ))}
        </div>
        {isLoading && (
          <div className="category-loading-indicator">
            <span>Đang tải...</span>
          </div>
        )}
      </div>

      <div
        className={`flash-test-grid ${
          useTechniques.cssContainment ? 'use-containment' : ''
        } ${isLoading && !useTechniques.overlapLoading ? 'is-loading' : ''} ${
          useTechniques.overlapLoading ? 'overlap-loading' : ''
        }`}
      >
        {images.length === 0 && isLoading && !useTechniques.overlapLoading ? (
          <div className="empty-grid-message">
            <p>Loading images...</p>
            <p className="empty-grid-note">This causes flash! Enable "Overlap Loading" to prevent it.</p>
          </div>
        ) : (
          <>
            {/* Show previous images fading out (cross-fade technique) */}
            {useTechniques.overlapLoading && prevImages.length > 0 && (
              <>
                {prevImages.map((image, index) => (
                  <ImageItem
                    key={`prev-${image.id}`}
                    image={image}
                    useTechniques={useTechniques}
                    isCached={loadedImageIds.has(image.id)}
                    onImageLoaded={() => {}}
                    isLoading={false}
                    index={index}
                    isFadingOut={true}
                    isNewImage={false}
                  />
                ))}
              </>
            )}
            {/* Show new images fading in */}
            {images.map((image, index) => (
              <ImageItem
                key={image.id}
                image={image}
                useTechniques={useTechniques}
                isCached={loadedImageIds.has(image.id)}
                onImageLoaded={handleImageLoaded}
                isLoading={isLoading}
                index={index}
                isFadingOut={false}
                isNewImage={true}
                newImagesReady={newImagesReady}
              />
            ))}
          </>
        )}
      </div>

      {isLoading && useTechniques.skeleton && (
        <div className="skeleton-overlay">
          <div className="skeleton-grid">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="skeleton-item" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface ImageItemProps {
  image: ImageItem;
  useTechniques: {
    aspectRatio: boolean;
    placeholder: boolean;
    blurUp: boolean;
    opacityTransition: boolean;
    skeleton: boolean;
    cssContainment: boolean;
    overlapLoading: boolean;
  };
  isCached: boolean;
  onImageLoaded: (imageId: string | number) => void;
  isLoading: boolean;
  index: number;
  isFadingOut?: boolean;
  isNewImage?: boolean;
  newImagesReady?: boolean;
}

function ImageItem({ 
  image, 
  useTechniques, 
  isCached, 
  onImageLoaded, 
  isLoading, 
  index,
  isFadingOut = false,
  isNewImage = true,
  newImagesReady = false,
}: ImageItemProps) {
  const [isLoaded, setIsLoaded] = useState(isCached); // If cached, start as loaded
  const [isImageLoaded, setIsImageLoaded] = useState(isCached);
  const imgRef = useRef<HTMLImageElement>(null);
  const prevImageIdRef = useRef<string | number>(image.id);

  useEffect(() => {
    // If image ID changed, it's a new image
    if (prevImageIdRef.current !== image.id) {
      prevImageIdRef.current = image.id;
      
      // If image is cached, it loads instantly
      if (isCached) {
        setIsLoaded(true);
        setIsImageLoaded(true);
      } else {
        // Reset loaded state when image changes (only if not cached)
        setIsLoaded(false);
        setIsImageLoaded(false);
      }
    }
  }, [image.id, isCached]);

  const handleImageLoad = () => {
    setIsImageLoaded(true);
    onImageLoaded(image.id);
    // Mark as loaded immediately for cached images, small delay for new ones
    if (isCached) {
      setIsLoaded(true);
    } else {
      // Small delay for smooth transition on new images
      setTimeout(() => setIsLoaded(true), 30);
    }
  };
  
  // Check if image is already loaded in browser cache
  useEffect(() => {
    if (imgRef.current) {
      if (imgRef.current.complete && imgRef.current.naturalHeight !== 0) {
        // Image is already loaded (from cache)
        handleImageLoad();
      } else {
        // Image not loaded yet - ensure placeholder/blur is visible
        setIsImageLoaded(false);
        setIsLoaded(false);
      }
    }
  }, [image.id]);

  const containerStyle: React.CSSProperties = useTechniques.aspectRatio
    ? {
        aspectRatio: `${image.width} / ${image.height}`,
      }
    : {};

  // Calculate opacity based on state
  const getOpacity = () => {
    if (isFadingOut) {
      // Old image: fade out when new images are ready
      // Use CSS transition for smooth fade
      return newImagesReady ? 0 : 1;
    }
    
    if (!useTechniques.overlapLoading) {
      // Normal mode: show when loaded
      return useTechniques.opacityTransition
        ? (isImageLoaded ? 1 : 0)
        : 1;
    } else {
      // Overlap mode: new images show immediately
      if (isNewImage) {
        // Always show new images immediately
        // Placeholder/blur ensures something is always visible (prevents flash)
        if (useTechniques.opacityTransition) {
          // If image is loaded, show at full opacity
          if (isImageLoaded) return 1;
          // While loading: show at good opacity if we have blur/placeholder
          // This ensures grid structure is always visible (no flash)
          if (useTechniques.blurUp || useTechniques.placeholder) {
            return 0.7; // Visible enough to maintain grid structure
          }
          // No placeholder/blur - show at low opacity to maintain structure
          return 0.3;
        }
        return 1; // No transition = always fully visible
      }
      return 1;
    }
  };

  return (
    <div
      className={`flash-test-item ${
        useTechniques.cssContainment ? 'use-containment' : ''
      } ${isLoaded && useTechniques.opacityTransition ? 'loaded' : ''} ${
        useTechniques.overlapLoading && isLoading ? 'overlap-item' : ''
      } ${isFadingOut ? 'fading-out' : ''} ${isNewImage ? 'new-image' : ''}`}
      style={{
        ...containerStyle,
        opacity: getOpacity(),
        transition: useTechniques.opacityTransition
          ? (isFadingOut 
              ? 'opacity 0.6s ease-out, transform 0.2s ease' 
              : 'opacity 0.6s ease-in, transform 0.2s ease')
          : 'transform 0.2s ease',
        pointerEvents: isFadingOut ? 'none' : 'auto',
        willChange: useTechniques.opacityTransition ? 'opacity' : 'auto',
      }}
    >
      {/* Placeholder shows immediately for new images that aren't loaded yet */}
      {useTechniques.placeholder && (!isLoaded || (isNewImage && !isImageLoaded)) && (
        <div className="image-placeholder">
          <div className="placeholder-content">
            <div className="placeholder-icon">📷</div>
            <div className="placeholder-text">Loading...</div>
          </div>
        </div>
      )}

      {/* Blur-up shows immediately for new images */}
      {useTechniques.blurUp && (
        <img
          src={image.thumbnailUrl}
          alt=""
          className={`image-blur ${isImageLoaded ? 'hidden' : ''}`}
          aria-hidden="true"
          style={{
            opacity: isImageLoaded ? 0 : 1,
            transition: 'opacity 0.4s ease',
          }}
        />
      )}

      <img
        ref={imgRef}
        src={image.url}
        alt={image.title}
        className={`image-main ${
          isImageLoaded && useTechniques.opacityTransition ? 'loaded' : 'loading'
        } ${isCached ? 'cached' : ''}`}
        onLoad={handleImageLoad}
        loading="lazy"
        width={image.width}
        height={image.height}
        style={{
          opacity: 1, // Image itself is always opaque, container handles fade
        }}
      />
      {isCached && (
        <div className="cache-indicator" title="Image loaded from cache">
          ✓
        </div>
      )}
    </div>
  );
}


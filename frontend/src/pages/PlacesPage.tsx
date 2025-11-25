import { useState, useEffect, useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { imageService } from "@/services/imageService";
import type { Image } from "@/types/image";
import "./PlacesPage.css";

// Date-based randomization: same 10 images per day
function getDailyRandomImages(images: Image[], count: number): Image[] {
  // Use date as seed for consistent daily selection
  const today = new Date();
  const dateString = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  
  // Simple hash function to convert date string to number
  let seed = 0;
  for (let i = 0; i < dateString.length; i++) {
    seed = ((seed << 5) - seed) + dateString.charCodeAt(i);
    seed = seed & seed; // Convert to 32bit integer
  }
  
  // Shuffle array using seed
  const shuffled = [...images];
  let random = seed;
  for (let i = shuffled.length - 1; i > 0; i--) {
    random = (random * 9301 + 49297) % 233280; // Linear congruential generator
    const j = Math.floor((random / 233280) * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled.slice(0, count);
}

function PlacesPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [autoPlayProgress, setAutoPlayProgress] = useState(0);
  const autoPlayIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const progressStartTimeRef = useRef<number | null>(null);
  const pausedProgressRef = useRef<number>(0);
  const isAutoPlayChangeRef = useRef<boolean>(false);
  const nextSlideRef = useRef<() => void>();
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // Fetch all images and select 10 random ones for today
  useEffect(() => {
    const fetchImages = async () => {
      setLoading(true);
      try {
        // Fetch images in batches (max limit is 100 per API)
        const allImages: Image[] = [];
        let page = 1;
        let hasMore = true;
        const maxPages = 10; // Limit to 10 pages (1000 images max) to avoid infinite loops
        
        while (hasMore && page <= maxPages) {
          const response = await imageService.fetchImages({
            limit: 100, // Maximum allowed by API
            page: page,
          });
          
          if (response.images && response.images.length > 0) {
            allImages.push(...response.images);
            // Check if there are more pages
            if (response.pagination) {
              hasMore = page < response.pagination.pages;
            } else {
              // If no pagination info, stop if we got less than limit
              hasMore = response.images.length === 100;
            }
            page++;
          } else {
            hasMore = false;
          }
        }
        
        if (allImages.length > 0) {
          // Get 10 random images for today
          const dailyImages = getDailyRandomImages(allImages, 10);
          setImages(dailyImages);
        } else {
          setImages([]);
        }
      } catch (error) {
        console.error("Error fetching images:", error);
        setImages([]);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, []);

  const goToSlide = useCallback((index: number) => {
    if (isTransitioning || images.length === 0) return;
    setIsTransitioning(true);
    setCurrentSlide(index % images.length);
    setTimeout(() => setIsTransitioning(false), 600);
  }, [isTransitioning, images.length]);

  const nextSlide = useCallback(() => {
    if (images.length === 0) return;
    goToSlide((currentSlide + 1) % images.length);
  }, [currentSlide, goToSlide, images.length]);

  // Keep ref updated with latest nextSlide
  useEffect(() => {
    nextSlideRef.current = nextSlide;
  }, [nextSlide]);

  const prevSlide = useCallback(() => {
    if (images.length === 0) return;
    goToSlide((currentSlide - 1 + images.length) % images.length);
  }, [currentSlide, goToSlide, images.length]);

  // Auto-play carousel (6.2 seconds interval) - pauses on hover, with progress bar
  useEffect(() => {
    if (images.length === 0) {
      // Clear intervals if no images
      if (autoPlayIntervalRef.current) {
        clearInterval(autoPlayIntervalRef.current);
        autoPlayIntervalRef.current = null;
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      return;
    }

    // If hovering, pause (save current progress and stop intervals)
    if (isHovered) {
      // Save current progress before pausing
      if (progressStartTimeRef.current !== null) {
        const elapsed = Date.now() - progressStartTimeRef.current;
        pausedProgressRef.current = Math.min((elapsed / 6200) * 100, 100);
      }
      // Pause intervals
      if (autoPlayIntervalRef.current) {
        clearInterval(autoPlayIntervalRef.current);
        autoPlayIntervalRef.current = null;
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      return;
    }

    // Resume/Start intervals when not hovering
    // Clear any existing intervals first
    if (autoPlayIntervalRef.current) {
      clearInterval(autoPlayIntervalRef.current);
      autoPlayIntervalRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }

    // Calculate start time based on paused progress (if resuming) or start fresh
    const startProgress = pausedProgressRef.current;
    const startTime = Date.now() - (startProgress / 100) * 6200;
    progressStartTimeRef.current = startTime;

    // Progress bar animation - synchronized with auto-play
    // Update every 16ms for smoother animation (60fps)
    progressIntervalRef.current = setInterval(() => {
      // If progressStartTimeRef is null, don't update (but don't stop the interval)
      if (progressStartTimeRef.current === null) {
        // Keep the current progress value, don't update
        return;
      }
      const elapsed = Date.now() - progressStartTimeRef.current;
      const progress = Math.min((elapsed / 6200) * 100, 100);
      setAutoPlayProgress(progress);
    }, 16); // Update every 16ms (~60fps) for smooth animation

    // Auto-play interval - change slide every 6.2 seconds
    // Calculate delay based on remaining time if resuming from pause
    const remainingTime = 6200 - (startProgress / 100) * 6200;
    
    const scheduleNextSlide = () => {
      setAutoPlayProgress(100); // Ensure it reaches 100% before changing
      isAutoPlayChangeRef.current = true; // Mark as auto-play change
      if (nextSlideRef.current) {
        nextSlideRef.current();
      }
      // Start progress timer immediately (synchronously)
      // The useEffect that resets progress will be skipped because isAutoPlayChangeRef is true
      setAutoPlayProgress(0);
      pausedProgressRef.current = 0;
      // Update progressStartTimeRef immediately so the interval can use it
      progressStartTimeRef.current = Date.now();
      // Reset the flag after ensuring the useEffect has checked it
      // Use a longer timeout to ensure the useEffect runs first
      setTimeout(() => {
        isAutoPlayChangeRef.current = false;
      }, 10);
    };

    let timeoutId: NodeJS.Timeout | null = null;
    
    if (startProgress > 0) {
      // Resume from pause - use setTimeout for the first slide change
      timeoutId = setTimeout(() => {
        scheduleNextSlide();
        // Then set up the regular interval
        autoPlayIntervalRef.current = setInterval(scheduleNextSlide, 6200);
      }, remainingTime);
    } else {
      // Start fresh - use regular interval
      autoPlayIntervalRef.current = setInterval(scheduleNextSlide, 6200);
    }

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (autoPlayIntervalRef.current) {
        clearInterval(autoPlayIntervalRef.current);
        autoPlayIntervalRef.current = null;
      }
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };
  }, [images.length, isHovered]);

  // Reset progress when slide changes manually (not from auto-play)
  useEffect(() => {
    // Check if it's an auto-play change - if so, don't reset
    // The flag is set synchronously in scheduleNextSlide, so we check it immediately
    if (isAutoPlayChangeRef.current) {
      // It's an auto-play change, scheduleNextSlide will handle the reset
      return;
    }
    // Manual change - reset progress
    setAutoPlayProgress(0);
    pausedProgressRef.current = 0;
    progressStartTimeRef.current = null;
  }, [currentSlide]);

  // Keyboard navigation - Arrow keys, Home, End
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prevSlide();
      if (e.key === "ArrowRight") nextSlide();
      if (e.key === "Home") goToSlide(0);
      if (e.key === "End") goToSlide(images.length - 1);
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [prevSlide, nextSlide, goToSlide, images.length]);


  // Get best image URL
  const getImageUrl = (image: Image | null): string | null => {
    if (!image) return null;
    return (
      image.regularAvifUrl ||
      image.regularUrl ||
      image.imageAvifUrl ||
      image.imageUrl ||
      image.smallUrl ||
      image.thumbnailUrl ||
      null
    );
  };

  // Get current and next image for bottom carousel
  const getBottomCarouselImages = () => {
    if (images.length === 0) return [];
    const current = images[currentSlide];
    const next = images[(currentSlide + 1) % images.length];
    return [current, next].filter(Boolean);
  };


  // Get thumbnail URL for bottom carousel
  const getThumbnailUrl = (image: Image | null): string | null => {
    if (!image) return null;
    return (
      image.thumbnailAvifUrl ||
      image.thumbnailUrl ||
      image.smallAvifUrl ||
      image.smallUrl ||
      image.regularAvifUrl ||
      image.regularUrl ||
      image.imageUrl ||
      null
    );
  };


  // Touch gesture handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchStartX.current - touchEndX;
    const diffY = touchStartY.current - touchEndY;
    
    // Only trigger if horizontal swipe is greater than vertical (to avoid conflicts with scrolling)
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
      if (diffX > 0) {
        nextSlide(); // Swipe left = next
      } else {
        prevSlide(); // Swipe right = previous
      }
    }
    
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // Preload next 2-3 images
  useEffect(() => {
    if (images.length === 0) return;
    
    const preloadImages = () => {
      for (let i = 1; i <= 3; i++) {
        const nextIndex = (currentSlide + i) % images.length;
        const image = images[nextIndex];
        if (!image) continue;
        
        const imageUrl = 
          image.regularAvifUrl ||
          image.regularUrl ||
          image.imageAvifUrl ||
          image.imageUrl ||
          image.smallUrl ||
          image.thumbnailUrl ||
          null;
        
        if (imageUrl) {
          const img = new window.Image();
          img.src = imageUrl;
        }
      }
    };
    
    preloadImages();
  }, [currentSlide, images]);

  if (loading) {
    return (
      <div className="tripzo-page">
        <div className="loading-state">
          <div className="skeleton-main-slide" />
          <div className="loading-text">Loading images...</div>
        </div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="tripzo-page">
        <div className="loading-state">No images available</div>
      </div>
    );
  }


  return (
    <div 
      className="tripzo-page"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Auto-play progress bar */}
      {images.length > 0 && (
        <div className="autoplay-progress" style={{ opacity: isHovered ? 0.5 : 1 }}>
          <div 
            className="autoplay-progress-bar" 
            style={{ width: `${autoPlayProgress}%` }}
          />
        </div>
      )}

      {/* Main Carousel */}
      <div className="main-carousel-container">
        {images.map((image, index) => {
          const imageUrl = getImageUrl(image);
          
          return (
            <div
              key={image._id}
              className={`main-slide ${index === currentSlide ? "active" : ""}`}
              style={{ backgroundColor: '#1a1a1a' }}
            >
              {/* Blurred background layer */}
              {imageUrl && (
                <div
                  className="blur-background-layer"
                  style={{
                    backgroundImage: `url("${imageUrl}")`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                />
              )}
              {/* Main image layer - separate from blurred background */}
              {imageUrl && (
                <div
                  className="main-image-layer"
                  style={{
                    backgroundImage: `url("${imageUrl}")`,
                    backgroundSize: 'contain',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                  }}
                />
              )}
              <div className="slide-content">
                <h2 className="slide-title">{image.imageTitle}</h2>
              </div>
            </div>
          );
        })}

      </div>

      {/* Let's Travel Section */}
      <div className="lets-travel-section">
        <h2 className="lets-travel-text">Let's travel</h2>
      </div>

      {/* Bottom Carousel */}
      <div className="bottom-carousel-container">
        <button
          className="carousel-nav-arrow carousel-nav-left bottom-nav"
          onClick={prevSlide}
          aria-label="Previous slide"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="bottom-carousel">
          {getBottomCarouselImages().map((image, index) => {
            const thumbnailUrl = getThumbnailUrl(image);
            const slideIndex = index === 0 ? currentSlide : (currentSlide + 1) % images.length;
            const isActive = index === 0; // First thumbnail is always the current slide
            
            return (
              <div
                key={image._id}
                className={`bottom-slide ${isActive ? 'active-thumbnail' : ''}`}
                onClick={() => goToSlide(slideIndex)}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
              >
                {thumbnailUrl ? (
                  <img
                    src={thumbnailUrl}
                    alt={image.imageTitle}
                    className="bottom-slide-image"
                    loading="eager"
                  />
                ) : (
                  <div className="skeleton-loader" />
                )}
              </div>
            );
          })}
        </div>
        <button
          className="carousel-nav-arrow carousel-nav-right bottom-nav"
          onClick={nextSlide}
          aria-label="Next slide"
        >
          <ChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}

export default PlacesPage;

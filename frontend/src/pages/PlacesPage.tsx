import { useState, useEffect, useCallback } from "react";
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

  const prevSlide = useCallback(() => {
    if (images.length === 0) return;
    goToSlide((currentSlide - 1 + images.length) % images.length);
  }, [currentSlide, goToSlide, images.length]);

  // Auto-play carousel (5 seconds interval)
  useEffect(() => {
    if (images.length === 0) return;
    const interval = setInterval(() => {
      nextSlide();
    }, 5000);
    return () => clearInterval(interval);
  }, [nextSlide, images.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") prevSlide();
      if (e.key === "ArrowRight") nextSlide();
    };
    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [prevSlide, nextSlide]);


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

  // Get next 2 images for bottom carousel
  const getNextImages = () => {
    if (images.length === 0) return [];
    const next1 = images[(currentSlide + 1) % images.length];
    const next2 = images[(currentSlide + 2) % images.length];
    return [next1, next2].filter(Boolean);
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

  if (loading) {
    return (
      <div className="tripzo-page">
        <div className="loading-state">Loading images...</div>
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

  const nextImages = getNextImages();

  return (
    <div className="tripzo-page">
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
          {nextImages.map((image, index) => {
            const thumbnailUrl = getThumbnailUrl(image);
            return (
              <div
                key={image._id}
                className="bottom-slide"
                onClick={() => goToSlide((currentSlide + index + 1) % images.length)}
              >
                {thumbnailUrl && (
                  <img
                    src={thumbnailUrl}
                    alt={image.imageTitle}
                    className="bottom-slide-image"
                  />
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

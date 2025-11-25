import { useState, useEffect, useRef, useCallback } from 'react';
import { imageService } from '@/services/imageService';
import { useImageStore } from '@/stores/useImageStore';
import type { Image } from '@/types/image';
import Header from '@/components/Header';
import './DoubleSliderPage.css';

interface SlideData {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  location?: string;
}

function DoubleSliderPage() {
  const { deletedImageIds } = useImageStore();
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const autoPlayIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  // Fetch images
  useEffect(() => {
    const fetchImages = async () => {
      try {
        setLoading(true);
        const response = await imageService.fetchImages({
          limit: 10,
          page: 1,
          _refresh: true
        });

        if (response.images && response.images.length > 0) {
          const validImages = response.images.filter(
            (img: Image) => !deletedImageIds.includes(img._id)
          );

          const slidesData: SlideData[] = validImages.map((img: Image) => {
            // Handle imageCategory - it can be a string or Category object
            const categoryName = typeof img.imageCategory === 'string' 
              ? img.imageCategory 
              : (img.imageCategory?.name || '');
            
            return {
              id: img._id,
              title: img.imageTitle || 'Untitled',
              description: img.location || categoryName || 'Beautiful image',
              imageUrl: img.regularUrl || img.imageUrl,
              location: img.location
            };
          });

          setSlides(slidesData);
          if (slidesData.length > 0) {
            setCurrentIndex(0);
          }
        }
      } catch (error) {
        console.error('Error fetching images:', error);
        setSlides([]);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, [deletedImageIds]);

  // Auto-play functionality
  useEffect(() => {
    if (slides.length <= 1) return;

    const startAutoPlay = () => {
      if (autoPlayIntervalRef.current) {
        clearInterval(autoPlayIntervalRef.current);
      }

      autoPlayIntervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % slides.length);
      }, 5000); // Change slide every 5 seconds
    };

    startAutoPlay();

    return () => {
      if (autoPlayIntervalRef.current) {
        clearInterval(autoPlayIntervalRef.current);
      }
    };
  }, [slides.length]);

  const goToNext = useCallback(() => {
    if (isTransitioning || slides.length === 0) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev + 1) % slides.length);
    setTimeout(() => setIsTransitioning(false), 600);
  }, [isTransitioning, slides.length]);

  const goToPrev = useCallback(() => {
    if (isTransitioning || slides.length === 0) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);
    setTimeout(() => setIsTransitioning(false), 600);
  }, [isTransitioning, slides.length]);

  const goToSlide = useCallback((index: number) => {
    if (isTransitioning || slides.length === 0) return;
    setIsTransitioning(true);
    setCurrentIndex(index);
    setTimeout(() => setIsTransitioning(false), 600);
  }, [isTransitioning, slides.length]);

  // Touch handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches[0]) {
      touchStartX.current = e.touches[0].clientX;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches[0]) {
      touchEndX.current = e.touches[0].clientX;
    }
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current) return;

    const endX = touchEndX.current || touchStartX.current;
    const distance = touchStartX.current - endX;
    const threshold = 50;

    if (distance > threshold) {
      goToNext();
    } else if (distance < -threshold) {
      goToPrev();
    }

    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goToPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [goToNext, goToPrev]);

  if (loading) {
    return (
      <>
        <Header />
        <div className="double-slider-page">
          <div className="loading-state">Loading...</div>
        </div>
      </>
    );
  }

  if (slides.length === 0) {
    return (
      <>
        <Header />
        <div className="double-slider-page">
          <div className="empty-state">No images available</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div
        className="double-slider-page"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Main Hero Section - Full Width */}
        <div className="hero-section">
          <div
            className="hero-carousel"
            style={{
              transform: `translateX(-${currentIndex * 100}%)`,
            }}
          >
            {slides.map((slide, index) => (
              <div
                key={slide.id}
                className={`hero-slide ${index === currentIndex ? 'active' : ''}`}
                style={{
                  backgroundImage: `url(${slide.imageUrl})`,
                }}
              >
                <div className="hero-overlay"></div>
                <div className="hero-content">
                  <h1 className="hero-title">{slide.title}</h1>
                  <p className="hero-description">{slide.description}</p>
                  <button className="play-button" aria-label="Play video">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Section with Dark Background */}
        <div className="footer-section">
          <div className="footer-content">
            {/* Left: Large Text */}
            <div className="footer-text">LET'S TRAVEL</div>

            {/* Center: Navigation Arrows */}
            <div className="footer-nav">
              <button
                className="footer-nav-arrow footer-nav-left"
                onClick={goToPrev}
                aria-label="Previous slide"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <button
                className="footer-nav-arrow footer-nav-right"
                onClick={goToNext}
                aria-label="Next slide"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            </div>

            {/* Right: Thumbnail Cards */}
            <div className="thumbnail-cards">
              {slides.map((slide, index) => {
                const isActive = index === currentIndex;
                return (
                  <div
                    key={slide.id}
                    className={`thumbnail-card ${isActive ? 'active' : ''}`}
                    onClick={() => goToSlide(index)}
                  >
                    <div
                      className="thumbnail-image"
                      style={{
                        backgroundImage: `url(${slide.imageUrl})`,
                      }}
                    >
                      <div className="thumbnail-overlay"></div>
                    </div>
                    <div className="thumbnail-name">{slide.title}</div>
                  </div>
                );
              })}
            </div>

            {/* Credit Text */}
            <div className="footer-credit">Created By SketchzLab</div>
          </div>
        </div>
      </div>
    </>
  );
}

export default DoubleSliderPage;


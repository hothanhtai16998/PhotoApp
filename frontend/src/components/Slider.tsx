import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './Slider.css';
import { imageService } from '@/services/imageService';
import { useImageStore } from '@/stores/useImageStore';
import type { Image } from '@/types/image';
import type { Slide } from '@/types/slide';
// ============================================
// SLIDE TIMING CONFIGURATION
// ============================================
// Change these values to adjust slide timing:
const TRANSITION_DURATION = 1200; // Time for slide transition animation (ms)
const IMAGE_VISIBLE_TIME = 5000; // Time image stays visible after transition (ms)
// Total cycle time = TRANSITION_DURATION + IMAGE_VISIBLE_TIME
const AUTO_PLAY_INTERVAL = TRANSITION_DURATION + IMAGE_VISIBLE_TIME;
// ============================================

const SWIPE_THRESHOLD = 50; // Minimum distance for swipe

function Slider() {
    const { deletedImageIds } = useImageStore();
    const [slides, setSlides] = useState<Slide[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [animatingSlide, setAnimatingSlide] = useState<number | null>(null);
    const [progress, setProgress] = useState(0);

    // Touch/swipe handlers
    const touchStartX = useRef<number>(0);
    const touchEndX = useRef<number>(0);
    const sliderRef = useRef<HTMLDivElement>(null);
    const progressRunningRef = useRef(false);
    const lastSlideIndexRef = useRef<number>(-1);
    const progressStartTimeRef = useRef<number>(0);

    // Fetch images from backend
    useEffect(() => {
        const fetchImages = async () => {
            try {
                setLoading(true);
                // Use cache-busting to ensure fresh data (same as ImageGrid)
                const response = await imageService.fetchImages({
                    limit: 10, // Fetch up to 10 images for the slider
                    page: 1,
                    _refresh: true // Cache-busting for fresh data
                });

                if (response.images && response.images.length > 0) {
                    // Filter out deleted images
                    const validImages = response.images.filter(
                        (img: Image) => !deletedImageIds.includes(img._id)
                    );

                    // Convert images to slides format
                    const slidesDataPromises = validImages.map(async (img: Image, index: number) => {
                        // Use optimized image sizes for better LCP
                        // First slide uses smaller size for faster LCP, others use regular size
                        const isFirstSlide = index === 0;

                        // Use regularUrl if available (1080px), otherwise fallback to imageUrl
                        // For first slide, prefer smaller size for faster LCP
                        const imageUrl = isFirstSlide && img.regularUrl
                            ? img.regularUrl
                            : (img.regularUrl || img.imageUrl);

                        // Detect image orientation by loading a smaller image for faster detection
                        let isPortrait = false;
                        try {
                            // Use thumbnail or small URL for faster detection, fallback to regular URL
                            const detectionUrl = img.thumbnailUrl || img.smallUrl || imageUrl;

                            await Promise.race([
                                new Promise<void>((resolve) => {
                                    const testImg = new Image();
                                    testImg.crossOrigin = 'anonymous';
                                    testImg.onload = () => {
                                        isPortrait = testImg.naturalHeight > testImg.naturalWidth;
                                        resolve();
                                    };
                                    testImg.onerror = () => {
                                        // Default to landscape if image fails to load
                                        resolve();
                                    };
                                    testImg.src = detectionUrl;
                                }),
                                new Promise<void>((resolve) => {
                                    // Increased timeout to 5 seconds for better detection
                                    setTimeout(() => resolve(), 5000);
                                })
                            ]);
                        } catch {
                            // If anything fails, default to landscape
                            console.warn('Failed to detect image orientation, defaulting to landscape');
                        }

                        const slideData: Slide = {
                            id: img._id,
                            title: img.imageTitle,
                            uploadedBy: img.uploadedBy,
                            backgroundImage: imageUrl,
                            location: img.location,
                            cameraModel: img.cameraModel,
                            category: img.imageCategory,
                            createdAt: img.createdAt,
                            isPortrait,
                            isFirstSlide, // Track if this is the first slide for LCP optimization
                        };

                        return slideData;
                    });

                    const slidesData = await Promise.all(slidesDataPromises);

                    // Filter out any slides that were deleted during async processing
                    const finalSlides = slidesData.filter(
                        (slide) => !deletedImageIds.includes(slide.id)
                    );

                    setSlides(finalSlides);
                    // Reset to first slide when new images are loaded, but ensure valid index
                    if (finalSlides.length > 0 && currentSlide >= finalSlides.length) {
                        setCurrentSlide(0);
                    } else if (finalSlides.length === 0) {
                        setCurrentSlide(0);
                    }
                } else {
                    // If no images, set empty array
                    setSlides([]);
                }
            } catch (error) {
                console.error('Error fetching images:', error);
                setSlides([]);
            } finally {
                setLoading(false);
            }
        };

        fetchImages();
    }, [deletedImageIds]); // Re-fetch when deleted images change

    // Filter out deleted slides when deletedImageIds changes
    useEffect(() => {
        if (slides.length > 0 && deletedImageIds.length > 0) {
            const filteredSlides = slides.filter(
                (slide) => !deletedImageIds.includes(slide.id)
            );
            if (filteredSlides.length !== slides.length) {
                setSlides(filteredSlides);
                // Adjust current slide index if needed
                if (currentSlide >= filteredSlides.length && filteredSlides.length > 0) {
                    setCurrentSlide(filteredSlides.length - 1);
                } else if (filteredSlides.length === 0) {
                    setCurrentSlide(0);
                }
            }
        }
    }, [deletedImageIds, slides, currentSlide]);

    const goToNext = useCallback(() => {
        if (isTransitioning || slides.length === 0) return;
        setIsTransitioning(true);
        setCurrentSlide((prev) => (prev + 1) % slides.length);
        setTimeout(() => setIsTransitioning(false), TRANSITION_DURATION);
    }, [slides.length]);

    const goToPrev = useCallback(() => {
        if (isTransitioning || slides.length === 0) return;
        setIsTransitioning(true);
        setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
        setTimeout(() => setIsTransitioning(false), TRANSITION_DURATION);
    }, [isTransitioning, slides.length]);

    // Trigger text animation when slide becomes active
    // Text appears at the same time as image change
    useEffect(() => {
        // Reset animation state when transition starts
        if (isTransitioning) {
            setAnimatingSlide(null);
            return;
        }

        // Trigger animation when transition completes (image is visible)
        const timer = setTimeout(() => {
            setAnimatingSlide(currentSlide);
        }, 50); // Small delay to ensure DOM is ready
        return () => clearTimeout(timer);
    }, [currentSlide, isTransitioning]);

    // Auto-play functionality with progress indicator
    // Progress ring runs continuously for the full cycle (6.3s including transition)
    useEffect(() => {
        if (slides.length === 0) {
            setProgress(0);
            progressRunningRef.current = false;
            lastSlideIndexRef.current = -1;
            return;
        }

        // Only start progress if slide actually changed
        const slideChanged = currentSlide !== lastSlideIndexRef.current;

        if (!slideChanged) {
            // Slide hasn't changed, don't restart
            return;
        }

        // Slide changed - reset and start fresh
        // Always reset refs to ensure clean state
        lastSlideIndexRef.current = currentSlide;
        progressRunningRef.current = true;
        progressStartTimeRef.current = Date.now();
        setProgress(0);

        let animationFrameId: number | null = null;
        let slideTimeout: ReturnType<typeof setTimeout> | null = null;
        let transitionTimeout: ReturnType<typeof setTimeout> | null = null;

        const animate = () => {
            // Check if we should still be running (slide hasn't changed)
            if (currentSlide !== lastSlideIndexRef.current || !progressRunningRef.current) {
                return;
            }

            const elapsed = Date.now() - progressStartTimeRef.current;
            const newProgress = Math.min((elapsed / AUTO_PLAY_INTERVAL) * 100, 100);
            setProgress(newProgress);

            if (newProgress < 100) {
                animationFrameId = requestAnimationFrame(animate);
            } else {
                // Progress completed, but don't set progressRunningRef to false here
                // Let the timeout handle the next slide transition
            }
        };

        animationFrameId = requestAnimationFrame(animate);

        // Advance to next slide after AUTO_PLAY_INTERVAL (full cycle)
        slideTimeout = setTimeout(() => {
            // Only advance if we're still on the same slide
            if (currentSlide === lastSlideIndexRef.current) {
                // Inline goToNext logic to avoid dependency on isTransitioning
                setIsTransitioning(true);
                setCurrentSlide((prev) => (prev + 1) % slides.length);
                transitionTimeout = setTimeout(() => setIsTransitioning(false), TRANSITION_DURATION);
            }
        }, AUTO_PLAY_INTERVAL);

        return () => {
            if (animationFrameId !== null) {
                cancelAnimationFrame(animationFrameId);
            }
            if (slideTimeout) clearTimeout(slideTimeout);
            if (transitionTimeout) clearTimeout(transitionTimeout);
        };
    }, [currentSlide, slides.length]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') {
                goToPrev();
            } else if (e.key === 'ArrowRight') {
                goToNext();
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [goToNext, goToPrev]);

    // Touch/swipe handlers
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
        const isLeftSwipe = distance > SWIPE_THRESHOLD;
        const isRightSwipe = distance < -SWIPE_THRESHOLD;

        if (isLeftSwipe) {
            goToNext();
        } else if (isRightSwipe) {
            goToPrev();
        }

        // Reset
        touchStartX.current = 0;
        touchEndX.current = 0;
    };

    // Initialize first slide when slides are loaded
    useEffect(() => {
        if (slides.length > 0 && !loading) {
            const timer = setTimeout(() => {
                setAnimatingSlide(0);
            }, 200);
            return () => clearTimeout(timer);
        }
    }, [slides.length, loading]);

    // Show loading state
    if (loading) {
        return (
            <div className="training-slider-page">
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100vh',
                    color: 'rgb(236, 222, 195)',
                    fontSize: '18px'
                }}>
                    Đang tải ảnh...
                </div>
            </div>
        );
    }

    // Show empty state if no images
    if (slides.length === 0) {
        return (
            <div className="training-slider-page">
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100vh',
                    color: 'rgb(236, 222, 195)',
                    fontSize: '18px'
                }}>
                    Chưa có ảnh
                </div>
            </div>
        );
    }

    return (
        <div
            className="slider-page"
            ref={sliderRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Slides Container */}
            <div className="slider-container">
                {slides.filter(slide => !deletedImageIds.includes(slide.id)).map((slide, index) => {
                    const isActive = index === currentSlide;
                    const isFirstSlide = index === 0;
                    const isPrev = index === (currentSlide - 1 + slides.length) % slides.length;
                    const isNext = index === (currentSlide + 1) % slides.length;
                    const shouldShow = isActive || (isTransitioning && (isPrev || isNext));

                    return (
                        <div
                            key={slide.id}
                            className={`slider-slide ${isActive ? 'active' : ''} ${shouldShow ? 'visible' : ''} ${slide.isPortrait ? 'portrait' : 'landscape'}`}
                            style={{
                                backgroundImage: `url(${slide.backgroundImage})`,
                            }}
                        >
                            {/* Preload image with priority for first slide (LCP optimization) */}
                            {isActive && isFirstSlide && (
                                <img
                                    src={slide.backgroundImage}
                                    alt=""
                                    fetchPriority="high"
                                    loading="eager"
                                    style={{
                                        position: 'absolute',
                                        width: 0,
                                        height: 0,
                                        opacity: 0,
                                        pointerEvents: 'none'
                                    }}
                                    onLoad={(e) => {
                                        const img = e.currentTarget;
                                        const isPortraitImg = img.naturalHeight > img.naturalWidth;
                                        const slideElement = img.parentElement;
                                        if (slideElement && isPortraitImg !== slide.isPortrait) {
                                            // Update class if orientation was misdetected
                                            if (isPortraitImg) {
                                                slideElement.classList.add('portrait');
                                                slideElement.classList.remove('landscape');
                                            } else {
                                                slideElement.classList.add('landscape');
                                                slideElement.classList.remove('portrait');
                                            }
                                            // Update slide state to persist the correction
                                            setSlides(prevSlides =>
                                                prevSlides.map(s =>
                                                    s.id === slide.id
                                                        ? { ...s, isPortrait: isPortraitImg }
                                                        : s
                                                )
                                            );
                                        }
                                    }}
                                />
                            )}
                            {/* Hidden image to detect orientation on load for other slides */}
                            {!(isActive && isFirstSlide) && (
                                <img
                                    src={slide.backgroundImage}
                                    alt=""
                                    loading="lazy"
                                    style={{ display: 'none' }}
                                    onLoad={(e) => {
                                        const img = e.currentTarget;
                                        const isPortraitImg = img.naturalHeight > img.naturalWidth;
                                        const slideElement = img.parentElement;
                                        if (slideElement && isPortraitImg !== slide.isPortrait) {
                                            // Update class if orientation was misdetected
                                            if (isPortraitImg) {
                                                slideElement.classList.add('portrait');
                                                slideElement.classList.remove('landscape');
                                            } else {
                                                slideElement.classList.add('landscape');
                                                slideElement.classList.remove('portrait');
                                            }
                                            // Update slide state to persist the correction
                                            setSlides(prevSlides =>
                                                prevSlides.map(s =>
                                                    s.id === slide.id
                                                        ? { ...s, isPortrait: isPortraitImg }
                                                        : s
                                                )
                                            );
                                        }
                                    }}
                                />
                            )}
                            <div className="slide-overlay"></div>

                            {/* Title and Navigation in Bottom Left */}
                            <div className={`slide-content-left ${isActive && !isTransitioning && animatingSlide === index ? 'active' : ''}`}>
                                <h1 className={`slide-title ${isActive && !isTransitioning && animatingSlide === index ? 'active' : ''}`}>{slide.title}</h1>

                                {/* Image Info - Mobile Only */}
                                <div className="slide-image-info-mobile">
                                    {slide.location && (
                                        <div className="info-item">
                                            <span className="info-label">Địa điểm:</span>
                                            <span className="info-value">{slide.location}</span>
                                        </div>
                                    )}
                                    {slide.createdAt && (
                                        <div className="info-item">
                                            <span className="info-label">Ngày:</span>
                                            <span className="info-value">
                                                {new Date(slide.createdAt).toLocaleDateString('vi-VN', {
                                                    day: 'numeric',
                                                    month: 'long',
                                                    year: 'numeric'
                                                })}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="slide-nav-buttons">
                                    <button
                                        className="slide-nav-btn prev-btn"
                                        onClick={goToPrev}
                                        aria-label="Previous slide"
                                    >
                                        <ChevronLeft size={18} className="nav-icon" />
                                        <span className="nav-text">Quay lại</span>
                                    </button>
                                    <span className="nav-separator">/</span>
                                    <button
                                        className="slide-nav-btn next-btn"
                                        onClick={goToNext}
                                        aria-label="Next slide"
                                    >
                                        <span className="nav-text">Tiếp theo</span>
                                        <ChevronRight size={18} className="nav-icon" />
                                    </button>
                                </div>
                            </div>

                            {/* Image Info in Bottom Right */}
                            {(slide.location || slide.cameraModel || slide.createdAt) && (
                                <div className={`slide-content-right ${isActive && !isTransitioning && animatingSlide === index ? 'active' : ''}`}>
                                    <div className="image-info-box">
                                        {slide.uploadedBy && (
                                            <div className="info-item">
                                                <span className="info-label">Người đăng:</span>
                                                <span className="info-value">
                                                    {slide.uploadedBy.displayName || slide.uploadedBy.username || 'Unknown'}
                                                </span>
                                            </div>
                                        )}
                                        {slide.location && (
                                            <div className="info-item">
                                                <span className="info-label">Địa điểm:</span>
                                                <span className="info-value">{slide.location}</span>
                                            </div>
                                        )}
                                        {slide.cameraModel && (
                                            <div className="info-item">
                                                <span className="info-label">Camera:</span>
                                                <span className="info-value">{slide.cameraModel}</span>
                                            </div>
                                        )}

                                        {slide.createdAt && (
                                            <div className="info-item">
                                                <span className="info-label">Ngày:</span>
                                                <span className="info-value">
                                                    {new Date(slide.createdAt).toLocaleDateString('vi-VN', {
                                                        day: 'numeric',
                                                        month: 'long',
                                                        year: 'numeric'
                                                    })}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                        </div>
                    );
                })}
            </div>

            {/* Brown Block in Bottom Left */}
            {/* <div className="block-top-right"></div>
            <div className="block-bottom"></div>
            <div className="block-bottom-2"></div> */}



            {/* Floating Side Navigation Buttons - Mobile Only */}
            <button
                className="slider-side-nav-btn slider-side-nav-left"
                onClick={goToPrev}
                aria-label="Previous slide"
            >
                <ChevronLeft size={24} />
            </button>
            <button
                className="slider-side-nav-btn slider-side-nav-right"
                onClick={goToNext}
                aria-label="Next slide"
            >
                <ChevronRight size={24} />
            </button>

            {/* Circular Progress Indicator - Bottom Right */}
            {slides.length > 0 && (
                <div className="progress-indicator visible">
                    <svg className="progress-ring" width="60" height="60" viewBox="0 0 60 60">
                        <circle
                            className="progress-ring-circle-bg"
                            stroke="rgba(236, 222, 195, 0.2)"
                            strokeWidth="5"
                            fill="transparent"
                            r="20"
                            cx="30"
                            cy="30"
                        />
                        <circle
                            className="progress-ring-circle"
                            stroke="rgb(236, 222, 195)"
                            strokeWidth="5"
                            fill="transparent"
                            r="20"
                            cx="30"
                            cy="30"
                            strokeDasharray={125.66}
                            strokeDashoffset={125.66 * (1 - progress / 100)}
                            strokeLinecap="round"
                        />
                    </svg>
                </div>
            )}
        </div>
    );
}

export default Slider;


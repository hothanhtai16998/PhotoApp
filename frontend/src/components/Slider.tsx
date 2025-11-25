import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './Slider.css';
import { imageService } from '@/services/imageService';
import { useImageStore } from '@/stores/useImageStore';
import type { Image } from '@/types/image';
import type { Slide } from '@/types/slide';
import { useAutoPlay } from '@/hooks/useAutoPlay';
import { SLIDER_CONSTANTS } from '@/utils/sliderConstants';
import SlideStyleSelector, { type SlideTransitionStyle } from './SlideStyleSelector';
import { loadSlideStyle } from '@/utils/localStorage';

const { TRANSITION_DURATION, SWIPE_THRESHOLD, ORIENTATION_DETECTION_TIMEOUT, SLIDER_IMAGE_LIMIT, ANIMATION_DELAY } = SLIDER_CONSTANTS;

function Slider() {
    const { deletedImageIds } = useImageStore();
    const [slides, setSlides] = useState<Slide[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [animatingSlide, setAnimatingSlide] = useState<number | null>(null);
    // Both left and right text always use typewriter
    const animationType = 'typewriter' as const;
    const [isTypewriterReversing, setIsTypewriterReversing] = useState(false);
    const [slidesReady, setSlidesReady] = useState(false);
    const [transitionStyle, setTransitionStyle] = useState<SlideTransitionStyle>('fade' as SlideTransitionStyle);

    // Touch/swipe handlers
    const touchStartX = useRef<number>(0);
    const touchEndX = useRef<number>(0);
    const sliderRef = useRef<HTMLDivElement>(null);
    const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const prevScrollYRef = useRef<number>(0);

    // Load transition style from localStorage
    useEffect(() => {
        const savedStyle = loadSlideStyle();
        const validStyles = ['fade', 'slide', 'slideVertical', 'cube', 'flip', 'cover', 'reveal', 'zoom', 'blur', 'glitch', 'split', 'cards', 'parallax', 'wipe', 'dissolve', 'push', 'doors', 'orbit', 'morph', 'swirl', 'pageTurn', 'accordion', 'shuffle'];
        if (savedStyle && validStyles.includes(savedStyle)) {
            setTransitionStyle(savedStyle as SlideTransitionStyle);
        }
    }, []);

    // Fetch images from backend
    useEffect(() => {
        const fetchImages = async () => {
            try {
                setLoading(true);
                // Use cache-busting to ensure fresh data (same as ImageGrid)
                const response = await imageService.fetchImages({
                    limit: SLIDER_IMAGE_LIMIT,
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

                            let timeoutId: ReturnType<typeof setTimeout> | null = null;
                            
                            await Promise.race([
                                new Promise<void>((resolve) => {
                                    const testImg = new Image();
                                    testImg.crossOrigin = 'anonymous';
                                    testImg.onload = () => {
                                        isPortrait = testImg.naturalHeight > testImg.naturalWidth;
                                        if (timeoutId) clearTimeout(timeoutId);
                                        resolve();
                                    };
                                    testImg.onerror = () => {
                                        // Default to landscape if image fails to load
                                        if (timeoutId) clearTimeout(timeoutId);
                                        resolve();
                                    };
                                    testImg.src = detectionUrl;
                                }),
                                new Promise<void>((resolve) => {
                                    timeoutId = setTimeout(() => {
                                        resolve();
                                    }, ORIENTATION_DETECTION_TIMEOUT);
                                })
                            ]);
                        } catch {
                            // If anything fails, default to landscape
                            // Error is handled silently to avoid console noise
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
                    // Mark slides as ready when they're first loaded
                    // Use a separate effect trigger to ensure this happens
                    if (finalSlides.length > 0) {
                        setSlidesReady(true);
                    }
                    // Reset to first slide when new images are loaded, but ensure valid index
                    if (finalSlides.length > 0 && currentSlide >= finalSlides.length) {
                        setCurrentSlide(0);
                    } else if (finalSlides.length === 0) {
                        setCurrentSlide(0);
                        setSlidesReady(false);
                    }
                } else {
                    // If no images, set empty array
                    setSlides([]);
                }
            } catch (error) {
                // Error is handled silently - slides will remain empty
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
        // Prevent scroll to top
        const scrollY = window.scrollY;
        // Reset animation state to hide text during transition
        setAnimatingSlide(null);
        setIsTransitioning(true);
        setCurrentSlide((prev) => (prev + 1) % slides.length);
        
        // Restore scroll position after state update
        requestAnimationFrame(() => {
            window.scrollTo(0, scrollY);
        });
        
        // Clear any existing timeout
        if (transitionTimeoutRef.current) {
            clearTimeout(transitionTimeoutRef.current);
        }
        transitionTimeoutRef.current = setTimeout(() => setIsTransitioning(false), TRANSITION_DURATION);
    }, [isTransitioning, slides.length]);

    const goToPrev = useCallback(() => {
        if (isTransitioning || slides.length === 0) return;
        // Save scroll position before state change
        prevScrollYRef.current = window.scrollY;
        // Reset animation state to hide text during transition
        setAnimatingSlide(null);
        setIsTransitioning(true);
        setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
        
        // Clear any existing timeout
        if (transitionTimeoutRef.current) {
            clearTimeout(transitionTimeoutRef.current);
        }
        transitionTimeoutRef.current = setTimeout(() => setIsTransitioning(false), TRANSITION_DURATION);
    }, [isTransitioning, slides.length, currentSlide]);

    // Trigger text animation when slide becomes active
    // Text appears 500ms after image change
    useEffect(() => {
        if (slides.length === 0) return;
        
        // Reset animation state when slide changes
        setAnimatingSlide(null);
        
        // Set animation state after 500ms delay
        const timer = setTimeout(() => {
            setAnimatingSlide(currentSlide);
        }, ANIMATION_DELAY);
        
        return () => clearTimeout(timer);
    }, [currentSlide, slides.length]);

    // Handle auto-play next slide transition
    // Use refs to avoid recreating callback on every render
    const isTransitioningRef = useRef(isTransitioning);
    const slidesLengthRef = useRef(slides.length);
    const currentSlideRef = useRef(currentSlide);
    
    useEffect(() => {
        isTransitioningRef.current = isTransitioning;
        slidesLengthRef.current = slides.length;
        currentSlideRef.current = currentSlide;
    }, [isTransitioning, slides.length, currentSlide]);
    
    const handleAutoPlayNext = useCallback(() => {
        if (isTransitioningRef.current || slidesLengthRef.current === 0) return;
        // Save scroll position before state change
        prevScrollYRef.current = window.scrollY;
        // Reset animation state to hide text during transition
        setAnimatingSlide(null);
        setIsTransitioning(true);
        setCurrentSlide((prev) => (prev + 1) % slidesLengthRef.current);
        
        // Clear any existing timeout
        if (transitionTimeoutRef.current) {
            clearTimeout(transitionTimeoutRef.current);
        }
        transitionTimeoutRef.current = setTimeout(() => setIsTransitioning(false), TRANSITION_DURATION);
    }, []); // Empty deps - use refs instead

    // Auto-play functionality with progress indicator
    // Use typewriter for both left and right text
    const { progress } = useAutoPlay({
        slidesLength: slides.length,
        currentSlide,
        animationType,
        slidesReady,
        onNextSlide: handleAutoPlayNext,
        onTypewriterReverse: setIsTypewriterReversing,
    });

    // Cleanup transition timeout on unmount
    useEffect(() => {
        return () => {
            if (transitionTimeoutRef.current) {
                clearTimeout(transitionTimeoutRef.current);
            }
        };
    }, []);

    // Initialize scroll position tracking
    useEffect(() => {
        prevScrollYRef.current = window.scrollY;
    }, []);

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
        <>
            <div
                className="slider-page"
                ref={sliderRef}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
            {/* Slides Container */}
            <div className={`slider-container transition-${transitionStyle}`}>
                {slides.map((slide, index) => {
                    // Skip deleted slides
                    if (deletedImageIds.includes(slide.id)) {
                        return null;
                    }
                    
                    const isActive = index === currentSlide;
                    const isFirstSlide = index === 0;
                    const isPrev = index === (currentSlide - 1 + slides.length) % slides.length;
                    const isNext = index === (currentSlide + 1) % slides.length;
                    const shouldShow = isActive || (isTransitioning && (isPrev || isNext));
                    
                    // Ensure panels show when slide is active (even during transition end)
                    const shouldShowPanels = isActive;
                    // Animate text when slide is actively animating (allow during transition for immediate appearance)
                    const shouldAnimate = animatingSlide === index;

                    return (
                        <div
                            key={slide.id}
                            className={`slider-slide ${isActive ? 'active' : ''} ${shouldShow ? 'visible' : ''} ${slide.isPortrait ? 'portrait' : 'landscape'} ${isPrev ? 'prev' : ''} ${isNext ? 'next' : ''}`}
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

                            {/* Title and Navigation in Bottom Left - Always uses typewriter */}
                            <div className={`slide-content-left ${shouldShowPanels ? 'active' : ''} ${shouldAnimate ? `animation-${animationType}` : ''} ${isTypewriterReversing && isActive && shouldAnimate ? 'typewriter-reversing' : ''}`}>
                                <h1 className={`slide-title ${shouldShowPanels && shouldAnimate ? 'active' : ''}`}>{slide.title || ''}</h1>

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
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            goToPrev();
                                        }}
                                        aria-label="Previous slide"
                                    >
                                        <ChevronLeft size={18} className="nav-icon" />
                                        <span className="nav-text">Quay lại</span>
                                    </button>
                                    <span className="nav-separator">/</span>
                                    <button
                                        className="slide-nav-btn next-btn"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            goToNext();
                                        }}
                                        aria-label="Next slide"
                                    >
                                        <span className="nav-text">Tiếp theo</span>
                                        <ChevronRight size={18} className="nav-icon" />
                                    </button>
                                </div>
                            </div>

                            {/* Image Info in Bottom Right - Always uses typewriter */}
                            {(slide.uploadedBy || slide.location || slide.cameraModel || slide.createdAt) && (
                                <div className={`slide-content-right ${shouldShowPanels ? 'active' : ''} ${shouldAnimate ? `animation-${animationType}` : ''} ${isTypewriterReversing && isActive && shouldAnimate ? 'typewriter-reversing' : ''}`}>
                                    <div className="image-info-box">
                                        {slide.uploadedBy && (
                                            <div className="info-item">
                                                <span className="info-label">Người đăng:</span>
                                                <span className="info-value">
                                                    {slide.uploadedBy.displayName || slide.uploadedBy.username || 'Không xác định'}
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
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    goToPrev();
                }}
                aria-label="Previous slide"
            >
                <ChevronLeft size={24} />
            </button>
            <button
                className="slider-side-nav-btn slider-side-nav-right"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    goToNext();
                }}
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

            {/* Slide Style Selector */}
            <SlideStyleSelector 
                currentStyle={transitionStyle}
                onStyleChange={setTransitionStyle}
            />
        </div>
        </>
    );
}

export default Slider;


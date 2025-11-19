import { useState, useEffect, useCallback, useRef } from 'react';
import './Slider.css';
import { imageService } from '@/services/imageService';
import type { Image } from '@/types/image';
import type { Slide } from '@/types/slide';
const AUTO_PLAY_INTERVAL = 5000; // 5 seconds
const SWIPE_THRESHOLD = 50; // Minimum distance for swipe

function Slider() {
    const [slides, setSlides] = useState<Slide[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [animatingSlide, setAnimatingSlide] = useState<number | null>(null);
    const [progress, setProgress] = useState(0);
    const [showProgress, setShowProgress] = useState(false);

    // Touch/swipe handlers
    const touchStartX = useRef<number>(0);
    const touchEndX = useRef<number>(0);
    const sliderRef = useRef<HTMLDivElement>(null);

    // Fetch images from backend
    useEffect(() => {
        const fetchImages = async () => {
            try {
                setLoading(true);
                const response = await imageService.fetchImages({
                    limit: 10, // Fetch up to 10 images for the slider
                    page: 1
                });

                if (response.images && response.images.length > 0) {
                    // Convert images to slides format
                    const slidesDataPromises = response.images.map(async (img: Image) => {
                        // Use full-size imageUrl for best quality to prevent pixelation
                        // imageUrl is the original full-size image, which provides the best quality
                        // For Cloudinary images, if we need specific transformations, we can add them
                        // but for now, using the full-size original ensures no pixelation
                        let imageUrl = img.imageUrl;

                        // Optional: Add Cloudinary transformations for optimal full-screen display
                        // This requests a high-quality version at 1920px width (Full HD)
                        // Only apply if the URL doesn't already have transformations
                        if (imageUrl.includes('cloudinary.com') &&
                            imageUrl.includes('/image/upload/') &&
                            !imageUrl.includes('/image/upload/w_')) {
                            try {
                                // Insert transformation into Cloudinary URL
                                // Format: .../image/upload/{transformations}/{public_id}
                                const uploadIndex = imageUrl.indexOf('/image/upload/');
                                if (uploadIndex !== -1) {
                                    const baseUrl = imageUrl.substring(0, uploadIndex + '/image/upload/'.length);
                                    const restOfUrl = imageUrl.substring(uploadIndex + '/image/upload/'.length);
                                    // w_1920: 1920px width, q_auto: auto quality, f_auto: auto format
                                    imageUrl = `${baseUrl}w_1920,q_auto,f_auto/${restOfUrl}`;
                                }
                            } catch {
                                // If transformation fails, use original URL
                                console.warn('Failed to apply Cloudinary transformation, using original URL');
                            }
                        }

                        // Detect image orientation by loading the image with timeout
                        let isPortrait = false;
                        try {
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
                                    testImg.src = imageUrl;
                                }),
                                new Promise<void>((resolve) => {
                                    // Timeout after 2 seconds - default to landscape
                                    setTimeout(() => resolve(), 2000);
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
                        };

                        return slideData;
                    });

                    const slidesData = await Promise.all(slidesDataPromises);
                    setSlides(slidesData);
                    // Reset to first slide when new images are loaded
                    setCurrentSlide(0);
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
    }, []);

    const goToNext = useCallback(() => {
        if (isTransitioning || slides.length === 0) return;
        setProgress(0);
        setIsTransitioning(true);
        setCurrentSlide((prev) => (prev + 1) % slides.length);
        setTimeout(() => setIsTransitioning(false), 1200);
    }, [isTransitioning, slides.length]);

    const goToPrev = useCallback(() => {
        if (isTransitioning || slides.length === 0) return;
        setProgress(0);
        setIsTransitioning(true);
        setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
        setTimeout(() => setIsTransitioning(false), 1200);
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
    // Progress circle appears at the same time as image change
    useEffect(() => {
        if (isTransitioning || slides.length === 0) {
            setProgress(0);
            setShowProgress(false);
            return;
        }

        setProgress(0);
        setShowProgress(true); // Show immediately when transition completes

        let progressInterval: ReturnType<typeof setInterval> | null = null;
        let slideInterval: ReturnType<typeof setTimeout> | null = null;

        const startTime = Date.now();

        progressInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const newProgress = Math.min((elapsed / AUTO_PLAY_INTERVAL) * 100, 100);
            setProgress(newProgress);
        }, 16); // ~60fps

        slideInterval = setInterval(() => {
            goToNext();
        }, AUTO_PLAY_INTERVAL);

        return () => {
            if (progressInterval) clearInterval(progressInterval);
            if (slideInterval) clearInterval(slideInterval);
        };
    }, [currentSlide, isTransitioning, goToNext, slides.length]);

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
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        touchEndX.current = e.touches[0].clientX;
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
                setShowProgress(true);
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
                {slides.map((slide, index) => {
                    const isActive = index === currentSlide;
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
                            {/* Hidden image to detect orientation on load */}
                            <img
                                src={slide.backgroundImage}
                                alt=""
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
                                    }
                                }}
                            />
                            <div className="slide-overlay"></div>

                            {/* Title and Navigation in Bottom Left */}
                            <div className={`slide-content-left ${isActive && !isTransitioning && animatingSlide === index ? 'active' : ''}`}>
                                <h1 className={`slide-title ${isActive && !isTransitioning && animatingSlide === index ? 'active' : ''}`}>{slide.title}</h1>
                                <div className="slide-nav-buttons">
                                    <button
                                        className="slide-nav-btn prev-btn"
                                        onClick={goToPrev}
                                        aria-label="Previous slide"
                                    >
                                        Quay lại
                                    </button>
                                    <span className="nav-separator">/</span>
                                    <button
                                        className="slide-nav-btn next-btn"
                                        onClick={goToNext}
                                        aria-label="Next slide"
                                    >
                                        Tiếp theo
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



            {/* Circular Progress Indicator - Bottom Right */}
            <div className={`progress-indicator ${showProgress ? 'visible' : ''}`}>
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
                        strokeDasharray={`${2 * Math.PI * 20}`}
                        strokeDashoffset={`${2 * Math.PI * 20 * (1 - progress / 100)}`}
                        strokeLinecap="round"
                    />
                </svg>
            </div>
        </div>
    );
}

export default Slider;


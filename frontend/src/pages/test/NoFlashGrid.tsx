import { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from 'react';
import api from '@/lib/axios';
import type { Image } from '@/types/image';
import { Heart, Share2, ChevronDown } from 'lucide-react';
import { favoriteService } from '@/services/favoriteService';
import { useBatchedFavoriteCheck, updateFavoriteCache } from '@/hooks/useBatchedFavoriteCheck';
import type { DownloadSize } from '@/components/image/DownloadSizeSelector';
import { shareService } from '@/utils/shareService';
import { generateImageSlug } from '@/lib/utils';
import { toast } from 'sonner';
import { useUserStore } from '@/stores/useUserStore';
import { imageFetchService } from '@/services/imageFetchService';
import { useNavigate } from 'react-router-dom';
import { t } from '@/i18n';
import leftArrowIcon from '@/assets/left-arrow.svg';
import rightArrowIcon from '@/assets/right-arrow.svg';
import closeIcon from '@/assets/close.svg';
import './NoFlashGrid.css';

type Category = { name: string; _id: string };

// Simple blur-up image with persistent back layer
type ExtendedImage = Image & { categoryName?: string; category?: string };

// Global image loading cache to prevent duplicate requests
const imageLoadCache = new Map<string, Promise<string>>();
const loadedImages = new Set<string>();

// Preload an image and cache the promise
// skipDecode: true for grid images (faster), false for modal images (prevents flash)
const preloadImage = (src: string, skipDecode = false): Promise<string> => {
    if (!src) {
        return Promise.reject(new Error('Empty image source'));
    }
    if (loadedImages.has(src)) {
        return Promise.resolve(src);
    }
    if (imageLoadCache.has(src)) {
        return imageLoadCache.get(src)!;
    }
    const promise = new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            if (skipDecode) {
                // For grid images, skip decode for faster loading
                loadedImages.add(src);
                imageLoadCache.delete(src);
                resolve(src);
            } else {
                // For modal images, decode to ensure it's ready for display (prevents flash)
                img.decode()
                    .then(() => {
                        loadedImages.add(src);
                        imageLoadCache.delete(src);
                        resolve(src);
                    })
                    .catch(() => {
                        // Even if decode fails, image is loaded
                        loadedImages.add(src);
                        imageLoadCache.delete(src);
                        resolve(src);
                    });
            }
        };
        img.onerror = () => {
            imageLoadCache.delete(src);
            reject(new Error(`Failed to load image: ${src}`));
        };
        img.src = src;
    });
    imageLoadCache.set(src, promise);
    return promise;
};

// Preload multiple images with priority
// skipDecode: true for background preloading (faster), false for critical images
const preloadImages = (sources: string[], priority = false, skipDecode = true) => {
    const validSources = sources.filter(Boolean);
    if (validSources.length === 0) return;

    if (priority) {
        // Load first image immediately, then queue others
        if (validSources[0]) {
            preloadImage(validSources[0], skipDecode).catch(() => { });
        }
        // Queue rest with slight delay to not block
        if (validSources.length > 1) {
            setTimeout(() => {
                validSources.slice(1).forEach(src => {
                    if (src) preloadImage(src, skipDecode).catch(() => { });
                });
            }, 50);
        }
    } else {
        // Load all with slight stagger to avoid overwhelming
        validSources.forEach((src, i) => {
            setTimeout(() => {
                preloadImage(src, skipDecode).catch(() => { });
            }, i * 10);
        });
    }
};

function BlurUpImage({
    image,
    onClick,
    priority = false,
    onLoadComplete,
}: {
    image: ExtendedImage;
    onClick?: () => void;
    priority?: boolean;
    onLoadComplete?: () => void;
}) {
    // Use base64 thumbnail for instant placeholder (like Unsplash) - no network request needed
    const base64Placeholder = image.base64Thumbnail || null;
    const networkPlaceholder = image.thumbnailUrl || image.smallUrl || image.imageUrl || null;
    const placeholderInitial = base64Placeholder || networkPlaceholder;
    const [loaded, setLoaded] = useState(false);
    const [backSrc, setBackSrc] = useState<string | null>(placeholderInitial);
    const [isInView, setIsInView] = useState(priority);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const frontRef = useRef<HTMLImageElement | null>(null);
    const loadingRef = useRef(false);

    // Intersection Observer for lazy loading
    useEffect(() => {
        if (priority) {
            // Use setTimeout to avoid synchronous setState in effect
            setTimeout(() => setIsInView(true), 0);
            return;
        }

        if (!containerRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setIsInView(true);
                        observer.disconnect();
                    }
                });
            },
            {
                rootMargin: '500px', // Start loading 500px before entering viewport (more aggressive)
                threshold: 0.01,
            }
        );

        observer.observe(containerRef.current);

        return () => {
            observer.disconnect();
        };
    }, [priority]);

    // Load full image when in view
    useEffect(() => {
        if (!isInView || loadingRef.current) return;

        // Use regularUrl for grid view (1080px, optimized for display)
        // This is similar to Unsplash's approach: grid uses "regular" size, not original
        // Only fallback to imageUrl if regularUrl doesn't exist (for old images)
        const full = image.regularUrl || image.imageUrl || image.smallUrl || image.thumbnailUrl || '';

        // If already using full image, no need to reload
        if (backSrc === full && loaded) return;

        loadingRef.current = true;
        // Skip decode for grid images to load faster (like admin page)
        preloadImage(full, true)
            .then((src) => {
                setBackSrc(src);
                setLoaded(true);
                onLoadComplete?.();
            })
            .catch(() => {
                // Keep placeholder on error
                setLoaded(true);
            })
            .finally(() => {
                loadingRef.current = false;
            });
    }, [isInView, image, backSrc, loaded, onLoadComplete]);

    // Preload on hover for better UX
    const handleMouseEnter = useCallback(() => {
        if (!loaded && isInView) {
            // Use regularUrl for hover preload (grid images)
            const full = image.regularUrl || image.imageUrl || image.thumbnailUrl || image.smallUrl;
            if (full && full !== backSrc) {
                // Skip decode for hover preload (grid images)
                preloadImage(full, true).catch(() => { });
            }
        }
    }, [loaded, isInView, image, backSrc]);

    return (
        <div
            ref={containerRef}
            className="blur-up-image-container"
            onClick={onClick}
            onMouseEnter={handleMouseEnter}
        >
            {backSrc && (
                <img
                    src={backSrc}
                    alt={image.imageTitle || 'photo'}
                    className={`blur-up-image ${loaded ? 'loaded' : 'loading'}`}
                    ref={frontRef}
                    loading="lazy"
                />
            )}
        </div>
    );
}

// Modal with double-buffer, no opacity drops
function ImageModal({
    images,
    index,
    onClose,
    onNavigate,
    onSelectIndex,
}: {
    images: ExtendedImage[];
    index: number;
    onClose: () => void;
    onNavigate: (next: number) => void;
    onSelectIndex?: (idx: number) => void;
}) {
    const img = images[index];

    // Calculate initial state based on current image
    const calculateInitialState = () => {
        if (!img) return { src: null, isFullQuality: false };
        // Use base64 thumbnail for instant display (no network delay)
        // Then immediately load network thumbnail (larger, better quality)
        const base64Placeholder = img.base64Thumbnail || null;
        const networkThumbnail = img.thumbnailUrl || img.smallUrl || img.imageUrl || '';
        const full = img.regularUrl || img.imageUrl || '';

        // Start with base64 for instant display (prevents blank space)
        // Network thumbnail will load immediately after (fast, small file)
        return {
            src: base64Placeholder || networkThumbnail || full,
            isFullQuality: false,
            isBase64: !!base64Placeholder
        };
    };

    const [imageState, setImageState] = useState(calculateInitialState);
    const [frontSrc, setFrontSrc] = useState<string | null>(null); // Full-quality image (front layer)
    const [backSrc, setBackSrc] = useState<string | null>(imageState.src); // Low-quality placeholder (back layer)
    const backSrcRef = useRef<string | null>(imageState.src); // Track current backSrc to prevent unnecessary updates
    // const isFullQuality = imageState.isFullQuality || frontSrc !== null; // True if front layer is ready

    // Initialize refs (simplified - no aspect ratio calculations needed)
    const imgElementRef = useRef<HTMLImageElement | null>(null);
    const modalRef = useRef<HTMLDivElement | null>(null);
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const scrollPosRef = useRef(0);
    const previousImgRef = useRef<ExtendedImage | null>(img);
    const [isScrolled, setIsScrolled] = useState(false);
    const [shouldAnimate, setShouldAnimate] = useState(false);
    const { user } = useUserStore();
    const isFavorited = useBatchedFavoriteCheck(img?._id);
    const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
    const [showDownloadMenu, setShowDownloadMenu] = useState(false);
    const [, setShowShareMenu] = useState(false);
    const [showAuthorTooltip, setShowAuthorTooltip] = useState(false);
    const [tooltipAnimating, setTooltipAnimating] = useState(false);
    const authorTooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const authorAreaRef = useRef<HTMLDivElement | null>(null);
    const [authorImages, setAuthorImages] = useState<ExtendedImage[]>([]);
    const [loadingAuthorImages, setLoadingAuthorImages] = useState(false);
    const [, setLocaleUpdate] = useState(0);
    const navigate = useNavigate();
    const authorName =
        (img as any)?.uploadedBy?.username ||
        (img as any)?.author ||
        (img as any)?.user ||
        'Author';
    // No aspect ratio calculations needed - browser handles it with object-fit: contain

    // lock body scroll
    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        document.body.classList.add('image-modal-open');
        return () => {
            document.body.style.overflow = prev;
            document.body.classList.remove('image-modal-open');
        };
    }, []);

    // Enhanced preloading: next/prev + nearby images
    useEffect(() => {
        const preloadIndices = [
            (index + 1) % images.length,
            (index - 1 + images.length) % images.length,
            (index + 2) % images.length,
            (index - 2 + images.length) % images.length,
        ];

        const sources: string[] = [];
        preloadIndices.forEach((i) => {
            const target = images[i];
            if (!target) return;
            const src = target.regularUrl || target.imageUrl || target.smallUrl || target.thumbnailUrl;
            if (src && !loadedImages.has(src)) {
                sources.push(src);
            }
        });

        // Preload with priority for next/prev (modal images - keep decode to prevent flash)
        if (sources.length > 0 && sources[0]) {
            preloadImage(sources[0], false); // Next image - decode for smooth transition
            if (sources.length > 1 && sources[1]) {
                preloadImage(sources[1], false); // Prev image - decode for smooth transition
            }
            // Preload nearby images with delay (can skip decode for background preload)
            if (sources.length > 2) {
                setTimeout(() => {
                    sources.slice(2).forEach(src => {
                        if (src) preloadImage(src, true).catch(() => { }); // Skip decode for background preload
                    });
                }, 200);
            }
        }
    }, [index, images]);

    useLayoutEffect(() => {
        if (!img) return;

        // Track current image to prevent race conditions
        const currentImageId = img._id;
        previousImgRef.current = img;

        // reset scroll to top when image changes so top bar/author stay visible
        scrollPosRef.current = 0;
        if (scrollRef.current) {
            scrollRef.current.scrollTop = 0;
        }
        // Reset scroll state when image changes (use requestAnimationFrame to avoid cascading renders)
        requestAnimationFrame(() => {
            setIsScrolled(false);
            setShouldAnimate(false);
        });

        // Close menus when image changes
        setShowDownloadMenu(false);
        setShowShareMenu(false);
        setShowAuthorTooltip(false);
        // Clear author tooltip timeout
        if (authorTooltipTimeoutRef.current) {
            clearTimeout(authorTooltipTimeoutRef.current);
            authorTooltipTimeoutRef.current = null;
        }

        // Unsplash technique: Use different image sizes
        // Low-res thumbnail = thumbnailUrl or smallUrl (small file, pixelated when enlarged to full size)
        // High-res = regularUrl or imageUrl (full quality, sharp at full size)
        const thumbnail = img.thumbnailUrl || img.smallUrl || img.imageUrl || '';
        const full = img.regularUrl || img.imageUrl || '';

        // Calculate what the state should be
        const currentState = calculateInitialState();
        const newBackSrc = currentState.src;

        // Update imageState (for tracking, but don't use it directly for backSrc)
        setImageState(currentState);

        // Don't reset frontSrc immediately - keep old image visible until new backSrc is ready
        // This prevents flash when both layers change at once
        // We'll clear it after the new backSrc is set

        // Update backSrc: Use base64 for instant display, then immediately load network thumbnail
        if (newBackSrc && newBackSrc !== backSrcRef.current) {
            const isBase64 = newBackSrc.startsWith('data:');

            if (isBase64) {
                // Base64 thumbnails are instant (embedded in JSON) - update synchronously
                backSrcRef.current = newBackSrc;
                setBackSrc(newBackSrc);

                // Immediately load network thumbnail (larger, better quality) to replace base64
                const networkThumbnail = img.thumbnailUrl || img.smallUrl || img.imageUrl || '';
                if (networkThumbnail && networkThumbnail !== newBackSrc) {
                    // Preload network thumbnail immediately (small file, loads fast)
                    preloadImage(networkThumbnail, true) // Skip decode for faster loading
                        .then((src) => {
                            // Replace base64 with network thumbnail once loaded
                            if (previousImgRef.current?._id === currentImageId) {
                                backSrcRef.current = src;
                                setBackSrc(src);
                            }
                        })
                        .catch(() => {
                            // Keep base64 if network thumbnail fails
                        });
                }

                // Clear front layer after back layer is updated (prevents flash)
                requestAnimationFrame(() => {
                    if (previousImgRef.current?._id === currentImageId) {
                        setFrontSrc(null);
                    }
                });
            } else {
                // For network thumbnails, check cache first
                if (loadedImages.has(newBackSrc)) {
                    // Already cached - update immediately (no flash)
                    backSrcRef.current = newBackSrc;
                    setBackSrc(newBackSrc);
                    // Clear front layer after back layer is updated
                    requestAnimationFrame(() => {
                        if (previousImgRef.current?._id === currentImageId) {
                            setFrontSrc(null);
                        }
                    });
                } else {
                    // Not cached - keep old placeholder visible, preload new one
                    // Only update backSrc after new thumbnail is ready to prevent flash
                    // Keep decode for modal images to prevent flashing
                    preloadImage(newBackSrc, false)
                        .then((src) => {
                            // Only update if still showing the same image
                            if (previousImgRef.current?._id === currentImageId) {
                                backSrcRef.current = src;
                                setBackSrc(src);
                                // Clear front layer after back layer is updated
                                requestAnimationFrame(() => {
                                    if (previousImgRef.current?._id === currentImageId) {
                                        setFrontSrc(null);
                                    }
                                });
                            }
                        })
                        .catch(() => {
                            // On error, still set it (better than blank)
                            if (previousImgRef.current?._id === currentImageId) {
                                backSrcRef.current = newBackSrc;
                                setBackSrc(newBackSrc);
                                setFrontSrc(null);
                            }
                        });
                }
            }
        } else if (!newBackSrc) {
            // If no backSrc, clear it
            backSrcRef.current = null;
            setBackSrc(null);
        }

        // Load full image in background (front layer)
        // This creates the double-buffer effect: back layer (low-res) + front layer (high-res)
        // Reuse thumbnail and full already declared above (lines 437-438)
        // Only load full image if it's different from the thumbnail
        if (full && full !== thumbnail) {
            // Check if already loaded
            if (loadedImages.has(full)) {
                setFrontSrc(full);
            } else {
                // Preload full image (with decode for smooth transition)
                preloadImage(full, false)
                    .then((src) => {
                        // Only update if still showing the same image
                        if (previousImgRef.current?._id === currentImageId) {
                            setFrontSrc(src);
                        }
                    })
                    .catch(() => {
                        // On error, keep showing back layer (thumbnail)
                    });
            }
        } else {
            // If no full image to load, ensure front layer is cleared
            setFrontSrc(null);
        }
    }, [img]);

    // No need for resize calculations - CSS handles it automatically

    // Cleanup author tooltip timeout on unmount
    useEffect(() => {
        return () => {
            if (authorTooltipTimeoutRef.current) {
                clearTimeout(authorTooltipTimeoutRef.current);
            }
        };
    }, []);

    // Trigger animation when tooltip appears
    useEffect(() => {
        if (showAuthorTooltip) {
            // Small delay to ensure DOM is ready, then trigger animation
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setTooltipAnimating(true);
                });
            });
        } else {
            setTooltipAnimating(false);
        }
    }, [showAuthorTooltip]);

    // Listen for locale changes to re-render translations
    useEffect(() => {
        const handleLocaleChange = () => {
            setLocaleUpdate(prev => prev + 1);
        };
        window.addEventListener('localeChange', handleLocaleChange);
        return () => window.removeEventListener('localeChange', handleLocaleChange);
    }, []);

    // Close download menu when clicking outside
    useEffect(() => {
        if (!showDownloadMenu) return;
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target.closest('[data-download-menu]')) {
                setShowDownloadMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showDownloadMenu]);

    const handleOverlayClick = useCallback(
        (e: React.MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
                onClose();
            }
        },
        [onClose]
    );

    // Handle download
    const handleDownload = useCallback(async (size: DownloadSize) => {
        if (!img?._id) return;
        try {
            const response = await api.get(`/images/${img._id}/download?size=${size}`, {
                responseType: 'blob',
                withCredentials: true,
            });
            const blob = new Blob([response.data], { type: response.headers['content-type'] || 'image/webp' });
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            const contentDisposition = response.headers['content-disposition'];
            let fileName = 'photo.webp';
            if (contentDisposition) {
                const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
                if (fileNameMatch) {
                    fileName = fileNameMatch[1];
                }
            } else {
                const sanitizedTitle = (img.imageTitle || 'photo').replace(/[^a-z0-9]/gi, '_').toLowerCase();
                const urlExtension = img.imageUrl?.match(/\.([a-z]+)(?:\?|$)/i)?.[1] || 'webp';
                fileName = `${sanitizedTitle}.${urlExtension}`;
            }
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
            toast.success(t('image.downloadSuccess'));
            setShowDownloadMenu(false);
        } catch (error) {
            console.error('Download failed:', error);
            toast.error(t('image.downloadFailed'));
        }
    }, [img]);

    // Handle toggle favorite
    const handleToggleFavorite = useCallback(async () => {
        if (!user || !img?._id || isTogglingFavorite) return;
        setIsTogglingFavorite(true);
        try {
            const imageId = String(img._id);
            const response = await favoriteService.toggleFavorite(imageId);
            updateFavoriteCache(imageId, response.isFavorited);
            if (response.isFavorited) {
                toast.success(t('favorites.added'));
            } else {
                toast.success(t('favorites.removed'));
            }
        } catch (error) {
            console.error('Failed to toggle favorite:', error);
            toast.error(t('favorites.updateFailed'));
        } finally {
            setIsTogglingFavorite(false);
        }
    }, [user, img, isTogglingFavorite]);

    // Handle share
    const handleShare = useCallback(() => {
        if (!img?._id) return;
        const slug = generateImageSlug(img.imageTitle || 'Untitled', img._id);
        const shareUrl = `${window.location.origin}/photos/${slug}`;
        if (navigator.share) {
            navigator.share({
                title: img.imageTitle || 'Photo',
                text: `Check out this photo: ${img.imageTitle || 'Untitled'}`,
                url: shareUrl,
            }).catch(() => { });
        } else {
            shareService.copyToClipboard(shareUrl).then((success) => {
                if (success) {
                    toast.success(t('share.linkCopied'));
                } else {
                    toast.error(t('share.linkCopyFailed'));
                }
            });
        }
        setShowShareMenu(false);
    }, [img]);

    return (
        !img ? null :
            <div
                onClick={handleOverlayClick}
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.4)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                    padding: 0,
                    // No transition to prevent flash on open
                    transition: 'none',
                }}
            >
                <div
                    ref={modalRef}
                    style={{
                        position: 'relative',
                        width: 'clamp(1400px, 90vw, 1600px)',
                        height: '100vh',
                        background: '#ffffff',
                        borderRadius: 0,
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        marginTop: isScrolled ? 0 : 16, // Space initially, no space when scrolled
                        // Smooth transition only when first crossing threshold (scrolling down), instant otherwise
                        transition: shouldAnimate ? 'margin-top 0.2s ease-out' : 'none',
                    }}
                >
                    {/* Scroll area inside modal */}
                    <div
                        ref={scrollRef}
                        style={{
                            flex: 1,
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                        onScroll={(e) => {
                            const top = (e.currentTarget as HTMLDivElement).scrollTop;
                            const prevTop = scrollPosRef.current;
                            const wasScrolled = prevTop > 0;
                            scrollPosRef.current = top;

                            // Check if scrolled past the initial spacer (16px)
                            const nowScrolled = top > 0;
                            setIsScrolled(nowScrolled);

                            // Only animate when transitioning from not-scrolled to scrolled (scrolling down past threshold)
                            // Make it instant when scrolling up or already at top
                            if (nowScrolled && !wasScrolled && top > prevTop) {
                                setShouldAnimate(true);
                                // Reset animation flag after transition completes
                                setTimeout(() => setShouldAnimate(false), 200);
                            } else if (!nowScrolled || top <= prevTop) {
                                // Scrolling up or at top - make it instant
                                setShouldAnimate(false);
                            }
                        }}
                    >
                        {/* Top info - Sticky: starts with space, sticks to viewport top when scrolling */}
                        <div
                            style={{
                                position: 'sticky',
                                top: 0, // Sticks to top of scroll container (which becomes viewport top when modal margin is 0)
                                height: 72,
                                minHeight: 72,
                                padding: '12px 16px',
                                background: 'transparent',
                                color: '#333',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                zIndex: 10, // Ensure it stays on top when scrolling
                            }}
                        >
                            <div
                                ref={authorAreaRef}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    position: 'relative',
                                }}
                                onMouseEnter={() => {
                                    // Clear any hide timeout
                                    if ((authorAreaRef.current as any)?.hideTimeout) {
                                        clearTimeout((authorAreaRef.current as any).hideTimeout);
                                        (authorAreaRef.current as any).hideTimeout = null;
                                    }
                                    // Clear any existing timeout
                                    if (authorTooltipTimeoutRef.current) {
                                        clearTimeout(authorTooltipTimeoutRef.current);
                                    }
                                    // Set timeout to show tooltip after 1 second
                                    authorTooltipTimeoutRef.current = setTimeout(async () => {
                                        setShowAuthorTooltip(true);
                                        // Fetch author's images when tooltip shows
                                        const userId = (img as any)?.uploadedBy?._id || (img as any)?.uploadedBy;
                                        if (userId && !loadingAuthorImages) {
                                            setLoadingAuthorImages(true);
                                            try {
                                                const response = await imageFetchService.fetchUserImages(userId, { page: 1, limit: 3 });
                                                setAuthorImages(response.images || []);
                                            } catch (error) {
                                                console.error('Failed to fetch author images:', error);
                                                setAuthorImages([]);
                                            } finally {
                                                setLoadingAuthorImages(false);
                                            }
                                        }
                                    }, 1000);
                                }}
                                onMouseLeave={(e) => {
                                    // Use a delay to allow mouse to move to tooltip
                                    const hideTimeout = setTimeout(() => {
                                        const tooltipElement = document.querySelector('[data-author-tooltip]') as HTMLElement;
                                        if (!tooltipElement) {
                                            setShowAuthorTooltip(false);
                                            return;
                                        }
                                        // Check if mouse is actually over tooltip using getBoundingClientRect
                                        const tooltipRect = tooltipElement.getBoundingClientRect();
                                        const mouseX = (e as any).clientX || 0;
                                        const mouseY = (e as any).clientY || 0;

                                        // Check if mouse is within tooltip bounds (with some padding for the gap)
                                        const isOverTooltip = (
                                            mouseX >= tooltipRect.left - 10 &&
                                            mouseX <= tooltipRect.right + 10 &&
                                            mouseY >= tooltipRect.top - 10 &&
                                            mouseY <= tooltipRect.bottom + 10
                                        );

                                        if (!isOverTooltip) {
                                            // Start hide animation
                                            setTooltipAnimating(false);
                                            // Remove from DOM after animation
                                            setTimeout(() => {
                                                setShowAuthorTooltip(false);
                                            }, 200);
                                        }
                                        // Clear timeout if mouse leaves before delay
                                        if (authorTooltipTimeoutRef.current) {
                                            clearTimeout(authorTooltipTimeoutRef.current);
                                            authorTooltipTimeoutRef.current = null;
                                        }
                                    }, 150);

                                    // Store timeout to clear if mouse enters tooltip
                                    (authorAreaRef.current as any).hideTimeout = hideTimeout;
                                }}
                            >
                                <div
                                    style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: '50%',
                                        background: 'rgba(0, 0, 0, 0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 12,
                                        fontWeight: 600,
                                        color: '#333',
                                    }}
                                >
                                    {authorName ? authorName[0]?.toUpperCase() : 'A'}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700 }}>{authorName}</div>
                                    <div style={{ fontSize: 12, opacity: 0.8 }}>{img.imageTitle || t('image.topInfo')}</div>
                                </div>

                                {/* Author tooltip/popup */}
                                {showAuthorTooltip && authorAreaRef.current && (() => {
                                    const rect = authorAreaRef.current!.getBoundingClientRect();
                                    return (
                                        <div
                                            data-author-tooltip
                                            style={{
                                                position: 'fixed',
                                                top: `${rect.bottom + 4}px`,
                                                left: `${rect.left}px`,
                                                background: '#fff',
                                                borderRadius: '8px',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                                padding: '12px',
                                                minWidth: 360,
                                                width: 360,
                                                zIndex: 10000,
                                                pointerEvents: 'auto',
                                                opacity: tooltipAnimating ? 1 : 0,
                                                transform: tooltipAnimating ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(-4px)',
                                                transition: 'opacity 0.2s ease-out, transform 0.2s ease-out',
                                            }}
                                            onMouseEnter={() => {
                                                // Clear any hide timeout from author area
                                                if (authorAreaRef.current && (authorAreaRef.current as any).hideTimeout) {
                                                    clearTimeout((authorAreaRef.current as any).hideTimeout);
                                                    (authorAreaRef.current as any).hideTimeout = null;
                                                }
                                                // Keep tooltip visible when hovering over it
                                            }}
                                            onMouseLeave={(e) => {
                                                // Use a delay to allow mouse to move back to author area
                                                const hideTimeout = setTimeout(() => {
                                                    if (!authorAreaRef.current?.matches(':hover')) {
                                                        // Start hide animation
                                                        setTooltipAnimating(false);
                                                        // Remove from DOM after animation
                                                        setTimeout(() => {
                                                            setShowAuthorTooltip(false);
                                                        }, 200);
                                                    }
                                                }, 150);

                                                // Store timeout to clear if mouse enters author area
                                                (e.currentTarget as any).hideTimeout = hideTimeout;
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                                                <div
                                                    style={{
                                                        width: 48,
                                                        height: 48,
                                                        borderRadius: '50%',
                                                        background: 'rgba(0, 0, 0, 0.1)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: 18,
                                                        fontWeight: 600,
                                                        color: '#333',
                                                    }}
                                                >
                                                    {authorName ? authorName[0]?.toUpperCase() : 'A'}
                                                </div>
                                                <div>
                                                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>
                                                        {authorName}
                                                    </div>
                                                    <div style={{ fontSize: 13, color: '#666' }}>
                                                        {(img as any)?.uploadedBy?.bio || t('image.photographer')}
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ fontSize: 13, color: '#333', lineHeight: 1.4, marginBottom: 10 }}>
                                                {(img as any)?.uploadedBy?.location || t('image.noLocation')}
                                            </div>

                                            {/* Uploaded images section */}
                                            {authorImages.length > 0 && (
                                                <div style={{ marginBottom: 10 }}>
                                                    <div style={{
                                                        display: 'grid',
                                                        gridTemplateColumns: 'repeat(3, 1fr)',
                                                        gap: 6,
                                                        marginBottom: 0
                                                    }}>
                                                        {authorImages.slice(0, 3).map((authorImg, idx) => (
                                                            <div
                                                                key={authorImg._id || idx}
                                                                style={{
                                                                    width: '100%',
                                                                    paddingBottom: '70%',
                                                                    position: 'relative',
                                                                    borderRadius: '4px',
                                                                    overflow: 'hidden',
                                                                    background: '#f0f0f0',
                                                                    cursor: 'pointer',
                                                                }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const imageIndex = images.findIndex(i => i._id === authorImg._id);
                                                                    if (imageIndex >= 0 && onSelectIndex) {
                                                                        onSelectIndex(imageIndex);
                                                                    }
                                                                }}
                                                            >
                                                                {authorImg.thumbnailUrl || authorImg.smallUrl || authorImg.imageUrl ? (
                                                                    <img
                                                                        src={authorImg.thumbnailUrl || authorImg.smallUrl || authorImg.imageUrl}
                                                                        alt={authorImg.imageTitle || 'Photo'}
                                                                        style={{
                                                                            position: 'absolute',
                                                                            inset: 0,
                                                                            width: '100%',
                                                                            height: '100%',
                                                                            objectFit: 'cover',
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <div style={{
                                                                        position: 'absolute',
                                                                        inset: 0,
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        color: '#999',
                                                                        fontSize: 12,
                                                                    }}>
                                                                        {t('image.noImage')}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* View profile button */}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const userId = (img as any)?.uploadedBy?._id || (img as any)?.uploadedBy;
                                                    const username = (img as any)?.uploadedBy?.username;
                                                    if (username) {
                                                        navigate(`/profile/${username}`);
                                                        onClose();
                                                    } else if (userId) {
                                                        navigate(`/profile/user/${userId}`);
                                                        onClose();
                                                    }
                                                    setShowAuthorTooltip(false);
                                                }}
                                                style={{
                                                    width: '100%',
                                                    padding: '8px 16px',
                                                    background: '#f5f5f5',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    color: '#333',
                                                    fontSize: 14,
                                                    fontWeight: 500,
                                                    cursor: 'pointer',
                                                    transition: 'background 0.2s',
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = '#e8e8e8';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = '#f5f5f5';
                                                }}
                                            >
                                                {t('image.viewProfile')}
                                            </button>
                                        </div>
                                    );
                                })()}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                {/* Download button with dropdown */}
                                <div style={{ position: 'relative' }} data-download-menu>
                                    <button
                                        onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            padding: '8px 16px',
                                            background: 'rgba(0, 0, 0, 0.05)',
                                            border: 'none',
                                            borderRadius: '8px',
                                            color: '#333',
                                            cursor: 'pointer',
                                            fontSize: 14,
                                            fontWeight: 500,
                                            transition: 'background 0.2s',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.1)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)';
                                        }}
                                    >
                                        <span>{t('image.download')}</span>
                                        <ChevronDown size={16} />
                                    </button>
                                    {showDownloadMenu && (
                                        <div
                                            style={{
                                                position: 'absolute',
                                                top: '100%',
                                                right: 0,
                                                marginTop: 8,
                                                background: '#fff',
                                                borderRadius: '8px',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                                padding: '8px 0',
                                                minWidth: 200,
                                                zIndex: 1000,
                                            }}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {[
                                                { value: 'small' as DownloadSize, label: t('image.small'), dimension: '640px' },
                                                { value: 'medium' as DownloadSize, label: t('image.medium'), dimension: '1920px' },
                                                { value: 'large' as DownloadSize, label: t('image.large'), dimension: '2400px' },
                                                { value: 'original' as DownloadSize, label: t('image.original'), dimension: t('image.fullSize') },
                                            ].map((option) => (
                                                <button
                                                    key={option.value}
                                                    onClick={() => {
                                                        handleDownload(option.value);
                                                        setShowDownloadMenu(false);
                                                    }}
                                                    style={{
                                                        width: '100%',
                                                        padding: '12px 16px',
                                                        border: 'none',
                                                        background: 'transparent',
                                                        textAlign: 'left',
                                                        cursor: 'pointer',
                                                        fontSize: 14,
                                                        color: '#333',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        transition: 'background 0.2s',
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.background = 'rgba(0,0,0,0.05)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.background = 'transparent';
                                                    }}
                                                >
                                                    <div>
                                                        <div style={{ fontWeight: 500 }}>{option.label}</div>
                                                        <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{option.dimension}</div>
                                                    </div>
                                                    {option.value === 'medium' && (
                                                        <span style={{ fontSize: 11, color: '#999' }}>{t('image.default')}</span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Save/Favorite button */}
                                {user && (
                                    <button
                                        onClick={handleToggleFavorite}
                                        disabled={isTogglingFavorite}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 6,
                                            padding: '8px 16px',
                                            background: 'rgba(0, 0, 0, 0.05)',
                                            border: 'none',
                                            borderRadius: '8px',
                                            color: '#333',
                                            cursor: isTogglingFavorite ? 'not-allowed' : 'pointer',
                                            fontSize: 14,
                                            fontWeight: 500,
                                            transition: 'background 0.2s',
                                            opacity: isTogglingFavorite ? 0.6 : 1,
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isTogglingFavorite) {
                                                e.currentTarget.style.background = 'rgba(0, 0, 0, 0.1)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)';
                                        }}
                                    >
                                        <Heart size={16} fill={isFavorited ? 'currentColor' : 'none'} />
                                        <span>{t('image.save')}</span>
                                        <kbd style={{
                                            padding: '2px 6px',
                                            background: 'rgba(0,0,0,0.1)',
                                            borderRadius: '4px',
                                            fontSize: 11,
                                            fontWeight: 500,
                                        }}>F</kbd>
                                    </button>
                                )}

                                {/* Share button */}
                                <button
                                    onClick={handleShare}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 6,
                                        padding: '8px 16px',
                                        background: 'rgba(0, 0, 0, 0.05)',
                                        border: 'none',
                                        borderRadius: '8px',
                                        color: '#333',
                                        cursor: 'pointer',
                                        fontSize: 14,
                                        fontWeight: 500,
                                        transition: 'background 0.2s',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = 'rgba(0, 0, 0, 0.1)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = 'rgba(0, 0, 0, 0.05)';
                                    }}
                                >
                                    <Share2 size={16} />
                                    <span>{t('share.share')}</span>
                                    <kbd style={{
                                        padding: '2px 6px',
                                        background: 'rgba(0,0,0,0.1)',
                                        borderRadius: '4px',
                                        fontSize: 11,
                                        fontWeight: 500,
                                    }}>⌘S</kbd>
                                </button>
                            </div>
                        </div>

                        {/* Middle image with gutters */}
                        <div
                            style={{
                                background: '#ffffff',
                                padding: '0px 0',
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                minHeight: '75vh', // Increase min height so image has more room
                                // No transition to prevent flash
                                transition: 'none',
                            }}
                        >
                            {/* Unsplash-style simple container - no complex calculations */}
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '100%',
                                    flex: 1,
                                    minHeight: '75vh', // Match increased min height
                                    padding: '0px 16px', // Match horizontal padding with top section (16px) so image aligns with author section
                                    background: '#ffffff',
                                    overflow: 'hidden',
                                }}
                            >
                                <div
                                    style={{
                                        position: 'relative',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '100%',
                                        height: '100%',
                                        maxHeight: '100%', // Ensure it doesn't exceed container height
                                        overflow: 'hidden', // Clip any content that extends beyond
                                        background: '#ffffff',
                                    }}
                                >
                                    {/* Unsplash double-buffer technique: Back layer (blurred) + Front layer (sharp) */}
                                    {/* Back layer: Always shows blurred low-quality placeholder */}
                                    {backSrc ? (
                                        <img
                                            key={`back-${img._id}`}
                                            src={backSrc}
                                            alt={img.imageTitle || 'photo'}
                                            style={{
                                                position: 'relative',
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'contain',
                                                // Apply blur filter to base64 thumbnails (like Unsplash's BlurHash)
                                                // This makes the tiny 20x20px image look better when stretched
                                                filter: backSrc.startsWith('data:') ? 'blur(20px)' : 'none',
                                                opacity: 1,
                                                transition: 'none',
                                                background: '#ffffff',
                                                display: 'block',
                                                userSelect: 'none',
                                                pointerEvents: 'none',
                                                zIndex: 1,
                                            }}
                                            draggable={false}
                                            onLoad={(e) => {
                                                // Ensure image is decoded before display
                                                const imgEl = e.currentTarget;
                                                if (imgEl.decode) {
                                                    imgEl.decode().catch(() => { });
                                                }
                                            }}
                                        />
                                    ) : null}
                                    {/* Front layer: Full-quality image (shown when ready, no blur) */}
                                    {frontSrc ? (
                                        <img
                                            key={`front-${img._id}-${frontSrc}`}
                                            ref={imgElementRef}
                                            src={frontSrc}
                                            alt={img.imageTitle || 'photo'}
                                            style={{
                                                position: 'absolute',
                                                inset: 0,
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'contain',
                                                // No blur (front layer is sharp)
                                                filter: 'none',
                                                opacity: 1,
                                                // No transitions - instant display to prevent flash
                                                transition: 'none',
                                                background: '#ffffff',
                                                display: 'block',
                                                userSelect: 'none',
                                                pointerEvents: 'none',
                                                zIndex: 2,
                                            }}
                                            draggable={false}
                                            onLoad={(e) => {
                                                // Ensure image is decoded before display
                                                const imgEl = e.currentTarget;
                                                if (imgEl.decode) {
                                                    imgEl.decode().catch(() => { });
                                                }
                                            }}
                                        />
                                    ) : null}
                                </div>
                            </div>
                        </div>

                        {/* Bottom info (scrolls with content) */}
                        <div
                            style={{
                                background: '#ffffff',
                                color: '#333',
                                padding: '24px 16px',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    gap: 24,
                                    flexWrap: 'wrap',
                                    marginBottom: 24,
                                }}
                            >
                                {/* Left: image info */}
                                <div style={{ flex: '1 1 480px', minWidth: 320 }}>
                                    <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
                                        {img.imageTitle || 'Untitled image'}
                                    </div>
                                    <div style={{ display: 'flex', gap: 12, marginBottom: 12, fontSize: 14 }}>
                                        <span>Views: {(img as any)?.views ?? '—'}</span>
                                        <span>Downloads: {(img as any)?.downloads ?? '—'}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                                        <span style={{ padding: '6px 10px', borderRadius: 16, background: '#fff2', fontSize: 13 }}>
                                            Tag 1
                                        </span>
                                        <span style={{ padding: '6px 10px', borderRadius: 16, background: '#fff2', fontSize: 13 }}>
                                            Tag 2
                                        </span>
                                        <span style={{ padding: '6px 10px', borderRadius: 16, background: '#fff2', fontSize: 13 }}>
                                            Tag 3
                                        </span>
                                    </div>
                                    <div style={{ fontSize: 14, lineHeight: 1.5 }}>
                                        {(img as any)?.description || 'No description provided.'}
                                    </div>
                                </div>

                                {/* Right: actions */}
                                <div
                                    style={{
                                        flex: '1 1 240px',
                                        minWidth: 200,
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: 8,
                                        alignItems: 'center',
                                        justifyContent: 'flex-start',
                                    }}
                                >
                                    {['Save', 'Share', 'Report', 'Edit', 'Download'].map((label) => (
                                        <button
                                            key={label}
                                            style={{
                                                padding: '10px 12px',
                                                borderRadius: 6,
                                                border: 'none',
                                                cursor: 'pointer',
                                                minWidth: 100,
                                            }}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Related images */}
                            <div>
                                <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Related images</div>
                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                                        gap: 12,
                                    }}
                                >
                                    {images
                                        .filter((_, i) => i !== index)
                                        .slice(0, 8)
                                        .map((related, i) => {
                                            const originalIdx = images.findIndex((imgItem) => imgItem === related);
                                            return (
                                                <div
                                                    key={related._id || i}
                                                    style={{
                                                        width: '100%',
                                                        paddingBottom: '70%',
                                                        position: 'relative',
                                                        borderRadius: 8,
                                                        overflow: 'hidden',
                                                        background: '#fff2',
                                                        cursor: 'pointer',
                                                    }}
                                                    onClick={() => {
                                                        if (onSelectIndex && originalIdx >= 0) {
                                                            onSelectIndex(originalIdx);
                                                        }
                                                    }}
                                                >
                                                    {related.thumbnailUrl || related.smallUrl || related.imageUrl ? (
                                                        <img
                                                            src={related.thumbnailUrl || related.smallUrl || related.imageUrl}
                                                            alt={related.imageTitle || 'related'}
                                                            style={{
                                                                position: 'absolute',
                                                                inset: 0,
                                                                width: '100%',
                                                                height: '100%',
                                                                objectFit: 'cover',
                                                            }}
                                                        />
                                                    ) : (
                                                        <div
                                                            style={{
                                                                position: 'absolute',
                                                                inset: 0,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                color: '#333',
                                                                opacity: 0.8,
                                                            }}
                                                        >
                                                            No preview
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Close button - top left of overlay */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }}
                    style={{
                        position: 'fixed',
                        left: 24,
                        top: 24,
                        width: 32,
                        height: 32,
                        background: 'transparent',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'opacity 0.2s',
                        zIndex: 10001,
                        padding: 0,
                    }}
                    onMouseEnter={(e) => {
                        const img = e.currentTarget.querySelector('img');
                        if (img) img.style.opacity = '1';
                    }}
                    onMouseLeave={(e) => {
                        const img = e.currentTarget.querySelector('img');
                        if (img) img.style.opacity = '0.7';
                    }}
                >
                    <img
                        src={closeIcon}
                        alt="Close"
                        style={{
                            width: 32,
                            height: 32,
                            opacity: 0.7,
                            transition: 'opacity 0.2s',
                        }}
                    />
                </button>

                {/* Left navigation button - outside modal */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (index > 0) {
                            onNavigate(index - 1);
                        }
                    }}
                    disabled={index === 0}
                    style={{
                        position: 'fixed',
                        left: 24,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 'auto',
                        height: 'auto',
                        background: 'transparent',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: index === 0 ? 'not-allowed' : 'pointer',
                        transition: 'opacity 0.2s',
                        zIndex: 10000,
                        padding: 0,
                    }}
                    onMouseEnter={(e) => {
                        if (index > 0) {
                            const img = e.currentTarget.querySelector('img');
                            if (img) img.style.opacity = '1';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (index > 0) {
                            const img = e.currentTarget.querySelector('img');
                            if (img) img.style.opacity = '0.7';
                        }
                    }}
                >
                    <img
                        src={leftArrowIcon}
                        alt={t('common.previous')}
                        style={{
                            width: 48,
                            height: 48,
                            opacity: index === 0 ? 0.3 : 0.7,
                            transition: 'opacity 0.2s',
                        }}
                    />
                </button>

                {/* Right navigation button - outside modal */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (index < images.length - 1) {
                            onNavigate(index + 1);
                        }
                    }}
                    disabled={index === images.length - 1}
                    style={{
                        position: 'fixed',
                        right: 24,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: 'auto',
                        height: 'auto',
                        background: 'transparent',
                        border: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: index === images.length - 1 ? 'not-allowed' : 'pointer',
                        transition: 'opacity 0.2s',
                        zIndex: 10000,
                        padding: 0,
                    }}
                    onMouseEnter={(e) => {
                        if (index < images.length - 1) {
                            const img = e.currentTarget.querySelector('img');
                            if (img) img.style.opacity = '1';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (index < images.length - 1) {
                            const img = e.currentTarget.querySelector('img');
                            if (img) img.style.opacity = '0.7';
                        }
                    }}
                >
                    <img
                        src={rightArrowIcon}
                        alt={t('common.next')}
                        style={{
                            width: 48,
                            height: 48,
                            opacity: index === images.length - 1 ? 0.3 : 0.7,
                            transition: 'opacity 0.2s',
                        }}
                    />
                </button>
            </div>
    );
}

// Unsplash-style grid configuration
const GRID_CONFIG = {
    baseRowHeight: 5, // Very fine-grained control for precise height ranges (5px = 1 row)
    gap: 24, // Gap between grid items
    columns: {
        desktop: 3,
        tablet: 2,
        mobile: 1,
    },
    breakpoints: {
        tablet: 768,
        desktop: 1280,
    },
    minRowSpan: 1,
    maxRowSpan: 160, // Maximum rows (5px * 160 = 800px max for very tall portraits, plus gaps)
} as const;

// Load image dimensions if not available
async function loadImageDimensions(src: string): Promise<{ width: number; height: number } | null> {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            resolve({ width: img.naturalWidth, height: img.naturalHeight });
        };
        img.onerror = () => {
            resolve(null);
        };
        img.src = src;
    });
}

// Calculate row span based on image aspect ratio
// Uses consistent row spanning for all images to prevent gaps
function calculateImageLayout(
    image: ExtendedImage,
    columnWidth: number,
    baseRowHeight: number,
    dimensions?: { width: number; height: number } | null
): { rowSpan: number } {
    // Use provided dimensions, or image properties, or fallback
    let width: number;
    let height: number;

    if (dimensions) {
        width = dimensions.width;
        height = dimensions.height;
    } else if (image.width && image.height) {
        width = image.width;
        height = image.height;
    } else {
        // Fallback: assume 4:3 aspect ratio (common for photos)
        width = 1920;
        height = 1440;
    }

    // Calculate aspect ratio (width / height)
    const aspectRatio = width / height;

    // Calculate display height when image is displayed at column width
    // This is the natural height the image would have at this column width
    const displayHeight = columnWidth / aspectRatio;

    // Apply aspect ratio-based height ranges
    // Allow natural variation within ranges, only clamp if outside bounds
    // YES, this is AUTO-CALCULATING: if displayHeight is within range, it uses that exact height
    let targetHeight: number;
    let categoryMin: number;
    let categoryMax: number;

    // Safety check: ensure we have valid values
    if (!isFinite(displayHeight) || displayHeight <= 0) {
        // Fallback to a reasonable default
        targetHeight = 250;
        categoryMin = 240;
        categoryMax = 260;
    } else {

        if (aspectRatio > 2.0) {
            // Very wide landscape (aspectRatio > 2.0, e.g., 21:9)
            // Should be 200–230px tall - AUTO-CALCULATES within this range
            categoryMin = 200;
            categoryMax = 230;
            if (displayHeight < categoryMin) {
                targetHeight = categoryMin; // Too short, clamp to minimum
            } else if (displayHeight > categoryMax) {
                targetHeight = categoryMax; // Too tall, clamp to maximum
            } else {
                targetHeight = displayHeight; // Within range, use natural calculated height
            }
        } else if (aspectRatio >= 1.3 && aspectRatio <= 2.0) {
            // Standard landscape (1.3–2.0, e.g., 16:9, 4:3)
            // Should be 230–275px tall - AUTO-CALCULATES within this range
            categoryMin = 230;
            categoryMax = 275;
            if (displayHeight < categoryMin) {
                targetHeight = categoryMin; // Too short, clamp to minimum
            } else if (displayHeight > categoryMax) {
                targetHeight = categoryMax; // Too tall, clamp to maximum
            } else {
                targetHeight = displayHeight; // Within range, use natural calculated height
            }
        } else if (aspectRatio >= 0.9 && aspectRatio <= 1.1) {
            // Square (0.9–1.1, e.g., 1:1)
            // Should be 240–260px tall - AUTO-CALCULATES within this range
            categoryMin = 240;
            categoryMax = 260;
            if (displayHeight < categoryMin) {
                targetHeight = categoryMin; // Too short, clamp to minimum
            } else if (displayHeight > categoryMax) {
                targetHeight = categoryMax; // Too tall, clamp to maximum
            } else {
                targetHeight = displayHeight; // Within range, use natural calculated height
            }
        } else if (aspectRatio >= 0.6 && aspectRatio <= 0.75) {
            // Standard portrait (0.6–0.75, e.g., 3:4, 2:3)
            // Should be 400–600px tall - AUTO-CALCULATES within this range
            categoryMin = 400;
            categoryMax = 600;
            if (displayHeight < categoryMin) {
                targetHeight = categoryMin; // Too short, clamp to minimum
            } else if (displayHeight > categoryMax) {
                targetHeight = categoryMax; // Too tall, clamp to maximum
            } else {
                targetHeight = displayHeight; // Within range, use natural calculated height
            }
        } else if (aspectRatio < 0.6) {
            // Very tall portrait (< 0.6, e.g., 9:16, 1:2)
            // Should be 600–750px tall - AUTO-CALCULATES within this range
            categoryMin = 600;
            const absoluteMaxHeight = GRID_CONFIG.maxRowSpan * baseRowHeight;
            categoryMax = Math.min(750, absoluteMaxHeight); // Reduced from 800px to 750px
            if (displayHeight < categoryMin) {
                targetHeight = categoryMin; // Too short, clamp to minimum
            } else if (displayHeight > categoryMax) {
                targetHeight = categoryMax; // Too tall, clamp to maximum
            } else {
                targetHeight = displayHeight; // Within range, use natural calculated height
            }
        } else {
            // Fallback for edge cases (between 0.75-0.9 or 1.1-1.3, or 0.5-0.6)
            // Use standard portrait or landscape logic as fallback
            if (aspectRatio > 1) {
                // Closer to landscape
                categoryMin = 230;
                categoryMax = 275;
                targetHeight = Math.max(categoryMin, Math.min(categoryMax, displayHeight));
            } else if (aspectRatio >= 0.5 && aspectRatio < 0.6) {
                // Between 0.5-0.6: treat as Very Tall Portrait
                categoryMin = 600;
                const absoluteMaxHeight = GRID_CONFIG.maxRowSpan * baseRowHeight;
                categoryMax = Math.min(750, absoluteMaxHeight); // Reduced from 800px to 750px
                targetHeight = Math.max(categoryMin, Math.min(categoryMax, displayHeight));
            } else {
                // Closer to standard portrait (0.6-0.75)
                categoryMin = 400;
                categoryMax = 600;
                targetHeight = Math.max(categoryMin, Math.min(categoryMax, displayHeight));
            }
        }
    } // End of safety check

    // Final safety clamp: ensure targetHeight is never unreasonably large
    // This prevents any calculation errors from creating huge images
    const absoluteMax = GRID_CONFIG.maxRowSpan * baseRowHeight; // 160 * 5 = 800px (plus gaps)
    targetHeight = Math.min(targetHeight, absoluteMax);

    // Compute row span in full row units (row height + row gap) so the grid area
    // height (rows*baseRowHeight + (rows-1)*gap) matches the target height closely.
    // Formula: targetHeight = rowSpan * baseRowHeight + (rowSpan - 1) * gap
    // Solving: rowSpan = (targetHeight + gap) / (baseRowHeight + gap)
    const rowUnit = baseRowHeight + GRID_CONFIG.gap;
    const exactRowsByUnit = (targetHeight + GRID_CONFIG.gap) / rowUnit;

    // Calculate all three rounding options
    const roundedRowSpan = Math.max(1, Math.round(exactRowsByUnit));
    const roundedHeight = roundedRowSpan * baseRowHeight + (roundedRowSpan - 1) * GRID_CONFIG.gap;

    const roundedUpRowSpan = Math.ceil(exactRowsByUnit);
    const roundedUpHeight = roundedUpRowSpan * baseRowHeight + (roundedUpRowSpan - 1) * GRID_CONFIG.gap;
    const roundedDownRowSpan = Math.floor(exactRowsByUnit);
    const roundedDownHeight = roundedDownRowSpan * baseRowHeight + (roundedDownRowSpan - 1) * GRID_CONFIG.gap;

    // Choose the option that best fits within the category range
    // Priority: within range > closest to range > within min/max bounds
    let bestRowSpan = roundedRowSpan;
    let bestScore = Infinity; // Lower is better

    // Score function: distance from ideal range (0 = perfect, higher = worse)
    const score = (height: number): number => {
        if (height >= categoryMin && height <= categoryMax) {
            // Within range - prefer closer to targetHeight
            return Math.abs(height - targetHeight);
        } else if (height < categoryMin) {
            // Below range - penalize by distance below min
            return (categoryMin - height) * 2; // Penalize more for being below
        } else {
            // Above range - penalize by distance above max
            return (height - categoryMax) * 2; // Penalize more for being above
        }
    };

    // Evaluate all three options
    const options = [
        { rowSpan: roundedRowSpan, height: roundedHeight },
        { rowSpan: roundedUpRowSpan, height: roundedUpHeight },
        { rowSpan: roundedDownRowSpan, height: roundedDownHeight },
    ];

    for (const option of options) {
        if (option.rowSpan < 1) continue; // Skip invalid
        const optionScore = score(option.height);
        if (optionScore < bestScore) {
            bestScore = optionScore;
            bestRowSpan = option.rowSpan;
        }
    }

    const rowSpan = bestRowSpan;

    const finalRowSpan = Math.max(
        GRID_CONFIG.minRowSpan,
        Math.min(GRID_CONFIG.maxRowSpan, rowSpan)
    );
    // const actualRenderedHeight = finalRowSpan * baseRowHeight + (finalRowSpan - 1) * GRID_CONFIG.gap;

    return {
        rowSpan: finalRowSpan,
    };
}

// Get column count based on viewport width
function getColumnCount(width: number): number {
    if (width < GRID_CONFIG.breakpoints.tablet) {
        return GRID_CONFIG.columns.mobile;
    }
    if (width < GRID_CONFIG.breakpoints.desktop) {
        return GRID_CONFIG.columns.tablet;
    }
    return GRID_CONFIG.columns.desktop;
}

export default function NoFlashGridPage() {
    const [images, setImages] = useState<ExtendedImage[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [activeCategory, setActiveCategory] = useState<string>('');
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const gridRef = useRef<HTMLDivElement | null>(null);
    const [columnCount, setColumnCount] = useState(() => {
        if (typeof window === 'undefined') return GRID_CONFIG.columns.desktop;
        return getColumnCount(window.innerWidth);
    });
    const [containerWidth, setContainerWidth] = useState(1400); // Default, will be updated

    const toImageArray = (val: unknown): ExtendedImage[] => {
        const v = val as any;
        if (Array.isArray(v)) return v;
        if (Array.isArray(v?.data)) return v.data;
        if (Array.isArray(v?.items)) return v.items;
        if (Array.isArray(v?.categories)) return v.categories;
        if (Array.isArray(v?.images)) return v.images;
        return [];
    };

    const toCategoryArray = (val: unknown): Category[] => {
        const v = val as any;
        if (Array.isArray(v)) return v;
        if (Array.isArray(v?.data)) return v.data;
        if (Array.isArray(v?.items)) return v.items;
        if (Array.isArray(v?.categories)) return v.categories;
        return [];
    };

    // Store image dimensions as they load
    const [imageDimensions, setImageDimensions] = useState<Map<string, { width: number; height: number }>>(new Map());
    const loadingDimensionsRef = useRef<Set<string>>(new Set()); // Track which images we're currently loading

    // Load images and categories
    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [imgsRes, catsRes] = await Promise.all([
                api.get('/images'),
                api.get('/categories'),
            ]);
            const loadedImages = toImageArray(imgsRes.data);
            setImages(loadedImages);
            setCategories(toCategoryArray(catsRes.data));

            // Clear image dimensions cache when refreshing (in case images were updated)
            setImageDimensions(new Map());
            loadingDimensionsRef.current.clear();

            // Preload thumbnails for first batch of images
            const thumbnails = loadedImages.slice(0, 20)
                .map(img => img.thumbnailUrl || img.smallUrl)
                .filter((src): src is string => Boolean(src));
            preloadImages(thumbnails, true);
        } catch (e) {
            console.error('Failed to load data', e);
            setImages([]);
            setCategories([]);
        } finally {
            setLoading(false);
        }
    }, []);

    // Load data on mount
    useEffect(() => {
        loadData();
    }, [loadData]);

    // Refresh data when window gains focus (in case data was updated in another tab)
    useEffect(() => {
        const handleFocus = () => {
            loadData();
        };
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [loadData]);

    const filteredImages = useMemo<ExtendedImage[]>(() => {
        if (!activeCategory) return images;
        return images.filter((img) => {
            // Extract category name from imageCategory (can be string or Category object)
            const imgCategoryName =
                typeof img.imageCategory === 'string'
                    ? img.imageCategory
                    : img.imageCategory?.name;
            // Also check legacy categoryName/category properties for backward compatibility
            const catName = imgCategoryName || img.categoryName || img.category || '';
            return catName === activeCategory;
        });
    }, [images, activeCategory]);

    // Load dimensions for images that don't have them
    useEffect(() => {
        const loadDimensions = async () => {
            if (filteredImages.length === 0) return;

            const dimensionsMap = new Map<string, { width: number; height: number }>();
            const imagesToLoad: Array<{ image: ExtendedImage; url: string }> = [];

            // First pass: collect images that need dimensions loaded
            filteredImages.forEach((image) => {
                // Skip if already has dimensions in state
                if (imageDimensions.has(image._id)) {
                    dimensionsMap.set(image._id, imageDimensions.get(image._id)!);
                    return;
                }

                // Skip if already has dimensions in image object
                if (image.width && image.height) {
                    dimensionsMap.set(image._id, { width: image.width, height: image.height });
                    return;
                }

                // Skip if already loading
                if (loadingDimensionsRef.current.has(image._id)) {
                    return;
                }

                // Try to load dimensions from image URL
                // Use regularUrl or imageUrl for accurate dimensions (aspect ratio is what matters)
                const imageUrl = image.regularUrl || image.imageUrl || image.smallUrl || image.thumbnailUrl;
                if (imageUrl) {
                    imagesToLoad.push({ image, url: imageUrl });
                    loadingDimensionsRef.current.add(image._id);
                }
            });

            // If we have dimensions from state/image, update immediately
            if (dimensionsMap.size > 0) {
                setImageDimensions(prev => {
                    const merged = new Map(prev);
                    dimensionsMap.forEach((value, key) => {
                        merged.set(key, value);
                    });
                    return merged;
                });
            }

            // Load dimensions for images that need it (prioritize first 20 for faster initial render)
            if (imagesToLoad.length > 0) {
                // Split into priority (first 20) and non-priority
                const priority = imagesToLoad.slice(0, 20);
                const rest = imagesToLoad.slice(20);

                const loadBatch = async (batch: typeof imagesToLoad) => {
                    const promises = batch.map(async ({ image, url }) => {
                        try {
                            const dims = await loadImageDimensions(url);
                            if (dims) {
                                return { id: image._id, dims };
                            }
                        } catch (_error) {
                            // Silently fail - will use fallback
                        } finally {
                            loadingDimensionsRef.current.delete(image._id);
                        }
                        return null;
                    });

                    const results = await Promise.all(promises);
                    const validResults = results.filter((r): r is { id: string; dims: { width: number; height: number } } => r !== null);

                    if (validResults.length > 0) {
                        setImageDimensions(prev => {
                            const merged = new Map(prev);
                            validResults.forEach(result => {
                                merged.set(result.id, result.dims);
                            });
                            return merged;
                        });
                    }
                };

                // Load priority batch first
                await loadBatch(priority);

                // Load rest with slight delay to not block
                if (rest.length > 0) {
                    setTimeout(() => {
                        loadBatch(rest);
                    }, 100);
                }
            }
        };

        loadDimensions();
    }, [filteredImages]); // Only depend on filteredImages, not imageDimensions

    // Calculate grid layout for each image (row spans and columns)
    const gridLayout = useMemo(() => {
        if (filteredImages.length === 0 || containerWidth === 0) return [];


        // Calculate column width
        const gapTotal = GRID_CONFIG.gap * (columnCount - 1);
        const columnWidth = (containerWidth - gapTotal) / columnCount;

        // Track pixel heights in each column for shortest-column algorithm
        // This is more accurate than row-based tracking
        const columnHeights = new Array(columnCount).fill(0); // Start at 0px for each column

        return filteredImages.map((image) => {
            // Get dimensions (from state or image properties)
            const dimensions = imageDimensions.get(image._id) || null;

            // Calculate row span based on aspect ratio
            const layout = calculateImageLayout(
                image,
                columnWidth,
                GRID_CONFIG.baseRowHeight,
                dimensions
            );

            // Calculate actual image height
            // const imageHeight = layout.rowSpan * GRID_CONFIG.baseRowHeight;

            // Find the shortest column (by pixel height)
            let shortestColumnIndex = 0;
            let shortestHeight = columnHeights[0];
            for (let i = 1; i < columnCount; i++) {
                if (columnHeights[i] < shortestHeight) {
                    shortestHeight = columnHeights[i];
                    shortestColumnIndex = i;
                }
            }

            // Place image in the shortest column
            const column = shortestColumnIndex + 1; // CSS Grid columns are 1-indexed

            // Convert pixel position to grid row using full row unit (height + gap)
            const rowUnit = GRID_CONFIG.baseRowHeight + GRID_CONFIG.gap;
            const rowStart = Math.max(1, Math.floor(shortestHeight / rowUnit) + 1);
            // Use rowStart only, let grid-row-end: span X handle the rest
            // This ensures CSS Grid handles gaps correctly

            // Update the column's height for the next item
            // Move by an exact number of full row units to the next top line
            columnHeights[shortestColumnIndex] =
                shortestHeight + layout.rowSpan * rowUnit;

            return {
                image,
                column,
                rowSpan: layout.rowSpan,
                rowStart,
                columnWidth,
            };
        });
    }, [filteredImages, columnCount, containerWidth, imageDimensions]);

    // Update column count and container width on resize
    useEffect(() => {
        const updateLayout = () => {
            if (!gridRef.current) return;
            // Get actual container width (accounting for padding)
            const container = gridRef.current.parentElement;
            if (container) {
                const width = container.offsetWidth - 32; // Subtract padding (16px * 2)
                setContainerWidth(Math.max(300, width)); // Minimum 300px
            }
            const viewportWidth = window.innerWidth;
            setColumnCount(getColumnCount(viewportWidth));
        };

        // Initial calculation
        updateLayout();

        // Update on resize with debounce
        let timeoutId: NodeJS.Timeout;
        const handleResize = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(updateLayout, 150);
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(timeoutId);
        };
    }, []);

    // Preload images near the selected index when modal opens
    useEffect(() => {
        if (selectedIndex === null) return;

        const nearbyIndices = [
            (selectedIndex + 1) % filteredImages.length,
            (selectedIndex - 1 + filteredImages.length) % filteredImages.length,
            (selectedIndex + 2) % filteredImages.length,
            (selectedIndex - 2 + filteredImages.length) % filteredImages.length,
        ];

        const sources: string[] = [];
        nearbyIndices.forEach((i) => {
            const img = filteredImages[i];
            if (!img) return;
            const src = img.regularUrl || img.imageUrl || img.smallUrl || img.thumbnailUrl;
            if (src && !loadedImages.has(src)) {
                sources.push(src);
            }
        });

        if (sources.length > 0) {
            preloadImages(sources, true);
        }
    }, [selectedIndex, filteredImages]);

    return (
        <div className="no-flash-grid-page">
            <h1 className="no-flash-grid-title">No-Flash Grid Test</h1>
            <p className="no-flash-grid-description">Custom grid + modal (no shared components). Blur-up, double buffer, preload. Unsplash-style grid layout.</p>

            <div className="category-filter-container">
                <button
                    onClick={() => setActiveCategory('')}
                    className={`category-filter-button ${activeCategory === '' ? 'active' : ''}`}
                >
                    All
                </button>
                {categories.map((cat) => (
                    <button
                        key={cat._id || cat.name}
                        onClick={() => setActiveCategory(cat.name)}
                        className={`category-filter-button ${activeCategory === cat.name ? 'active' : ''}`}
                    >
                        {cat.name}
                    </button>
                ))}
                <button
                    onClick={loadData}
                    className="category-filter-button"
                    title="Refresh images and categories"
                    style={{ marginLeft: 'auto' }}
                >
                    🔄 Refresh
                </button>
            </div>

            {loading ? (
                <div className="loading-state">Loading...</div>
            ) : (
                <div
                    ref={gridRef}
                    className="no-flash-grid"
                    style={{
                        // Unsplash-style: Fixed columns with dynamic row spans
                        gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
                        gap: `${GRID_CONFIG.gap}px`,
                        // Base row height for row span calculations - MUST be a string with units
                        gridAutoRows: `${GRID_CONFIG.baseRowHeight}px`,
                        // Don't use grid-auto-flow: dense - we use explicit row positioning
                    }}
                >
                    {gridLayout.map((layout, idx) => {
                        const { image, column, rowSpan, rowStart } = layout;
                        // Priority loading for first 12 images (above the fold)
                        const isPriority = idx < 12;

                        // Calculate aspect ratio for debug display
                        const dimensions = imageDimensions.get(image._id) || null;
                        const finalWidth = dimensions?.width || image.width || 0;
                        const finalHeight = dimensions?.height || image.height || 0;
                        const aspectRatio = finalWidth && finalHeight ? (finalWidth / finalHeight).toFixed(2) : 'N/A';
                        // Actual height includes gaps: rowSpan rows + (rowSpan - 1) gaps
                        const actualHeight = rowSpan * GRID_CONFIG.baseRowHeight + (rowSpan - 1) * GRID_CONFIG.gap;

                        return (
                            <div
                                key={`${image._id || idx}-${column}-${rowStart}`}
                                className="grid-item-wrapper"
                                style={{
                                    // Explicit column and row start, use span for row end
                                    // This lets CSS Grid handle gaps automatically
                                    gridColumn: column,
                                    gridRowStart: rowStart,
                                    gridRowEnd: `span ${rowSpan}`,
                                    // Let the grid area determine height (includes internal row gaps)
                                    // to avoid mismatch and sticking
                                    height: 'auto',
                                }}
                            >
                                <BlurUpImage
                                    image={image}
                                    onClick={async () => {
                                        // Unsplash technique: Preload image COMPLETELY before opening modal
                                        const full = image.regularUrl || image.imageUrl || image.smallUrl || image.thumbnailUrl;
                                        if (full) {
                                            try {
                                                // Wait for image to be fully loaded and decoded before opening modal
                                                // Keep decode to ensure smooth modal opening
                                                await preloadImage(full, false);
                                                // Image is ready - open modal smoothly
                                                setSelectedIndex(idx);
                                            } catch {
                                                // On error, still open modal (will show placeholder)
                                                setSelectedIndex(idx);
                                            }
                                        } else {
                                            setSelectedIndex(idx);
                                        }
                                    }}
                                    priority={isPriority}
                                />
                                {/* Debug overlay - shows column, aspect ratio and height */}
                                <div style={{
                                    position: 'absolute',
                                    top: 4,
                                    left: 4,
                                    background: 'rgba(0, 0, 0, 0.7)',
                                    color: '#fff',
                                    padding: '4px 8px',
                                    borderRadius: 4,
                                    fontSize: '11px',
                                    fontFamily: 'monospace',
                                    zIndex: 10,
                                    pointerEvents: 'none',
                                }}>
                                    C: {column} | AR: {aspectRatio} | H: {actualHeight}px | R: {rowSpan} | RS: {rowStart}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {selectedIndex !== null && filteredImages[selectedIndex] && (
                <ImageModal
                    key={filteredImages[selectedIndex]._id || selectedIndex}
                    images={filteredImages}
                    index={selectedIndex}
                    onClose={() => setSelectedIndex(null)}
                    onNavigate={(next) => setSelectedIndex(next)}
                    onSelectIndex={(idx) => setSelectedIndex(idx)}
                />
            )}
        </div>
    );
}


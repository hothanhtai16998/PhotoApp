import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
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
import { preloadImage, loadedImages } from '../utils/imagePreloader';

type ExtendedImage = Image & { categoryName?: string; category?: string };

interface ImageModalProps {
    images: ExtendedImage[];
    index: number;
    onClose: () => void;
    onNavigate: (next: number) => void;
    onSelectIndex?: (idx: number) => void;
}

// Modal with double-buffer, no opacity drops
export function ImageModal({
    images,
    index,
    onClose,
    onNavigate,
    onSelectIndex,
}: ImageModalProps) {
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
    const [frontLoaded, setFrontLoaded] = useState(false); // Track if front image is actually loaded and ready
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

    // Keyboard navigation: Arrow keys to navigate (stop at boundaries), Escape to close
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                if (index < images.length - 1) {
                    onNavigate(index + 1);
                }
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                if (index > 0) {
                    onNavigate(index - 1);
                }
            } else if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [index, images.length, onNavigate, onClose]);

    // Enhanced preloading: next/prev + nearby images
    useEffect(() => {
        const preloadIndices = [
            (index + 1) % images.length,
            (index - 1 + images.length) % images.length,
            (index + 2) % images.length,
            (index - 2 + images.length) % images.length,
        ];

        const fullSources: string[] = [];
        const thumbnailSources: string[] = [];

        preloadIndices.forEach((i) => {
            const target = images[i];
            if (!target) return;

            // Preload full quality image
            const fullSrc = target.regularUrl || target.imageUrl || target.smallUrl || target.thumbnailUrl;
            if (fullSrc && !loadedImages.has(fullSrc)) {
                fullSources.push(fullSrc);
            }

            // Also preload thumbnail for instant display on navigation
            const thumbSrc = target.thumbnailUrl || target.smallUrl;
            if (thumbSrc && thumbSrc !== fullSrc && !loadedImages.has(thumbSrc)) {
                thumbnailSources.push(thumbSrc);
            }
        });

        // Preload thumbnails first (small, fast) - these show immediately on navigation
        thumbnailSources.forEach(src => {
            if (src) preloadImage(src, true).catch(() => { }); // Skip decode for faster loading
        });

        // Preload full quality with priority for next/prev
        if (fullSources.length > 0 && fullSources[0]) {
            preloadImage(fullSources[0], false); // Next image - decode for smooth transition
            if (fullSources.length > 1 && fullSources[1]) {
                preloadImage(fullSources[1], false); // Prev image - decode for smooth transition
            }
            // Preload nearby images with delay
            if (fullSources.length > 2) {
                setTimeout(() => {
                    fullSources.slice(2).forEach(src => {
                        if (src) preloadImage(src, true).catch(() => { });
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
                // If already cached, mark as loaded immediately
                setFrontLoaded(true);
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
        } else if (full && full === thumbnail) {
            // If thumbnail is the same as full, use it as front image
            setFrontSrc(full);
            // Mark as loaded since it's the same as back image
            setFrontLoaded(true);
        } else {
            // If no full image to load, ensure front layer is cleared
            setFrontSrc(null);
            setFrontLoaded(false);
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
                                display: 'flex',
                                flexDirection: 'column',
                                // No transition to prevent flash
                                transition: 'none',
                            }}
                        >
                            {/* Unsplash-style simple container - no complex calculations */}
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'flex-start',
                                    justifyContent: 'center',
                                    width: '100%',
                                    padding: '0px 16px', // Match horizontal padding with top section (16px) so image aligns with author section
                                    background: '#ffffff',
                                    overflow: 'hidden',
                                }}
                            >
                                <div
                                    style={{
                                        position: 'relative',
                                        display: 'block',
                                        width: '100%',
                                        maxHeight: 'calc(100vh - 180px)',
                                        overflow: 'hidden',
                                        // Reserve space with aspectRatio to prevent layout collapse
                                        aspectRatio: img.width && img.height ? `${img.width} / ${img.height}` : 'auto',
                                        minHeight: img.width && img.height ? 'auto' : '300px',
                                    }}
                                >
                                    {/* Back layer: Always render, hide with opacity when front is ready */}
                                    {/* This prevents flash by keeping an image in DOM at all times */}
                                    {backSrc && !backSrc.startsWith('data:') && (
                                        <img
                                            key={`back-${img._id}`}
                                            src={backSrc}
                                            alt={img.imageTitle || 'photo'}
                                            style={{
                                                position: 'relative',
                                                width: '100%',
                                                height: 'auto',
                                                maxWidth: '100%',
                                                maxHeight: 'calc(100vh - 180px)',
                                                objectFit: 'contain',
                                                filter: 'none',
                                                // Fade out when front is loaded, but stay in DOM
                                                opacity: frontLoaded ? 0 : 1,
                                                transition: 'none',
                                                display: 'block',
                                                userSelect: 'none',
                                                pointerEvents: 'none',
                                                zIndex: 1,
                                            }}
                                            draggable={false}
                                            onLoad={(e) => {
                                                const imgEl = e.currentTarget;
                                                if (imgEl.decode) {
                                                    imgEl.decode().catch(() => { });
                                                }
                                            }}
                                        />
                                    )}
                                    {/* Front layer: Full-quality image (shown when ready, no blur) */}
                                    {frontSrc && (
                                        <img
                                            key={`front-${img._id}-${frontSrc}`}
                                            ref={imgElementRef}
                                            src={frontSrc}
                                            alt={img.imageTitle || 'photo'}
                                            style={{
                                                position: frontLoaded ? 'relative' : 'absolute',
                                                top: frontLoaded ? 'auto' : 0,
                                                left: frontLoaded ? 'auto' : 0,
                                                width: '100%',
                                                height: 'auto',
                                                maxWidth: '100%',
                                                maxHeight: 'calc(100vh - 180px)',
                                                objectFit: 'contain',
                                                filter: 'none', // No blur
                                                opacity: 1,
                                                transition: 'none',
                                                display: 'block',
                                                userSelect: 'none',
                                                pointerEvents: 'none',
                                                zIndex: 2,
                                            }}
                                            draggable={false}
                                            onLoad={(e) => {
                                                const imgEl = e.currentTarget;
                                                if (imgEl.decode) {
                                                    imgEl.decode().then(() => {
                                                        // Wait a frame to ensure image is rendered before marking as loaded
                                                        requestAnimationFrame(() => {
                                                            requestAnimationFrame(() => {
                                                                setFrontLoaded(true);
                                                            });
                                                        });
                                                    }).catch(() => {
                                                        requestAnimationFrame(() => {
                                                            setFrontLoaded(true);
                                                        });
                                                    });
                                                } else {
                                                    requestAnimationFrame(() => {
                                                        setFrontLoaded(true);
                                                    });
                                                }
                                            }}
                                            onError={() => {
                                                // If front image fails to load, keep back image visible
                                                setFrontLoaded(false);
                                            }}
                                        />
                                    )}
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

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from 'react';
import api from '@/lib/axios';
import type { Image } from '@/types/image';
import './NoFlashGrid.css';

type Category = { name: string; _id: string };

// Simple blur-up image with persistent back layer
type ExtendedImage = Image & { categoryName?: string; category?: string };

// Global image loading cache to prevent duplicate requests
const imageLoadCache = new Map<string, Promise<string>>();
const loadedImages = new Set<string>();

// Preload an image and cache the promise
const preloadImage = (src: string): Promise<string> => {
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
            loadedImages.add(src);
            imageLoadCache.delete(src);
            resolve(src);
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
const preloadImages = (sources: string[], priority = false) => {
    const validSources = sources.filter(Boolean);
    if (validSources.length === 0) return;

    if (priority) {
        // Load first image immediately, then queue others
        if (validSources[0]) {
            preloadImage(validSources[0]).catch(() => { });
        }
        // Queue rest with slight delay to not block
        if (validSources.length > 1) {
            setTimeout(() => {
                validSources.slice(1).forEach(src => {
                    if (src) preloadImage(src).catch(() => { });
                });
            }, 50);
        }
    } else {
        // Load all with slight stagger to avoid overwhelming
        validSources.forEach((src, i) => {
            setTimeout(() => {
                preloadImage(src).catch(() => { });
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
    const placeholderInitial = image.thumbnailUrl || image.smallUrl || image.imageUrl || null;
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
                rootMargin: '100px', // Start loading 100px before entering viewport
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

        const placeholder = image.thumbnailUrl || image.smallUrl || image.imageUrl || '';
        const full = image.regularUrl || image.imageUrl || placeholder;

        // If already using full image, no need to reload
        if (backSrc === full && loaded) return;

        loadingRef.current = true;
        preloadImage(full)
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
            const full = image.regularUrl || image.imageUrl || image.thumbnailUrl || image.smallUrl;
            if (full && full !== backSrc) {
                preloadImage(full).catch(() => { });
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
        const thumbnail = img.thumbnailUrl || img.smallUrl || img.imageUrl || '';
        const full = img.regularUrl || img.imageUrl || '';
        const displayThumbnail = thumbnail || full;

        // If full is already cached, use it immediately
        if (full && full !== thumbnail && loadedImages.has(full)) {
            return { src: full, isFullQuality: true };
        }
        // Otherwise use thumbnail
        return { src: displayThumbnail, isFullQuality: full === thumbnail || !full };
    };

    const [imageState, setImageState] = useState(calculateInitialState);
    const backSrc = imageState.src;
    const isFullQuality = imageState.isFullQuality;

    // Calculate image box helper function
    const calculateImageBoxValue = (modalWidth: number, modalHeight: number, targetAspect: number) => {
        const availableHeight = Math.max(200, modalHeight - 72 - 180);
        let widthPct = 0.92;
        let imgWidth = modalWidth * widthPct;
        let imgHeight = imgWidth * targetAspect;
        if (imgHeight > availableHeight) {
            imgHeight = availableHeight;
            imgWidth = imgHeight / targetAspect;
            widthPct = Math.min(0.97, Math.max(0.82, imgWidth / modalWidth));
        }
        const gutter = Math.min(48, Math.max(20, modalWidth * 0.03));
        const paddingBottom = `${Math.max(48, Math.min(88, (imgHeight / imgWidth) * 100))}%`;
        return { widthPct, paddingBottom, gutter };
    };

    // Initialize with reasonable defaults based on viewport to prevent layout shift
    const initialAspect = (img as any)?.width && (img as any)?.height ? (img as any).height / (img as any).width : 0.6;
    const initialModalWidth = typeof window !== 'undefined' ? Math.min(1600, window.innerWidth * 0.9) : 1400;
    const initialModalHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
    const initialImageBox = calculateImageBoxValue(initialModalWidth, initialModalHeight, initialAspect);

    // Use state - initialized with correct values to prevent layout shift
    const [imageBox, setImageBox] = useState<{ widthPct: number; paddingBottom: string; gutter: number }>(initialImageBox);
    const imageBoxRef = useRef(initialImageBox);
    const modalRef = useRef<HTMLDivElement | null>(null);
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const scrollPosRef = useRef(0);
    const previousImgRef = useRef<ExtendedImage | null>(img);
    const imgElementRef = useRef<HTMLImageElement | null>(null);
    const authorName =
        (img as any)?.uploadedBy?.username ||
        (img as any)?.author ||
        (img as any)?.user ||
        'Author';
    const aspect = (img as any)?.width && (img as any)?.height ? (img as any).height / (img as any).width : 0.6;

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

        // Preload with priority for next/prev
        if (sources.length > 0 && sources[0]) {
            preloadImage(sources[0]); // Next image
            if (sources.length > 1 && sources[1]) {
                preloadImage(sources[1]); // Prev image
            }
            // Preload nearby images with delay
            if (sources.length > 2) {
                setTimeout(() => {
                    sources.slice(2).forEach(src => {
                        if (src) preloadImage(src).catch(() => { });
                    });
                }, 200);
            }
        }
    }, [index, images]);

    useLayoutEffect(() => {
        if (!img) return;

        // Track current image to prevent race conditions
        previousImgRef.current = img;

        // reset scroll to top when image changes so top bar/author stay visible
        scrollPosRef.current = 0;
        if (scrollRef.current) {
            scrollRef.current.scrollTop = 0;
        }

        // Unsplash technique: Use different image sizes
        // Low-res thumbnail = thumbnailUrl or smallUrl (small file, pixelated when enlarged to full size)
        // High-res = regularUrl or imageUrl (full quality, sharp at full size)
        const thumbnail = img.thumbnailUrl || img.smallUrl || img.imageUrl || '';
        const full = img.regularUrl || img.imageUrl || '';

        // Calculate what the state should be
        const currentState = calculateInitialState();

        // Only update if state actually needs to change (prevents unnecessary renders)
        if (imageState.src !== currentState.src || imageState.isFullQuality !== currentState.isFullQuality) {
            // Update state once with both values - use requestAnimationFrame to batch with React
            requestAnimationFrame(() => {
                setImageState(currentState);
            });
        }

        // If full image needs to be loaded, preload it
        if (full && full !== thumbnail && !loadedImages.has(full)) {
            // Preload high-res image - Unsplash technique: wait for it to be ready
            preloadImage(full)
                .then((src) => {
                    // Only update if still showing this image (prevent race conditions)
                    if (previousImgRef.current?._id === img._id) {
                        // Swap to full quality (single state update)
                        setImageState({ src, isFullQuality: true });
                    }
                })
                .catch(() => {
                    // On error, keep low-res thumbnail visible (already blurred)
                });
        }
    }, [img]);

    // Responsive image box sizing - update ref only (no state updates to prevent flash)
    useLayoutEffect(() => {
        const recalc = () => {
            const modal = modalRef.current;
            if (!modal) return;
            const width = modal.clientWidth || window.innerWidth * 0.9;
            const height = modal.clientHeight || window.innerHeight;
            const newBox = calculateImageBoxValue(width, height, aspect || 0.6);
            // Update ref only - no state update to prevent re-render flash
            imageBoxRef.current = newBox;
            // Force update only if significantly different
            const current = imageBoxRef.current;
            if (Math.abs(current.widthPct - newBox.widthPct) > 0.01) {
                // Only update state if really needed (significant change)
                setImageBox(newBox);
            }
        };
        // Calculate immediately (synchronously before paint)
        recalc();
        // Also recalculate on resize
        window.addEventListener('resize', recalc);
        return () => window.removeEventListener('resize', recalc);
    }, [aspect]);

    const handleOverlayClick = useCallback(
        (e: React.MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
                onClose();
            }
        },
        [onClose]
    );

    return (
        !img ? null :
            <div
                onClick={handleOverlayClick}
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.95)',
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
                        background: '#0f0f0f',
                        borderRadius: 0,
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        marginTop: 16,
                        // No transition to prevent flash
                        transition: 'none',
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
                            scrollPosRef.current = top;
                        }}
                    >
                        {/* Top info */}
                        <div
                            style={{
                                height: 72,
                                minHeight: 72,
                                padding: '12px 16px',
                                background: '#5a16c5',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div
                                    style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: '50%',
                                        background: '#fff2',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        fontSize: 12,
                                        fontWeight: 600,
                                    }}
                                >
                                    {authorName ? authorName[0]?.toUpperCase() : 'A'}
                                </div>
                                <div>
                                    <div style={{ fontWeight: 700 }}>{authorName}</div>
                                    <div style={{ fontSize: 12, opacity: 0.8 }}>{img.imageTitle || 'Top info'}</div>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button>Download</button>
                                <button onClick={() => onNavigate((index - 1 + images.length) % images.length)}>Prev</button>
                                <button onClick={() => onNavigate((index + 1) % images.length)}>Next</button>
                                <button onClick={onClose}>Close</button>
                            </div>
                        </div>

                        {/* Middle image with gutters */}
                        <div
                            style={{
                                background: '#0f0f0f',
                                padding: '0px 0',
                                minHeight: '100%',
                                // No transition to prevent flash
                                transition: 'none',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    gap: 0,
                                    alignItems: 'center',
                                    maxWidth: `${imageBox.widthPct * 100}%`,
                                    margin: '0 auto',
                                }}
                            >
                                <div style={{ width: imageBox.gutter, flexShrink: 0, background: '#0f0f0f' }} />
                                <div style={{ flex: 1, position: 'relative', background: '#0f0f0f' }}>
                                    <div
                                        style={{
                                            position: 'relative',
                                            width: '100%',
                                            paddingBottom: imageBox.paddingBottom,
                                            background: '#0f0f0f',
                                        }}
                                    >
                                        {/* Unsplash technique: Blurred thumbnail → instant sharp swap (no fade-in) */}
                                        {backSrc ? (
                                            <img
                                                ref={imgElementRef}
                                                src={backSrc}
                                                alt={img.imageTitle || 'photo'}
                                                style={{
                                                    position: 'absolute',
                                                    inset: 0,
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'contain',
                                                    // Unsplash technique: Blur when showing low-res, sharp when full-res
                                                    // Blur masks pixelation and any visual artifacts during swap
                                                    filter: isFullQuality ? 'none' : 'blur(12px) saturate(1.05)',
                                                    // No opacity transition - instant display
                                                    opacity: 1,
                                                    // No transitions - instant blur removal for smooth swap
                                                    transition: 'none',
                                                    background: '#0f0f0f',
                                                    // Prevent image from causing layout shifts
                                                    display: 'block',
                                                    // Prevent image from being selectable (can cause visual glitches)
                                                    userSelect: 'none',
                                                    pointerEvents: 'none',
                                                }}
                                                draggable={false}
                                            />
                                        ) : (
                                            <div
                                                style={{
                                                    position: 'absolute',
                                                    inset: 0,
                                                    width: '100%',
                                                    height: '100%',
                                                    background: '#0f0f0f',
                                                }}
                                            />
                                        )}
                                    </div>
                                </div>
                                <div style={{ width: imageBox.gutter, flexShrink: 0, background: '#0f0f0f' }} />
                            </div>
                        </div>

                        {/* Bottom info */}
                        <div
                            style={{
                                background: '#0a54e6',
                                color: '#fff',
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
                                                                color: '#fff',
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
            </div>
    );
}

// Unsplash-style grid configuration
const GRID_CONFIG = {
    baseRowHeight: 115, // Base row height: 2 rows = 230px, 2.4 rows = 276px (perfect for 230-275px landscape range)
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
    maxRowSpan: 6, // Maximum rows (matches Unsplash)
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
    
    // Determine if image is landscape (aspectRatio > 1) or portrait (aspectRatio < 1)
    const isLandscape = aspectRatio > 1;

    // Calculate display height when image is displayed at column width
    let displayHeight = columnWidth / aspectRatio;

    // Apply maxHeight constraints based on orientation
    if (isLandscape) {
        // For landscape images: cap at 275px max
        const maxLandscapeHeight = 275;
        if (displayHeight > maxLandscapeHeight) {
            displayHeight = maxLandscapeHeight;
        }
    } else {
        // For portrait images: cap at 600px max
        const maxPortraitHeight = 600;
        if (displayHeight > maxPortraitHeight) {
            displayHeight = maxPortraitHeight;
        }
    }

    // Also cap by absolute maximum (safety check)
    const absoluteMaxHeight = GRID_CONFIG.maxRowSpan * baseRowHeight;
    if (displayHeight > absoluteMaxHeight) {
        displayHeight = absoluteMaxHeight;
    }

    // Calculate row span - use Math.floor() as default to prevent images being too tall
    // This matches Unsplash's compact layout where images fit tightly
    const exactRowSpan = displayHeight / baseRowHeight;
    const remainder = exactRowSpan - Math.floor(exactRowSpan);
    
    let rowSpan: number;
    if (remainder > 0.85) {
        // Very close to next row - round up to prevent awkward cropping
        rowSpan = Math.ceil(exactRowSpan);
    } else {
        // Round down for compact display (prevents images being too tall)
        rowSpan = Math.max(1, Math.floor(exactRowSpan));
    }

    return {
        rowSpan: Math.max(
            GRID_CONFIG.minRowSpan,
            Math.min(GRID_CONFIG.maxRowSpan, rowSpan)
        ),
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

    useEffect(() => {
        const load = async () => {
            try {
                const [imgsRes, catsRes] = await Promise.all([
                    api.get('/images'),
                    api.get('/categories'),
                ]);
                const loadedImages = toImageArray(imgsRes.data);
                setImages(loadedImages);
                setCategories(toCategoryArray(catsRes.data));

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
        };
        load();
    }, []);

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

    // Store image dimensions as they load
    const [imageDimensions, setImageDimensions] = useState<Map<string, { width: number; height: number }>>(new Map());
    const loadingDimensionsRef = useRef<Set<string>>(new Set()); // Track which images we're currently loading

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
                                // eslint-disable-next-line no-console
                                console.log(`[Dimensions Loaded] Image ${image._id?.substring(0, 8)}: ${dims.width}x${dims.height} (aspect: ${(dims.width / dims.height).toFixed(2)})`);
                                return { id: image._id, dims };
                            }
                        } catch (error) {
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

        return filteredImages.map((image, index) => {
            // Sequential column placement (1→2→3→1→2→3...)
            const column = (index % columnCount) + 1;

            // Get dimensions (from state or image properties)
            const dimensions = imageDimensions.get(image._id) || null;

            // Calculate row span based on aspect ratio
            const layout = calculateImageLayout(
                image,
                columnWidth,
                GRID_CONFIG.baseRowHeight,
                dimensions
            );

            // Debug: Log first few images to see what's happening
            if (index < 5) {
                const finalWidth = dimensions?.width || image.width;
                const finalHeight = dimensions?.height || image.height;
                const aspectRatio = finalWidth && finalHeight ? (finalWidth / finalHeight) : 0;
                const isLandscape = aspectRatio > 1;
                const calculatedHeight = aspectRatio ? (columnWidth / aspectRatio) : 0;
                const actualHeight = layout.rowSpan * GRID_CONFIG.baseRowHeight;
                // eslint-disable-next-line no-console
                console.log(`[Grid Layout] Image ${index}:`, {
                    id: image._id?.substring(0, 8),
                    width: finalWidth,
                    height: finalHeight,
                    aspectRatio: aspectRatio ? aspectRatio.toFixed(2) : 'N/A',
                    isLandscape,
                    columnWidth: columnWidth.toFixed(0) + 'px',
                    rowSpan: layout.rowSpan,
                    actualHeight: actualHeight.toFixed(0) + 'px',
                    calculatedHeight: calculatedHeight ? calculatedHeight.toFixed(0) + 'px' : 'N/A',
                    column,
                    source: dimensions ? 'loaded' : image.width ? 'fromImage' : 'fallback',
                });
            }

            return {
                image,
                column,
                rowSpan: layout.rowSpan,
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
                        gap: GRID_CONFIG.gap,
                        // Base row height for row span calculations
                        gridAutoRows: GRID_CONFIG.baseRowHeight,
                    }}
                >
                    {gridLayout.map((layout, idx) => {
                        const { image, column, rowSpan } = layout;
                        // Priority loading for first 12 images (above the fold)
                        const isPriority = idx < 12;
                        return (
                            <div
                                key={image._id || idx}
                                className="grid-item-wrapper"
                                style={{
                                    // Sequential column placement
                                    gridColumn: column,
                                    // Dynamic row span based on aspect ratio (consistent for all images)
                                    gridRowEnd: `span ${rowSpan}`,
                                }}
                            >
                                <BlurUpImage
                                    image={image}
                                    onClick={async () => {
                                        // Unsplash technique: Preload image COMPLETELY before opening modal
                                        const full = image.regularUrl || image.imageUrl || image.smallUrl || image.thumbnailUrl;
                                        if (full) {
                                            try {
                                                // Wait for image to be fully loaded before opening modal
                                                await preloadImage(full);
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


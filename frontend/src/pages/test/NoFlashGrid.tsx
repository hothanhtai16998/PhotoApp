import { useEffect, useLayoutEffect, useMemo, useRef, useState, useCallback } from 'react';
import api from '@/lib/axios';
import type { Image } from '@/types/image';

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
            style={{
                position: 'relative',
                width: '100%',
                paddingBottom: '66%',
                overflow: 'hidden',
                borderRadius: 8,
                background: '#f2f2f2',
                cursor: 'pointer',
            }}
            onClick={onClick}
            onMouseEnter={handleMouseEnter}
        >
            {backSrc && (
                <img
                    src={backSrc}
                    alt={image.imageTitle || 'photo'}
                    style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        filter: loaded ? 'none' : 'blur(12px) saturate(1.05)',
                        transform: loaded ? 'none' : 'scale(1.02)',
                        transition: 'filter 0.25s ease, transform 0.25s ease',
                    }}
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

    // Initialize with placeholder immediately to prevent flash - calculate once
    const getInitialSources = () => {
        if (!img) return { placeholder: '', full: '', backSrc: '' };
        const place = img.thumbnailUrl || img.smallUrl || img.imageUrl || '';
        const full = img.regularUrl || img.imageUrl || img.smallUrl || place;
        const backSrc = place || full || '';
        return { placeholder: place, full, backSrc };
    };

    const initial = getInitialSources();
    const [backSrc, setBackSrc] = useState<string | null>(initial.backSrc || null);
    const [placeholder, setPlaceholder] = useState<string | null>(initial.placeholder || initial.full || null);

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

    useEffect(() => {
        if (!img) return;

        // Check if this is actually a new image
        previousImgRef.current = img;

        // reset scroll to top when image changes so top bar/author stay visible
        scrollPosRef.current = 0;
        if (scrollRef.current) {
            scrollRef.current.scrollTop = 0;
        }

        const place = img.thumbnailUrl || img.smallUrl || img.imageUrl || '';
        const full = img.regularUrl || img.imageUrl || img.smallUrl || place;
        const nextPlaceholder = place || full;

        // Unsplash technique: Set thumbnail IMMEDIATELY (synchronous, no delay)
        // This ensures something is visible the moment modal opens
        if (nextPlaceholder) {
            // Use functional update to ensure we always set it
            setPlaceholder(nextPlaceholder);
            setBackSrc(nextPlaceholder);
        }

        // If full image is already cached, use it immediately
        if (full && loadedImages.has(full)) {
            // Image already loaded - show immediately without any delay
            setBackSrc(full);
        } else if (full && full !== nextPlaceholder) {
            // Preload full image in background
            // When ready, swap src - browser handles this smoothly
            preloadImage(full)
                .then((src) => {
                    // Update to full quality - browser will swap smoothly
                    setBackSrc(src);
                })
                .catch(() => {
                    // On error, keep placeholder visible (already set above)
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
                                        {/* Unsplash technique: Single image layer - no transitions, instant display */}
                                        {backSrc ? (
                                            <img
                                                key={backSrc}
                                                src={backSrc}
                                                alt={img.imageTitle || 'photo'}
                                                style={{
                                                    position: 'absolute',
                                                    inset: 0,
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'contain',
                                                    // Apply blur only when showing placeholder
                                                    filter: placeholder && backSrc === placeholder ? 'blur(12px) saturate(1.05)' : 'none',
                                                    // No transitions - instant display to prevent flash
                                                    opacity: 1,
                                                    transition: 'none',
                                                    background: '#0f0f0f',
                                                    // Prevent image from causing layout shifts
                                                    display: 'block',
                                                }}
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

export default function NoFlashGridPage() {
    const [images, setImages] = useState<ExtendedImage[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [activeCategory, setActiveCategory] = useState<string>('');
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const gridRef = useRef<HTMLDivElement | null>(null);

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
            const catName = img.categoryName || img.category || '';
            return catName === activeCategory;
        });
    }, [images, activeCategory]);

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
        <div style={{ padding: '16px', maxWidth: 1400, margin: '0 auto' }}>
            <h1 style={{ marginBottom: 12 }}>No-Flash Grid Test</h1>
            <p style={{ marginBottom: 16 }}>Custom grid + modal (no shared components). Blur-up, double buffer, preload.</p>

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                <button
                    onClick={() => setActiveCategory('')}
                    style={{
                        padding: '8px 12px',
                        borderRadius: 6,
                        border: '1px solid #ccc',
                        background: activeCategory === '' ? '#111' : '#fff',
                        color: activeCategory === '' ? '#fff' : '#111',
                        cursor: 'pointer',
                    }}
                >
                    All
                </button>
                {categories.map((cat) => (
                    <button
                        key={cat._id || cat.name}
                        onClick={() => setActiveCategory(cat.name)}
                        style={{
                            padding: '8px 12px',
                            borderRadius: 6,
                            border: '1px solid #ccc',
                            background: activeCategory === cat.name ? '#111' : '#fff',
                            color: activeCategory === cat.name ? '#fff' : '#111',
                            cursor: 'pointer',
                        }}
                    >
                        {cat.name}
                    </button>
                ))}
            </div>

            {loading ? (
                <div>Loading...</div>
            ) : (
                <div
                    ref={gridRef}
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                        gap: 16,
                    }}
                >
                    {filteredImages.map((img, idx) => {
                        // Priority loading for first 12 images (above the fold)
                        const isPriority = idx < 12;
                        return (
                            <BlurUpImage
                                key={img._id || idx}
                                image={img}
                                onClick={async () => {
                                    // Unsplash technique: Preload image BEFORE opening modal
                                    const full = img.regularUrl || img.imageUrl || img.smallUrl || img.thumbnailUrl;
                                    if (full) {
                                        // Start preloading immediately
                                        preloadImage(full).catch(() => { });
                                        // Open modal after a tiny delay to let preload start
                                        // This ensures image is ready or at least loading when modal opens
                                        requestAnimationFrame(() => {
                                            setSelectedIndex(idx);
                                        });
                                    } else {
                                        setSelectedIndex(idx);
                                    }
                                }}
                                priority={isPriority}
                            />
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


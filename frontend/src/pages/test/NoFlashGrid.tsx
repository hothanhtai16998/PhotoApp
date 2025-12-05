import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import api from '@/lib/axios';
import type { Image } from '@/types/image';

type Category = { name: string; _id: string };

// Simple blur-up image with persistent back layer
type ExtendedImage = Image & { categoryName?: string; category?: string };

function BlurUpImage({
    image,
    onClick,
}: {
    image: ExtendedImage;
    onClick?: () => void;
}) {
    const placeholderInitial = image.thumbnailUrl || image.smallUrl || image.imageUrl || null;
    const [loaded, setLoaded] = useState(false);
    const [backSrc, setBackSrc] = useState<string | null>(placeholderInitial);
    const frontRef = useRef<HTMLImageElement | null>(null);

    useEffect(() => {
        const placeholder = image.thumbnailUrl || image.smallUrl || image.imageUrl || '';
        const full = image.regularUrl || image.imageUrl || placeholder;
        const img = new Image();
        img.src = full;
        img.onload = () => {
            setBackSrc(img.src);
            setLoaded(true);
        };
        return () => {
            img.onload = null;
        };
    }, [image]);

    return (
        <div
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
    const [frontSrc, setFrontSrc] = useState<string | null>(null);
    const [backSrc, setBackSrc] = useState<string | null>(null);
    const [placeholder, setPlaceholder] = useState<string | null>(null);
    const [imageBox, setImageBox] = useState<{ widthPct: number; paddingBottom: string; gutter: number }>({
        widthPct: 0.85,
        paddingBottom: '60%',
        gutter: 48,
    });
    const modalRef = useRef<HTMLDivElement | null>(null);
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const scrollPosRef = useRef(0);
    const img = images[index];
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

    // preload next/prev
    useEffect(() => {
        const pre = (i: number) => {
            const target = images[i];
            if (!target) return;
            const src = target.regularUrl || target.imageUrl || target.smallUrl || target.thumbnailUrl;
            if (!src) return;
            const p = new Image();
            p.src = src;
        };
        pre((index + 1) % images.length);
        pre((index - 1 + images.length) % images.length);
    }, [index, images]);

    useEffect(() => {
        if (!img) return;
        // reset scroll to top when image changes so top bar/author stay visible
        scrollPosRef.current = 0;
        if (scrollRef.current) {
            scrollRef.current.scrollTop = 0;
        }
        const place = img.thumbnailUrl || img.smallUrl || img.imageUrl || '';
        const full = img.regularUrl || img.imageUrl || img.smallUrl || place;
        const nextPlaceholder = place || full;
        setPlaceholder(nextPlaceholder);
        setFrontSrc(null);
        setBackSrc((prev) => prev || full);
        const loader = new Image();
        loader.src = full;
        loader.onload = () => {
            setFrontSrc(full);
            setBackSrc(full);
        };
        return () => {
            loader.onload = null;
        };
    }, [img]);

    // Responsive image box sizing based on modal size and image aspect ratio
    useEffect(() => {
        const recalc = () => {
            const modal = modalRef.current;
            if (!modal) return;
            const width = modal.clientWidth;
            const height = modal.clientHeight;
            // account for top (72) + paddings and some bottom space (approx 180 for bottom info header)
            const availableHeight = Math.max(200, height - 72 - 180);
            const targetAspect = aspect || 0.6;
            // propose width as 92% of modal
            let widthPct = 0.92;
            // compute height from proposed width
            let imgWidth = width * widthPct;
            let imgHeight = imgWidth * targetAspect;
            // if height exceeds available, reduce width
            if (imgHeight > availableHeight) {
                imgHeight = availableHeight;
                imgWidth = imgHeight / targetAspect;
                widthPct = Math.min(0.97, Math.max(0.82, imgWidth / width));
            }
            // gutters responsive: clamp 20px..48px
            const gutter = Math.min(48, Math.max(20, width * 0.03));
            const paddingBottom = `${Math.max(48, Math.min(88, (imgHeight / imgWidth) * 100))}%`;
            setImageBox({ widthPct, paddingBottom, gutter });
        };
        recalc();
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
                    background: 'rgba(0,0,0,0.85)',
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                    padding: 0,
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
                                <div style={{ width: imageBox.gutter, flexShrink: 0, background: '#0b0' }} />
                                <div style={{ flex: 1, position: 'relative', background: '#111' }}>
                                    <div
                                        style={{
                                            position: 'relative',
                                            width: '100%',
                                            paddingBottom: imageBox.paddingBottom,
                                            background: '#111',
                                        }}
                                    >
                                        {/* back layer */}
                                        {backSrc && (
                                            <img
                                                src={backSrc}
                                                alt={img.imageTitle || 'photo'}
                                                style={{
                                                    position: 'absolute',
                                                    inset: 0,
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'contain',
                                                    filter: placeholder && backSrc === placeholder ? 'blur(12px) saturate(1.05)' : 'none',
                                                    transform: placeholder && backSrc === placeholder ? 'scale(1.01)' : 'none',
                                                    transition: 'filter 0.2s ease, transform 0.2s ease',
                                                    background: '#000',
                                                }}
                                            />
                                        )}
                                        {/* front layer */}
                                        {frontSrc && (
                                            <img
                                                src={frontSrc}
                                                alt={img.imageTitle || 'photo'}
                                                style={{
                                                    position: 'absolute',
                                                    inset: 0,
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'contain',
                                                    filter: 'none',
                                                    background: '#000',
                                                }}
                                            />
                                        )}
                                    </div>
                                </div>
                                <div style={{ width: 48, flexShrink: 0, background: '#0b0' }} />
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
                setImages(toImageArray(imgsRes.data));
                setCategories(toCategoryArray(catsRes.data));
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
                    style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                        gap: 16,
                    }}
                >
                    {filteredImages.map((img, idx) => (
                        <BlurUpImage
                            key={img._id || idx}
                            image={img}
                            onClick={() => setSelectedIndex(idx)}
                        />
                    ))}
                </div>
            )}

            {selectedIndex !== null && filteredImages[selectedIndex] && (
                <ImageModal
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


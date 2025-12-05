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
}: {
    images: ExtendedImage[];
    index: number;
    onClose: () => void;
    onNavigate: (next: number) => void;
}) {
    const [frontSrc, setFrontSrc] = useState<string | null>(null);
    const [backSrc, setBackSrc] = useState<string | null>(null);
    const [placeholder, setPlaceholder] = useState<string | null>(null);
    const [modalShift, setModalShift] = useState(0);
    const modalRef = useRef<HTMLDivElement | null>(null);
    const scrollRef = useRef<HTMLDivElement | null>(null);
    const img = images[index];

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
                        transform: `translateY(${-modalShift}px)`,
                        transition: 'transform 120ms ease',
                        willChange: 'transform',
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
                            const shift = Math.min(top, 16);
                            if (shift !== modalShift) setModalShift(shift);
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
                            <div>{img.imageTitle || 'Top info'}</div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => onNavigate((index - 1 + images.length) % images.length)}>Prev</button>
                                <button onClick={() => onNavigate((index + 1) % images.length)}>Next</button>
                                <button onClick={onClose}>Close</button>
                            </div>
                        </div>

                        {/* Middle image with gutters */}
                        <div
                            style={{
                                background: '#0f0f0f',
                                padding: '24px 0',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    gap: 0,
                                    alignItems: 'center',
                                }}
                            >
                                <div style={{ width: 72, flexShrink: 0, background: '#0b0' }} />
                                <div style={{ flex: 1, position: 'relative', background: '#111' }}>
                                    <div
                                        style={{
                                            position: 'relative',
                                            width: '100%',
                                            paddingBottom: '62%',
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
                                <div style={{ width: 72, flexShrink: 0, background: '#0b0' }} />
                            </div>
                        </div>

                        {/* Bottom info (tall to demonstrate scrolling) */}
                        <div
                            style={{
                                background: '#0a54e6',
                                color: '#fff',
                                padding: '24px 16px',
                                minHeight: 800,
                            }}
                        >
                            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 12 }}>Bottom info</div>
                            <p>
                                Placeholder content. Add image details, EXIF, collections, related images, etc. This section is tall to
                                allow scrolling inside the modal while keeping the layout stable.
                            </p>
                            <div style={{ height: 600 }} />
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
                />
            )}
        </div>
    );
}


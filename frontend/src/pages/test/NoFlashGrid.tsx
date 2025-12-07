import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import api from '@/lib/axios';
import type { Image } from '@/types/image';
import './NoFlashGrid.css';

// Import extracted modules
import { GRID_CONFIG } from './constants/gridConfig';
import { preloadImage, preloadImages, loadedImages } from './utils/imagePreloader';
import { loadImageDimensions } from './utils/imageDimensions';
import { calculateImageLayout, getColumnCount } from './utils/gridLayout';
import { BlurUpImage } from './components/BlurUpImage';
import { ImageModal } from './components/ImageModal';
import { useInfiniteScroll } from './hooks/useInfiniteScroll';

type Category = { name: string; _id: string };

// Simple blur-up image with persistent back layer
type ExtendedImage = Image & { categoryName?: string; category?: string };

export default function NoFlashGridPage() {
    const [images, setImages] = useState<ExtendedImage[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [activeCategory, setActiveCategory] = useState<string>('');
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [_pagination, setPagination] = useState<{ page: number; limit: number; total: number; pages: number } | null>(null);
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
    const loadData = useCallback(async (page: number = 1, append: boolean = false) => {
        try {
            if (page === 1) {
                setLoading(true);
            } else {
                setIsLoadingMore(true);
            }

            const categoryParam = activeCategory ? `&category=${encodeURIComponent(activeCategory)}` : '';
            const [imgsRes, catsRes] = await Promise.all([
                api.get(`/images?page=${page}&limit=20${categoryParam}`),
                page === 1 ? api.get('/categories') : Promise.resolve({ data: null }),
            ]);

            const responseData = imgsRes.data;
            const loadedImages = toImageArray(responseData.images || responseData);

            // Handle pagination response
            if (responseData.pagination) {
                setPagination(responseData.pagination);
                setHasMore(responseData.pagination.page < responseData.pagination.pages);
            } else {
                // Fallback: if no pagination info, assume no more if we got fewer than limit
                setHasMore(loadedImages.length >= 20);
            }

            if (append) {
                setImages(prev => [...prev, ...loadedImages]);
            } else {
                setImages(loadedImages);
                // Clear image dimensions cache when refreshing (in case images were updated)
                setImageDimensions(new Map());
                loadingDimensionsRef.current.clear();
            }

            // Only update categories on first page load
            if (page === 1 && catsRes.data) {
                setCategories(toCategoryArray(catsRes.data));
            }

            // Preload thumbnails for newly loaded images
            const thumbnails = loadedImages.slice(0, 20)
                .map(img => img.thumbnailUrl || img.smallUrl)
                .filter((src): src is string => Boolean(src));
            preloadImages(thumbnails, true);
        } catch (e) {
            console.error('Failed to load data', e);
            if (!append) {
                setImages([]);
                if (page === 1) {
                    setCategories([]);
                }
            }
        } finally {
            if (page === 1) {
                setLoading(false);
            } else {
                setIsLoadingMore(false);
            }
        }
    }, [activeCategory]);

    // Load data on mount
    useEffect(() => {
        setCurrentPage(1);
        loadData(1, false);
    }, [activeCategory]); // Reload when category changes

    // Load more images when scrolling
    const handleLoadMore = useCallback(async () => {
        if (!hasMore || isLoadingMore || loading) return;
        const nextPage = currentPage + 1;
        setCurrentPage(nextPage);
        await loadData(nextPage, true);
    }, [hasMore, isLoadingMore, loading, currentPage, loadData]);

    // Infinite scroll hook
    const { loadMoreRef } = useInfiniteScroll({
        hasMore,
        isLoading: loading || isLoadingMore,
        onLoadMore: handleLoadMore,
        rootMargin: '600px', // Start loading 600px before reaching bottom
    });

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
                    onClick={() => {
                        setCurrentPage(1);
                        loadData(1, false);
                    }}
                    className="category-filter-button refresh-button"
                    title="Refresh images and categories"
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
                                <div className="debug-overlay">
                                    C: {column} | AR: {aspectRatio} | H: {actualHeight}px | R: {rowSpan} | RS: {rowStart}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Infinite scroll trigger */}
            {!loading && (
                <div ref={loadMoreRef} style={{ height: '1px', marginTop: '20px' }}>
                    {isLoadingMore && (
                        <div className="loading-state" style={{ padding: '20px' }}>
                            Loading more images...
                        </div>
                    )}
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


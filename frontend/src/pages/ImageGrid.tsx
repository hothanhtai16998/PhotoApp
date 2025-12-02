import { useState, useEffect, useCallback, lazy, Suspense, useRef, useContext, useMemo } from 'react';
import { useSearchParams, useNavigate, useLocation, useParams } from 'react-router-dom';
import type { Image } from '../types/image';
import { imageService } from '../services/imageService';
import MasonryGrid from '../components/MasonryGrid';
import CategoryNavigation from '../components/CategoryNavigation';
import { useInfiniteScroll } from '../components/image/hooks/useInfiniteScroll';
import { Skeleton } from '@/components/ui/skeleton';
import { generateImageSlug, extractIdFromSlug } from '@/lib/utils';
import { appConfig } from '@/config/appConfig';
import { isMobileViewport } from '@/utils/responsive';
import { ActualLocationContext } from '@/contexts/ActualLocationContext';
import { INLINE_MODAL_FLAG_KEY } from '@/constants/modalKeys';
import { getCategoryNameFromSlug } from '@/utils/categorySlug';
import { categoryService } from '@/services/categoryService';
import api from '@/lib/api';
import { searchConfig } from '@/config/searchConfig';
import type { SearchFiltersType } from '@/components/SearchBar/hooks/useSearchFilters';
import { applyImageFilters } from '@/utils/imageFilters';
import type { SearchFilters, ColorFilter } from '@/components/SearchFilters';

const ImageModal = lazy(() => import('@/components/ImageModal'));
const CollectionModal = lazy(() => import('@/components/CollectionModal'));
const GRID_SCROLL_POSITION_KEY = 'imageGridScrollPosition';

const ImageGrid = () => {
    const [images, setImages] = useState<Image[]>([]);
    const [loading, setLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const backgroundLocation = useLocation();
    const actualLocation = useContext(ActualLocationContext);
    const actualPathname = actualLocation?.pathname;
    const actualLocationState = actualLocation?.state as { inlineModal?: boolean } | undefined;
    const isInlineModalRoute = Boolean(actualLocationState?.inlineModal);

    // Get category slug from route params (for /t/:categorySlug)
    const { categorySlug } = useParams<{ categorySlug?: string }>();
    const [categoryName, setCategoryName] = useState<string | null>(null);

    // Determine category: from route param or query param (backward compatibility)
    const categoryFromQuery = searchParams.get('category');
    const category = categorySlug
        ? (categoryName || 'all')
        : (categoryFromQuery || 'all');

    // Load filters from localStorage
    const [filters, setFilters] = useState<SearchFiltersType>(() => {
        try {
            const stored = localStorage.getItem(searchConfig.filtersStorageKey);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (error) {
            console.error('Failed to load filters:', error);
        }
        return {
            orientation: 'all',
            color: 'all',
            dateFrom: '',
            dateTo: '',
        };
    });

    // Listen for filter changes from SearchBar
    useEffect(() => {
        const handleFilterChange = () => {
            try {
                const stored = localStorage.getItem(searchConfig.filtersStorageKey);
                if (stored) {
                    const newFilters = JSON.parse(stored);
                    setFilters(newFilters);
                } else {
                    setFilters({
                        orientation: 'all',
                        color: 'all',
                        dateFrom: '',
                        dateTo: '',
                    });
                }
            } catch (error) {
                console.error('Failed to load filters:', error);
            }
        };

        window.addEventListener('filterChange', handleFilterChange);
        return () => window.removeEventListener('filterChange', handleFilterChange);
    }, []);

    const [selectedImage, setSelectedImage] = useState<Image | null>(null);
    const [collectionImage, setCollectionImage] = useState<Image | null>(null);
    const [showCollectionModal, setShowCollectionModal] = useState(false);
    const [imageTypes, setImageTypes] = useState<Map<string, 'portrait' | 'landscape' | 'square'>>(new Map());
    const processedImages = useRef<Set<string>>(new Set());
    const currentImageIds = useRef<Set<string>>(new Set());
    const [columnCount, setColumnCount] = useState(() => {
        if (typeof window === 'undefined') return 3;
        const width = window.innerWidth;
        if (width < appConfig.mobileBreakpoint) return 1; // Mobile: 1 column
        if (width < appConfig.breakpoints.lg) return 2; // Tablet: 2 columns
        return 3; // Desktop: 3 columns
    });

    // Fetch categories to convert slug to name
    useEffect(() => {
        const loadCategories = async () => {
            try {
                const fetchedCategories = await categoryService.fetchCategories();

                // If we have a category slug, convert it to name
                if (categorySlug) {
                    const name = getCategoryNameFromSlug(categorySlug, fetchedCategories);
                    setCategoryName(name);
                } else {
                    setCategoryName(null);
                }
            } catch (error) {
                console.error('Failed to load categories:', error);
                setCategoryName(null);
            }
        };
        loadCategories();
    }, [categorySlug]);

    const saveScrollPosition = useCallback(() => {
        if (typeof window === 'undefined') return;
        if (!sessionStorage.getItem(GRID_SCROLL_POSITION_KEY)) {
            sessionStorage.setItem(GRID_SCROLL_POSITION_KEY, window.scrollY.toString());
        }
    }, []);

    const restoreScrollPosition = useCallback(() => {
        if (typeof window === 'undefined') return;
        const savedScroll = sessionStorage.getItem(GRID_SCROLL_POSITION_KEY);
        if (savedScroll) {
            window.scrollTo(0, parseInt(savedScroll, 10));
            sessionStorage.removeItem(GRID_SCROLL_POSITION_KEY);
        }
    }, []);

    useEffect(() => {
        const handleBeforeUnload = () => {
            sessionStorage.removeItem(INLINE_MODAL_FLAG_KEY);
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []);

    const handleImageClick = useCallback((image: Image) => {
        const newSlug = generateImageSlug(image.imageTitle || '', image._id);

        if (isMobileViewport()) {
            // Mobile: open full ImagePage but remember it's from grid (for back behavior)
            if (typeof window !== 'undefined') {
                sessionStorage.setItem(appConfig.storage.imagePageFromGridKey, 'true');
            }
            navigate(`/photos/${newSlug}`, { state: { fromGrid: true } });
            return;
        }

        saveScrollPosition();
        setSelectedImage(image);
        if (typeof window !== 'undefined') {
            sessionStorage.setItem(INLINE_MODAL_FLAG_KEY, 'true');
        }
        navigate(`/photos/${newSlug}`, {
            state: {
                background: backgroundLocation,
                inlineModal: true,
            },
        });
    }, [navigate, saveScrollPosition, backgroundLocation]);

    const handleCloseModal = useCallback(() => {
        setSelectedImage(null);
        restoreScrollPosition();
        if (typeof window !== 'undefined') {
            sessionStorage.removeItem(INLINE_MODAL_FLAG_KEY);
        }
        navigate(-1);
    }, [navigate, restoreScrollPosition]);

    const handleModalImageSelect = useCallback((image: Image) => {
        setSelectedImage(image);
        const newSlug = generateImageSlug(image.imageTitle || '', image._id);
        navigate(`/photos/${newSlug}`, {
            replace: true,
            state: {
                background: backgroundLocation,
                inlineModal: true,
            },
        });
    }, [navigate, backgroundLocation]);

    const fetchImages = useCallback(async (currentPage: number, categoryName: string, colorFilter?: string) => {
        if (currentPage === 1) {
            setLoading(true);
        } else {
            setIsLoadingMore(true);
        }
        try {
            const response = await imageService.fetchImages({
                page: currentPage,
                limit: 20,
                category: categoryName === 'all' ? undefined : categoryName,
                color: colorFilter && colorFilter !== 'all' ? colorFilter : undefined,
            });
            const newImages = response.images || [];
            setImages(prev => currentPage === 1 ? newImages : [...prev, ...newImages]);
            setHasMore(!!response.pagination && response.pagination.page < response.pagination.pages);
        } catch (error) {
            console.error('Failed to fetch images:', error);
            setImages([]);
        } finally {
            if (currentPage === 1) {
                setLoading(false);
            } else {
                setIsLoadingMore(false);
            }
        }
    }, []);

    useEffect(() => {
        setImages([]);
        setPage(1);
        setHasMore(true);
        fetchImages(1, category, filters.color);
    }, [category, filters.color, fetchImages]);

    const lastInlineSlugRef = useRef<string | null>(null);

    useEffect(() => {
        if (!isInlineModalRoute) {
            if (lastInlineSlugRef.current) {
                lastInlineSlugRef.current = null;
                setSelectedImage(null);
                restoreScrollPosition();
                if (typeof window !== 'undefined') {
                    sessionStorage.removeItem(INLINE_MODAL_FLAG_KEY);
                }
            }
            return;
        }

        if (!actualPathname?.startsWith('/photos/')) {
            return;
        }

        const slugFromPath = actualPathname.slice('/photos/'.length);
        if (!slugFromPath || slugFromPath === lastInlineSlugRef.current) {
            return;
        }

        if (images.length === 0) {
            return;
        }

        const imageId = extractIdFromSlug(slugFromPath);
        const imageFromUrl = images.find(img => img._id.endsWith(imageId));
        if (imageFromUrl) {
            setSelectedImage(imageFromUrl);
            lastInlineSlugRef.current = slugFromPath;
        }
    }, [actualPathname, images, isInlineModalRoute, restoreScrollPosition]);

    const handleLoadMore = useCallback(() => {
        if (!loading && hasMore && !isLoadingMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchImages(nextPage, category, filters.color);
        }
    }, [loading, hasMore, page, category, filters.color, fetchImages, isLoadingMore]);

    const { loadMoreRef } = useInfiniteScroll({
        hasMore,
        isLoading: loading || isLoadingMore,
        onLoadMore: handleLoadMore,
    });

    // Apply filters to images (orientation, date, etc.)
    const filteredImages = useMemo(() => {
        const searchFilters: SearchFilters = {
            orientation: filters.orientation as 'all' | 'portrait' | 'landscape' | 'square',
            color: filters.color as ColorFilter, // Color is filtered on backend
            dateFrom: filters.dateFrom,
            dateTo: filters.dateTo,
        };
        return applyImageFilters(images, searchFilters, imageTypes);
    }, [images, filters, imageTypes]);

    const handleImageLoad = useCallback((imageId: string, img: HTMLImageElement) => {
        if (processedImages.current.has(imageId)) return;
        processedImages.current.add(imageId);

        // Determine image orientation with tolerance for square images
        const height = img.naturalHeight;
        const width = img.naturalWidth;
        const aspectRatio = height / width;
        const tolerance = 0.05; // 5% tolerance for square images

        let imageType: 'portrait' | 'landscape' | 'square';
        if (Math.abs(aspectRatio - 1) < tolerance) {
            imageType = 'square';
        } else if (height > width) {
            imageType = 'portrait';
        } else {
            imageType = 'landscape';
        }

        setImageTypes(prev => {
            if (prev.has(imageId)) return prev;
            const newMap = new Map(prev);
            newMap.set(imageId, imageType);
            return newMap;
        });
    }, []);

    // Download handler
    const handleDownload = useCallback(async (image: Image, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            if (!image._id) {
                throw new Error('Lỗi khi lấy ID của ảnh');
            }

            const response = await api.get(`/images/${image._id}/download`, {
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
                const sanitizedTitle = (image.imageTitle || 'photo').replace(/[^a-z0-9]/gi, '_').toLowerCase();
                const urlExtension = image.imageUrl?.match(/\.([a-z]+)(?:\?|$)/i)?.[1] || 'webp';
                fileName = `${sanitizedTitle}.${urlExtension}`;
            }
            link.download = fileName;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Failed to download image:', error);
        }
    }, []);

    // Download handler with size selection (for mobile)
    const handleDownloadWithSize = useCallback(async (image: Image, size: 'small' | 'medium' | 'large' | 'original') => {
        try {
            if (!image._id) {
                throw new Error('Lỗi khi lấy ID của ảnh');
            }

            const response = await api.get(`/images/${image._id}/download?size=${size}`, {
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
                const sanitizedTitle = (image.imageTitle || 'photo').replace(/[^a-z0-9]/gi, '_').toLowerCase();
                const urlExtension = image.imageUrl?.match(/\.([a-z]+)(?:\?|$)/i)?.[1] || 'webp';
                fileName = `${sanitizedTitle}.${urlExtension}`;
            }
            link.download = fileName;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Failed to download image:', error);
        }
    }, []);

    // Collection handler
    const handleAddToCollection = useCallback((image: Image, e: React.MouseEvent) => {
        e.stopPropagation();
        setCollectionImage(image);
        setShowCollectionModal(true);
    }, []);

    const handleCollectionModalClose = useCallback(() => {
        setShowCollectionModal(false);
        setCollectionImage(null);
    }, []);

    // Clean up query params if using route-based category (backward compatibility)
    useEffect(() => {
        const isOnHomeRoute = !actualPathname || actualPathname === '/';
        if (!isOnHomeRoute) return;

        // Only clean up query params if we're on homepage and category is 'all'
        if (category === 'all' && categoryFromQuery) {
            const newSearchParams = new URLSearchParams(searchParams.toString());
            newSearchParams.delete('category');
            const queryString = newSearchParams.toString();
            const nextPath = queryString ? `?${queryString}` : '/';
            navigate(nextPath, { replace: true });
        }
    }, [category, categoryFromQuery, searchParams, navigate, actualPathname]);

    // Update column count based on viewport size
    useEffect(() => {
        const updateColumnCount = () => {
            const width = window.innerWidth;
            if (width < appConfig.mobileBreakpoint) {
                setColumnCount(1); // Mobile: 1 column
            } else if (width < appConfig.breakpoints.lg) {
                setColumnCount(2); // Tablet: 2 columns
            } else {
                setColumnCount(3); // Desktop: 3 columns
            }
        };

        updateColumnCount();
        window.addEventListener('resize', updateColumnCount);
        return () => window.removeEventListener('resize', updateColumnCount);
    }, []);

    return (
        <>
            <div className="container mx-auto">
                <CategoryNavigation />
                {loading && images.length === 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
                        {Array.from({ length: 12 }).map((_, i) => (
                            <Skeleton key={i} className="w-full h-64" />
                        ))}
                    </div>
                ) : (
                    <MasonryGrid
                        images={filteredImages}
                        onImageClick={handleImageClick}
                        columnCount={columnCount}
                        onDownload={handleDownload}
                        onDownloadWithSize={handleDownloadWithSize}
                        onAddToCollection={handleAddToCollection}
                    />
                )}
                <div ref={loadMoreRef} />
                {isLoadingMore && <p className="text-center py-4">Đang tải...</p>}
            </div>
            <Suspense fallback={null}>
                {selectedImage && (
                    <ImageModal
                        image={selectedImage}
                        images={filteredImages}
                        onClose={handleCloseModal}
                        onImageSelect={handleModalImageSelect}
                        lockBodyScroll={false}
                        renderAsPage={false}
                        onDownload={() => { /* Download handled by ImageModal internally */ }}
                        imageTypes={imageTypes as Map<string, 'portrait' | 'landscape'>}
                        onImageLoad={handleImageLoad}
                        currentImageIds={currentImageIds.current}
                        processedImages={processedImages}
                    />
                )}
                {showCollectionModal && collectionImage && (
                    <CollectionModal
                        isOpen={showCollectionModal}
                        onClose={handleCollectionModalClose}
                        imageId={collectionImage._id}
                        onCollectionUpdate={() => {
                            // Optionally refresh images or update state
                        }}
                    />
                )}
            </Suspense>
        </>
    );
};

export default ImageGrid;
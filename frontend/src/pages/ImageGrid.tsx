import { useState, useEffect, useCallback, lazy, Suspense, useRef, useContext } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
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

const ImageModal = lazy(() => import('@/components/ImageModal'));
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
    const category = searchParams.get('category') || 'all';
    const [selectedImage, setSelectedImage] = useState<Image | null>(null);
    const [imageTypes, setImageTypes] = useState<Map<string, 'portrait' | 'landscape'>>(new Map());
    const processedImages = useRef<Set<string>>(new Set());
    const currentImageIds = useRef<Set<string>>(new Set());

    // Category changes are handled internally by CategoryNavigation and the image store

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
        if (typeof window !== 'undefined') {
            sessionStorage.setItem(appConfig.storage.imagePageFromGridKey, 'true');
        }

        if (isMobileViewport()) {
            // Mobile: navigate to full page (no inline modal)
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

    const fetchImages = useCallback(async (currentPage: number, categoryName: string) => {
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
        fetchImages(1, category);
    }, [category, fetchImages]);

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
            fetchImages(nextPage, category);
        }
    }, [loading, hasMore, page, category, fetchImages, isLoadingMore]);

    const { loadMoreRef } = useInfiniteScroll({
        hasMore,
        isLoading: loading || isLoadingMore,
        onLoadMore: handleLoadMore,
    });

    const handleImageLoad = useCallback((imageId: string, img: HTMLImageElement) => {
        if (processedImages.current.has(imageId)) return;
        processedImages.current.add(imageId);
        const isPortrait = img.naturalHeight > img.naturalWidth;
        const imageType = isPortrait ? 'portrait' : 'landscape';
        setImageTypes(prev => {
            if (prev.has(imageId)) return prev;
            const newMap = new Map(prev);
            newMap.set(imageId, imageType);
            return newMap;
        });
    }, []);

    useEffect(() => {
        const isOnHomeRoute = !actualPathname || actualPathname === '/';
        if (!isOnHomeRoute) return;

        if (category === 'all') {
            const newSearchParams = new URLSearchParams(searchParams.toString());
            newSearchParams.delete('category');
            const queryString = newSearchParams.toString();
            const nextPath = queryString ? `?${queryString}` : '/';
            navigate(nextPath, { replace: true });
        }
    }, [category, searchParams, navigate, actualPathname]);

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
                    <MasonryGrid images={images} onImageClick={handleImageClick} />
                )}
                <div ref={loadMoreRef} />
                {isLoadingMore && <p className="text-center py-4">Đang tải...</p>}
            </div>
            <Suspense fallback={null}>
                {selectedImage && (
                    <ImageModal
                        image={selectedImage}
                        images={images}
                        onClose={handleCloseModal}
                        onImageSelect={handleModalImageSelect}
                        renderAsPage={false}
                        onDownload={() => { /* Download handled by ImageModal internally */ }}
                        imageTypes={imageTypes}
                        onImageLoad={handleImageLoad}
                        currentImageIds={currentImageIds.current}
                        processedImages={processedImages}
                    />
                )}
            </Suspense>
        </>
    );
};

export default ImageGrid;
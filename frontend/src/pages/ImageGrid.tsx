import { useState, useEffect, useCallback, lazy, Suspense, useRef } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import type { Image } from '../types/image';
import { imageService } from '../services/imageService';
import MasonryGrid from '../components/MasonryGrid';
import CategoryNavigation from '../components/CategoryNavigation';
import { useInfiniteScroll } from '../components/image/hooks/useInfiniteScroll';
import { Skeleton } from '@/components/ui/skeleton';
import { generateImageSlug, extractIdFromSlug } from '@/lib/utils';
import { appConfig } from '@/config/appConfig';

const ImageModal = lazy(() => import('@/components/ImageModal'));

const ImageGrid = () => {
    const [images, setImages] = useState<Image[]>([]);
    const [loading, setLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();
    const category = searchParams.get('category') || 'all';
    const [selectedImage, setSelectedImage] = useState<Image | null>(null);
    const [imageTypes, setImageTypes] = useState<Map<string, 'portrait' | 'landscape'>>(new Map());
    const processedImages = useRef<Set<string>>(new Set());
    const currentImageIds = useRef<Set<string>>(new Set());

    const handleCategoryChange = (newCategory: string) => {
        navigate('/');
        setSearchParams(prev => {
            if (newCategory === 'all' || newCategory === 'Tất cả') {
                prev.delete('category');
            } else {
                prev.set('category', newCategory);
            }
            prev.delete('photo');
            return prev;
        });
    };

    const handleImageClick = (image: Image) => {
        // Set flag to indicate navigation is from the grid
        sessionStorage.setItem(appConfig.storage.imagePageFromGridKey, 'true');
        const newSlug = generateImageSlug(image.imageTitle || '', image._id);
        // Navigate to the photo's path, preserving the grid page in the background state
        navigate(`/photos/${newSlug}`, { state: { background: location } });
    };

    const handleCloseModal = () => {
        setSelectedImage(null);
        navigate(-1); // Go back to the previous URL (the grid page)
    };

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

    useEffect(() => {
        const imageSlug = searchParams.get('image');
        if (imageSlug && images.length > 0) {
            const imageId = extractIdFromSlug(imageSlug);
            const imageFromUrl = images.find(img => img._id.endsWith(imageId));
            if (imageFromUrl) {
                setSelectedImage(imageFromUrl);
            }
        }
    }, [images, searchParams]);

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
        if (category === 'all') {
            const newSearchParams = new URLSearchParams(searchParams.toString());
            newSearchParams.delete('category');
            navigate(`?${newSearchParams.toString()}`, { replace: true });
        }
    }, [category, searchParams, navigate]);

    return (
        <>
            <div className="container mx-auto">
                <CategoryNavigation onCategoryChange={handleCategoryChange} activeCategory={category} />
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
                        onImageSelect={setSelectedImage}
                        renderAsPage={false}
                        onDownload={() => console.log('Download')}
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
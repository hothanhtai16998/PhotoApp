import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Image } from '../types/image';
import { imageService } from '../services/imageService';
import MasonryGrid from '../components/MasonryGrid';
import CategoryNavigation from '../components/CategoryNavigation';
import { useInfiniteScroll } from '../components/image/hooks/useInfiniteScroll';
import { Skeleton } from '@/components/ui/skeleton';

const UnsplashGridTestPage = () => {
    const [images, setImages] = useState<Image[]>([]);
    const [loading, setLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [searchParams] = useSearchParams();
    const category = searchParams.get('category') || 'all';

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

    return (
        <>
            <div className="container mx-auto">
                <h1 className="text-2xl font-bold text-center my-4">Grid Test</h1>
                <CategoryNavigation />
                {loading && images.length === 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
                        {Array.from({ length: 12 }).map((_, i) => (
                            <Skeleton key={i} className="w-full h-64" />
                        ))}
                    </div>
                ) : (
                    <MasonryGrid images={images} />
                )}
                <div ref={loadMoreRef} />
                {isLoadingMore && <p className="text-center py-4">Đang tải...</p>}
            </div>
        </>
    );
};

export default UnsplashGridTestPage;
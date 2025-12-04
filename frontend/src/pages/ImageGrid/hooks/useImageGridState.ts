import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Image } from '@/types/image';
import { imageService } from '@/services/imageService';
import { searchConfig } from '@/config/searchConfig';
import type { SearchFiltersType } from '@/components/SearchBar/hooks/useSearchFilters';
import { applyImageFilters } from '@/utils/imageFilters';
import type { SearchFilters, ColorFilter } from '@/components/SearchFilters';

interface UseImageGridStateProps {
    category: string;
}

export function useImageGridState({ category }: UseImageGridStateProps) {
    const [images, setImages] = useState<Image[]>([]);
    const [loading, setLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [searchParams] = useSearchParams();

    const [imageTypes, setImageTypes] = useState<Map<string, 'portrait' | 'landscape' | 'square'>>(new Map());
    const processedImages = useRef<Set<string>>(new Set());
    const currentImageIds = useRef<Set<string>>(new Set());

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

    const handleLoadMore = useCallback(() => {
        if (!loading && hasMore && !isLoadingMore) {
            const nextPage = page + 1;
            setPage(nextPage);
            fetchImages(nextPage, category, filters.color);
        }
    }, [loading, hasMore, page, category, filters.color, fetchImages, isLoadingMore]);

    // Apply filters to images (orientation, date, etc.)
    const filteredImages = useMemo(() => {
        const searchFilters: SearchFilters = {
            orientation: filters.orientation as 'all' | 'portrait' | 'landscape' | 'square',
            color: filters.color as ColorFilter,
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

    return {
        images,
        loading,
        isLoadingMore,
        hasMore,
        filteredImages,
        imageTypes,
        processedImages,
        currentImageIds,
        searchParams,
        filters,
        handleLoadMore,
        handleImageLoad,
    };
}


import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { Image } from '../types/image';
import { imageService } from '../services/imageService';
import MasonryGrid from '../components/MasonryGrid';
import CategoryNavigation from '../components/CategoryNavigation';

const UnsplashGridTestPage = () => {
    const [images, setImages] = useState<Image[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchParams] = useSearchParams();
    const category = searchParams.get('category') || 'all';

    const fetchImagesByCategory = useCallback(async (categoryName: string) => {
        setLoading(true);
        try {
            const response = await imageService.fetchImages({ 
                page: 1, 
                limit: 30,
                category: categoryName === 'all' ? undefined : categoryName,
            });
            setImages(response.images || []);
        } catch (error) {
            console.error('Failed to fetch images:', error);
            setImages([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchImagesByCategory(category);
    }, [category, fetchImagesByCategory]);

    return (
        <>
            <div className="container mx-auto">
                <h1 className="text-2xl font-bold text-center my-4">Unsplash Grid Test</h1>
                <CategoryNavigation />
                {loading ? (
                    <p className="text-center">Loading...</p>
                ) : (
                    <MasonryGrid images={images} />
                )}
            </div>
        </>
    );
};

export default UnsplashGridTestPage;
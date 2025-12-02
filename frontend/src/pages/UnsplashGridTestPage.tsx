import { useState, useEffect } from 'react';
import type { Image } from '../types/image';
import { imageService } from '../services/imageService';
import MasonryGrid from '../components/MasonryGrid';

const UnsplashGridTestPage = () => {
    const [images, setImages] = useState<Image[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInitialImages = async () => {
            setLoading(true);
            try {
                const response = await imageService.getImages({ page: 1, limit: 30 });
                setImages(response.images);
            } catch (error) {
                console.error('Failed to fetch images:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchInitialImages();
    }, []);

    return (
        <div className="container mx-auto">
            <h1 className="text-2xl font-bold text-center my-4">Unsplash Grid Test - Step 1</h1>
            {loading ? (
                <p className="text-center">Loading...</p>
            ) : (
                <MasonryGrid images={images} />
            )}
        </div>
    );
};

export default UnsplashGridTestPage;
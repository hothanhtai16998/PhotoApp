import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useImageStore } from '@/stores/useImageStore';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { Upload, TrendingUp } from 'lucide-react';
import type { Image } from '@/types/image';
import './UploadPage.css';

const uploadSchema = z.object({
    image: z.instanceof(FileList).refine(files => files?.length === 1, 'Image is required.'),
    imageTitle: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
    imageCategory: z.string().min(1, 'Category is required'),
    location: z.string().optional(),
    cameraModel: z.string().optional(),
});

type UploadFormValues = z.infer<typeof uploadSchema>;

function UploadPage() {
    const { uploadImage, loading, images, fetchImages } = useImageStore();
    const navigate = useNavigate();
    const [categoryImages, setCategoryImages] = useState<Array<{ category: string; images: Image[] }>>([]);
    const { register, handleSubmit, formState: { errors } } = useForm<UploadFormValues>({
        resolver: zodResolver(uploadSchema),
    });

    // Fetch images by category for display
    useEffect(() => {
        const categories = ['Nature', 'Portrait', 'Architecture', 'Travel', 'Street', 'Abstract'];
        
        const processCategoryImages = (allImages: Image[]) => {
            const categoryData = [];
            
            // Group images by category
            for (const category of categories) {
                const categoryImgs = allImages.filter(img => {
                    const categoryName = typeof img.imageCategory === 'string' 
                        ? img.imageCategory 
                        : img.imageCategory?.name;
                    return categoryName && categoryName.toLowerCase() === category.toLowerCase();
                }).slice(0, 4);
                
                if (categoryImgs.length >= 2) {
                    categoryData.push({ category, images: categoryImgs });
                }
            }
            
            // If we don't have enough category images, use general images and group them
            if (categoryData.length === 0 && allImages.length > 0) {
                const shuffled = [...allImages].sort(() => 0.5 - Math.random());
                // Create 3 groups from shuffled images
                for (let i = 0; i < 3 && shuffled.length >= 4; i++) {
                    categoryData.push({ 
                        category: categories[i] || 'Featured', 
                        images: shuffled.slice(i * 4, (i + 1) * 4) 
                    });
                }
            }
            
            setCategoryImages(categoryData.slice(0, 3)); // Show 3 categories
        };

        const fetchCategoryImages = async () => {
            try {
                // Fetch all images first
                await fetchImages({ limit: 50 });
            } catch (error) {
                console.error('Failed to fetch images:', error);
            }
        };

        // If we already have images, process them
        if (images.length > 0) {
            processCategoryImages(images);
        } else {
            // Otherwise fetch first
            fetchCategoryImages();
        }
    }, [images, fetchImages]);

    const onSubmit = async (data: UploadFormValues) => {
        const { image, ...rest } = data;
        await uploadImage({ image: image[0], ...rest });
        navigate('/');
    };

    return (
        <>
            <Header />
            <div className="upload-page">
                <div className="upload-container">
                    <div className="upload-left">
                        <div className="upload-icon">
                            <Upload size={32} />
                        </div>
                        <h1 className="upload-title">Start uploading</h1>
                        <p className="upload-description">
                            Share your photos with millions of people and get discovered by creators everywhere.
                        </p>
                        <p className="upload-subdescription">
                            Upload high-quality images to help others create beautiful content. Your work will be seen by designers, marketers, and creators around the world.
                        </p>
                        
                        <form onSubmit={handleSubmit(onSubmit)} className="upload-form">
                            <div className="form-group">
                                <Label htmlFor="image">Photo</Label>
                                <Input id="image" type="file" accept="image/*" {...register('image')} />
                                {errors.image && <p className="error-text">{errors.image.message}</p>}
                            </div>
                            <div className="form-group">
                                <Label htmlFor="imageTitle">Title</Label>
                                <Input id="imageTitle" {...register('imageTitle')} placeholder="Give your photo a title" />
                                {errors.imageTitle && <p className="error-text">{errors.imageTitle.message}</p>}
                            </div>
                            <div className="form-group">
                                <Label htmlFor="imageCategory">Category</Label>
                                <Input id="imageCategory" {...register('imageCategory')} placeholder="e.g., Nature, Portrait, Architecture" />
                                {errors.imageCategory && <p className="error-text">{errors.imageCategory.message}</p>}
                            </div>
                            <div className="form-group">
                                <Label htmlFor="location">Location (Optional)</Label>
                                <Input id="location" {...register('location')} placeholder="e.g., Paris, France" />
                                {errors.location && <p className="error-text">{errors.location.message}</p>}
                            </div>
                            <div className="form-group">
                                <Label htmlFor="cameraModel">Camera Model (Optional)</Label>
                                <Input id="cameraModel" {...register('cameraModel')} placeholder="e.g., Sony A7 III" />
                            </div>
                            <Button type="submit" disabled={loading} className="upload-submit-btn">
                                {loading ? 'Uploading...' : 'Start uploading'}
                            </Button>
                        </form>
                    </div>

                    <div className="upload-right">
                        <div className="category-section">
                            <div className="category-header">
                                <TrendingUp size={24} className="trend-icon" />
                                <h2 className="category-title">Popular categories</h2>
                            </div>
                            <p className="category-description">
                                These categories are in high demand. Upload photos in these areas to get more visibility.
                            </p>
                            
                            {categoryImages.length > 0 ? (
                                <div className="category-grid">
                                    {categoryImages.map((catData) => (
                                        <div key={catData.category} className="category-card">
                                            <div className="category-name">{catData.category}</div>
                                            <div className="category-images">
                                                {catData.images.map((img, idx) => (
                                                    <div key={idx} className="category-image">
                                                        <img src={img.imageUrl} alt={img.imageTitle || catData.category} />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="category-placeholder">
                                    <p>Loading category examples...</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}

export default UploadPage;
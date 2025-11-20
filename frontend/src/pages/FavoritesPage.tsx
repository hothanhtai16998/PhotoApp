import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/stores/useAuthStore";
import { favoriteService } from "@/services/favoriteService";
import Header from "@/components/Header";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart } from "lucide-react";
import type { Image } from "@/types/image";
import ImageModal from "@/components/ImageModal";
import ProgressiveImage from "@/components/ProgressiveImage";
import api from "@/lib/axios";
import { generateImageSlug, extractIdFromSlug } from "@/lib/utils";
import { toast } from "sonner";
import "./FavoritesPage.css";

function FavoritesPage() {
    const { user, accessToken } = useAuthStore();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [images, setImages] = useState<Image[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState<{
        page: number;
        limit: number;
        total: number;
        pages: number;
    } | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    
    // Track image aspect ratios (portrait vs landscape)
    const [imageTypes, setImageTypes] = useState<Map<string, 'portrait' | 'landscape'>>(new Map());
    const processedImages = useRef<Set<string>>(new Set());
    
    // Get selected image slug or ID from URL
    const imageParamFromUrl = searchParams.get('image');
    
    // Find selected image from URL (supports both slug format and legacy ID format)
    const selectedImage = useMemo(() => {
        if (!imageParamFromUrl) return null;
        
        // Check if it's a MongoDB ObjectId (24 hex characters) - legacy format
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(imageParamFromUrl);
        
        if (isObjectId) {
            // Legacy format: direct ID match
            return images.find(img => img._id === imageParamFromUrl) || null;
        } else {
            // New format: slug with short ID
            const shortId = extractIdFromSlug(imageParamFromUrl);
            if (!shortId) return null;
            
            // Find image by matching the last 12 characters of ID
            return images.find(img => {
                const imgShortId = img._id.slice(-12);
                return imgShortId === shortId;
            }) || null;
        }
    }, [imageParamFromUrl, images]);
    
    // Get current image IDs for comparison
    const currentImageIds = useMemo(() => new Set(images.map(img => img._id)), [images]);

    const fetchFavorites = useCallback(async (page = 1) => {
        if (!accessToken || !user?._id) {
            navigate('/signin');
            return;
        }

        try {
            setLoading(true);
            const response = await favoriteService.getFavorites({
                page,
                limit: 20,
            });
            setImages(response.images || []);
            setPagination(response.pagination || null);
            setCurrentPage(page);
        } catch (error) {
            console.error('Failed to fetch favorites:', error);
        } finally {
            setLoading(false);
        }
    }, [accessToken, user, navigate]);

    useEffect(() => {
        if (!accessToken || !user?._id) {
            navigate('/signin');
            return;
        }

        fetchFavorites(1);
    }, [accessToken, user, navigate, fetchFavorites]);

    // Determine image type when it loads
    const handleImageLoad = useCallback((imageId: string, img: HTMLImageElement) => {
        // Only process once per image and only if image still exists
        if (!currentImageIds.has(imageId) || processedImages.current.has(imageId)) return;

        processedImages.current.add(imageId);
        const isPortrait = img.naturalHeight > img.naturalWidth;
        const imageType = isPortrait ? 'portrait' : 'landscape';

        // Update state only if not already set (prevent unnecessary re-renders)
        setImageTypes(prev => {
            if (prev.has(imageId)) return prev;
            const newMap = new Map(prev);
            newMap.set(imageId, imageType);
            return newMap;
        });
    }, [currentImageIds]);

    // Update image in the state when stats change
    const handleImageUpdate = useCallback((updatedImage: Image) => {
        // Update the image in the images array
        setImages(prevImages => {
            const index = prevImages.findIndex(img => img._id === updatedImage._id);
            if (index !== -1) {
                const newImages = [...prevImages];
                newImages[index] = updatedImage;
                return newImages;
            }
            return prevImages;
        });
    }, []);

    // Download image function - uses backend proxy to avoid CORS issues
    const handleDownloadImage = useCallback(async (image: Image, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        try {
            if (!image._id) {
                throw new Error('Lỗi khi lấy ID của ảnh');
            }

            // Use backend endpoint to download image (proxies from S3)
            const response = await api.get(`/images/${image._id}/download`, {
                responseType: 'blob',
                withCredentials: true,
            });

            // Create blob URL from response
            const blob = new Blob([response.data], { type: response.headers['content-type'] || 'image/webp' });
            const blobUrl = URL.createObjectURL(blob);

            // Create download link
            const link = document.createElement('a');
            link.href = blobUrl;

            // Get filename from Content-Disposition header or use default
            const contentDisposition = response.headers['content-disposition'];
            let fileName = 'photo.webp';
            if (contentDisposition) {
                const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
                if (fileNameMatch) {
                    fileName = fileNameMatch[1];
                }
            } else {
                // Fallback: generate filename from image title
                const sanitizedTitle = (image.imageTitle || 'photo').replace(/[^a-z0-9]/gi, '_').toLowerCase();
                const urlExtension = image.imageUrl?.match(/\.([a-z]+)(?:\?|$)/i)?.[1] || 'webp';
                fileName = `${sanitizedTitle}.${urlExtension}`;
            }
            link.download = fileName;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Clean up the blob URL after a short delay
            setTimeout(() => {
                URL.revokeObjectURL(blobUrl);
            }, 100);

            toast.success('Tải ảnh thành công');
        } catch (error) {
            console.error('Tải ảnh thất bại:', error);
            toast.error('Tải ảnh thất bại. Vui lòng thử lại.');

            // Fallback: try opening in new tab if download fails
            try {
                if (image.imageUrl) {
                    window.open(image.imageUrl, '_blank');
                }
            } catch (fallbackError) {
                console.error('Lỗi fallback khi tải ảnh:', fallbackError);
            }
        }
    }, []);

    // Loading skeleton
    const FavoritesSkeleton = () => (
        <div className="favorites-grid" aria-label="Đang tải ảnh yêu thích" aria-live="polite">
            {Array.from({ length: 12 }).map((_, index) => (
                <div
                    key={`skeleton-${index}`}
                    className={`favorites-item ${index % 3 === 0 ? 'portrait' : 'landscape'}`}
                >
                    <Skeleton className="w-full h-full min-h-[200px] rounded-lg" />
                </div>
            ))}
        </div>
    );

    if (!user || !accessToken) {
        return null;
    }

    return (
        <>
            <Header />
            <main className="favorites-page">
                <div className="favorites-container">
                    {/* Page Header */}
                    <div className="favorites-header">
                        <div className="favorites-header-icon">
                            <Heart size={32} fill="currentColor" className="favorite-icon-filled" />
                        </div>
                        <div className="favorites-header-info">
                            <h1 className="favorites-title">Ảnh yêu thích</h1>
                            <p className="favorites-subtitle">
                                {pagination?.total 
                                    ? `${pagination.total} ảnh đã lưu`
                                    : 'Chưa có ảnh yêu thích nào'}
                            </p>
                        </div>
                    </div>

                    {/* Favorites Grid */}
                    {loading && images.length === 0 ? (
                        <FavoritesSkeleton />
                    ) : images.length === 0 ? (
                        <div className="favorites-empty" role="status" aria-live="polite">
                            <Heart size={64} className="empty-icon" />
                            <h2>Chưa có ảnh yêu thích</h2>
                            <p>Bắt đầu lưu những ảnh bạn yêu thích để xem lại sau</p>
                            <button 
                                className="browse-button"
                                onClick={() => navigate('/')}
                            >
                                Khám phá ảnh
                            </button>
                        </div>
                    ) : (
                        <div className="favorites-grid" role="list" aria-label="Danh sách ảnh yêu thích">
                            {images.map((image) => {
                                const imageType = imageTypes.get(image._id) || 'landscape';
                                return (
                                    <div
                                        key={image._id}
                                        className={`favorites-item ${imageType}`}
                                        role="listitem"
                                        aria-label={`Ảnh yêu thích: ${image.imageTitle || 'Không có tiêu đề'}`}
                                        onClick={() => {
                                            // Update URL when image is selected with slug
                                            const slug = generateImageSlug(image.imageTitle, image._id);
                                            setSearchParams(prev => {
                                                const newParams = new URLSearchParams(prev);
                                                newParams.set('image', slug);
                                                return newParams;
                                            });
                                        }}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <ProgressiveImage
                                            src={image.imageUrl}
                                            thumbnailUrl={image.thumbnailUrl}
                                            smallUrl={image.smallUrl}
                                            regularUrl={image.regularUrl}
                                            alt={image.imageTitle || 'Photo'}
                                            onLoad={(img) => {
                                                if (!processedImages.current.has(image._id) && currentImageIds.has(image._id)) {
                                                    handleImageLoad(image._id, img);
                                                }
                                            }}
                                        />
                                        <div className="favorites-overlay">
                                            <div className="favorites-info">
                                                <h3 className="favorites-image-title">
                                                    {image.imageTitle || 'Untitled'}
                                                </h3>
                                                {image.uploadedBy && (
                                                    <p className="favorites-image-author">
                                                        {image.uploadedBy.displayName || image.uploadedBy.username}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Pagination */}
                    {pagination && pagination.pages > 1 && (
                        <div className="favorites-pagination">
                            <button
                                className="pagination-btn"
                                onClick={() => fetchFavorites(currentPage - 1)}
                                disabled={currentPage === 1}
                                aria-label="Trang trước"
                            >
                                Trước
                            </button>
                            <span className="pagination-info">
                                Trang {currentPage} / {pagination.pages}
                            </span>
                            <button
                                className="pagination-btn"
                                onClick={() => fetchFavorites(currentPage + 1)}
                                disabled={currentPage >= pagination.pages}
                                aria-label="Trang sau"
                            >
                                Sau
                            </button>
                        </div>
                    )}
                </div>
            </main>

            {/* Image Modal */}
            {selectedImage && (
                <ImageModal
                    image={selectedImage}
                    images={images}
                    onClose={() => {
                        // Remove image param from URL when closing
                        setSearchParams(prev => {
                            const newParams = new URLSearchParams(prev);
                            newParams.delete('image');
                            return newParams;
                        });
                    }}
                    onImageSelect={(updatedImage) => {
                        handleImageUpdate(updatedImage);
                        // Update URL to reflect the selected image with slug
                        const slug = generateImageSlug(updatedImage.imageTitle, updatedImage._id);
                        setSearchParams(prev => {
                            const newParams = new URLSearchParams(prev);
                            newParams.set('image', slug);
                            return newParams;
                        });
                    }}
                    onDownload={handleDownloadImage}
                    imageTypes={imageTypes}
                    onImageLoad={handleImageLoad}
                    currentImageIds={currentImageIds}
                    processedImages={processedImages}
                />
            )}
        </>
    );
}

export default FavoritesPage;


import { useEffect, useCallback, useMemo, useRef, lazy, Suspense } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/stores/useAuthStore";
import { useUserStore } from "@/stores/useUserStore";
import { useFavoriteStore } from "@/stores/useFavoriteStore";
import { useIsMobile } from "@/hooks/useIsMobile";
import Header from "@/components/Header";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart } from "lucide-react";
import type { Image } from "@/types/image";
import ProgressiveImage from "@/components/ProgressiveImage";
import { generateImageSlug, extractIdFromSlug } from "@/lib/utils";
import { toast } from "sonner";
import { appConfig } from "@/config/appConfig";
import { uiConfig } from "@/config/uiConfig";
import { downloadImage } from "@/utils/downloadService";
import "./FavoritesPage.css";

// Lazy load ImageModal - conditionally rendered
const ImageModal = lazy(() => import("@/components/ImageModal"));

function FavoritesPage() {
    const { accessToken } = useAuthStore();
    const { user } = useUserStore();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // Favorite store
    const {
        images,
        loading,
        pagination,
        currentPage,
        imageTypes,
        fetchFavorites,
        setImageType,
        updateImage,
    } = useFavoriteStore();

    // Detect if we're on mobile
    const isMobile = useIsMobile();

    const processedImages = useRef<Set<string>>(new Set());

    // Get selected image slug or ID from URL
    const imageParamFromUrl = searchParams.get('image');

    // MOBILE ONLY: If URL has ?image=slug on mobile, redirect to ImagePage
    useEffect(() => {
        if (imageParamFromUrl && isMobile) {
            // Set flag to indicate we're opening from grid
            sessionStorage.setItem(appConfig.storage.imagePageFromGridKey, 'true');
            // Navigate to ImagePage with images state
            navigate(`/photos/${imageParamFromUrl}`, {
                state: {
                    images,
                    fromGrid: true
                },
                replace: true // Replace current URL to avoid back button issues
            });
            // Clear the image param from current URL
            setSearchParams(prev => {
                const newParams = new URLSearchParams(prev);
                newParams.delete('image');
                return newParams;
            });
        }
    }, [imageParamFromUrl, isMobile, navigate, images, setSearchParams]);

    // Find selected image from URL (supports both slug format and legacy ID format) - DESKTOP ONLY
    const selectedImage = useMemo(() => {
        // Don't show modal on mobile
        if (isMobile) return null;
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
    }, [imageParamFromUrl, images, isMobile]);

    // Get current image IDs for comparison
    const currentImageIds = useMemo(() => new Set(images.map(img => img._id)), [images]);

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
        setImageType(imageId, imageType);
    }, [currentImageIds, setImageType]);

    // Update image in the state when stats change
    const handleImageUpdate = useCallback((updatedImage: Image) => {
        updateImage(updatedImage._id, updatedImage);
    }, [updateImage]);

    // Download image function - uses shared download service
    const handleDownloadImage = useCallback(async (image: Image, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        try {
            await downloadImage(image);
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
            {Array.from({ length: uiConfig.skeleton.imageGridCount }).map((_, index) => (
                <div
                    key={`skeleton-${index}`}
                    className={`favorites-item ${index % 3 === 0 ? 'portrait' : 'landscape'}`}
                >
                    <Skeleton className="w-full h-full min-h-[200px] rounded-lg" />
                </div>
            ))}
        </div>
    );

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
                                            // MOBILE ONLY: Navigate to ImagePage instead of opening modal
                                            if (isMobile) {
                                                // Set flag to indicate we're opening from grid
                                                sessionStorage.setItem(appConfig.storage.imagePageFromGridKey, 'true');
                                                // Pass images via state for navigation
                                                const slug = generateImageSlug(image.imageTitle || 'Untitled', image._id);
                                                navigate(`/photos/${slug}`, {
                                                    state: {
                                                        images,
                                                        fromGrid: true
                                                    }
                                                });
                                                return;
                                            }

                                            // DESKTOP: Use modal (existing behavior)
                                            // Update URL when image is selected with slug
                                            const slug = generateImageSlug(image.imageTitle || 'Untitled', image._id);
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

            {/* Image Modal - DESKTOP ONLY */}
            {/* On mobile, we navigate to ImagePage instead */}
            {selectedImage && !isMobile && window.innerWidth > appConfig.mobileBreakpoint && (
                <Suspense fallback={null}>
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
                        const slug = generateImageSlug(updatedImage.imageTitle || 'Untitled', updatedImage._id);
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
                </Suspense>
            )}
        </>
    );
}

export default FavoritesPage;


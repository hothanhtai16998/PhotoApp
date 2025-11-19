import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/useAuthStore";
import { favoriteService } from "@/services/favoriteService";
import Header from "@/components/Header";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart } from "lucide-react";
import type { Image } from "@/types/image";
import "./FavoritesPage.css";

function FavoritesPage() {
    const { user, accessToken } = useAuthStore();
    const navigate = useNavigate();
    const [images, setImages] = useState<Image[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState<{
        page: number;
        limit: number;
        total: number;
        pages: number;
    } | null>(null);
    const [currentPage, setCurrentPage] = useState(1);

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
                            {images.map((image) => (
                                <div
                                    key={image._id}
                                    className="favorites-item"
                                    role="listitem"
                                    aria-label={`Ảnh yêu thích: ${image.imageTitle || 'Không có tiêu đề'}`}
                                    onClick={() => {
                                        // Open image in modal (would need to integrate with ImageModal)
                                        navigate(`/?image=${image._id}`);
                                    }}
                                >
                                    <img
                                        src={image.imageUrl}
                                        alt={image.imageTitle || 'Photo'}
                                        className="favorites-image"
                                        loading="lazy"
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
                            ))}
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
        </>
    );
}

export default FavoritesPage;


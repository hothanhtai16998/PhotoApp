import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/useAuthStore";
import { imageService } from "@/services/imageService";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Edit2, Star, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { Image } from "@/types/image";
import "./ProfilePage.css";

type TabType = 'photos' | 'illustrations' | 'collections' | 'stats';

function ProfilePage() {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<TabType>('photos');
    const [images, setImages] = useState<Image[]>([]);
    const [loading, setLoading] = useState(true);
    const [photosCount, setPhotosCount] = useState(0);
    const [illustrationsCount, setIllustrationsCount] = useState(0);
    const [collectionsCount] = useState(1); // Placeholder

    const fetchUserImages = useCallback(async (refresh = false) => {
        if (!user?._id) return;

        try {
            setLoading(true);
            const response = await imageService.fetchUserImages(user._id, refresh ? { _refresh: true } : undefined);
            const userImages = response.images || [];
            setImages(userImages);

            // Count photos and illustrations
            const photos = userImages.filter(img => {
                const categoryName = typeof img.imageCategory === 'string' 
                    ? img.imageCategory 
                    : img.imageCategory?.name;
                return categoryName &&
                    !categoryName.toLowerCase().includes('illustration') &&
                    !categoryName.toLowerCase().includes('svg');
            });
            const illustrations = userImages.filter(img => {
                const categoryName = typeof img.imageCategory === 'string' 
                    ? img.imageCategory 
                    : img.imageCategory?.name;
                return categoryName &&
                    (categoryName.toLowerCase().includes('illustration') ||
                        categoryName.toLowerCase().includes('svg'));
            });

            setPhotosCount(photos.length);
            setIllustrationsCount(illustrations.length);
        } catch (error) {
            console.error('Failed to fetch user images:', error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (!user?._id) {
            navigate('/signin');
            return;
        }

        fetchUserImages();
    }, [user, navigate, fetchUserImages]);

    // Listen for refresh event after image upload
    useEffect(() => {
        const handleRefresh = () => {
            // Force fresh fetch with cache-busting
            // Use a small delay to ensure backend has processed the new image
            setTimeout(() => {
                fetchUserImages(true); // Pass true to enable cache-busting
            }, 500);
        };

        window.addEventListener('refreshProfile', handleRefresh);
        return () => {
            window.removeEventListener('refreshProfile', handleRefresh);
        };
    }, [fetchUserImages]);

    const handleEditProfile = () => {
        navigate('/profile/edit');
    };

    const handleEditPins = () => {
        // Feature coming soon - allows users to pin favorite images to their profile
        toast.info('Edit pins feature is coming soon! This will allow you to showcase your favorite images on your profile.');
    };

    const handleUpdateAvailability = () => {
        // Feature coming soon - allows users to indicate if they're available for hire
        toast.info('Availability update feature is coming soon! You\'ll be able to indicate if you\'re available for photography work.');
    };

    if (!user) {
        return null;
    }

    const displayImages = activeTab === 'photos'
        ? images.filter(img => {
            const categoryName = typeof img.imageCategory === 'string' 
                ? img.imageCategory 
                : img.imageCategory?.name;
            return categoryName &&
                !categoryName.toLowerCase().includes('illustration') &&
                !categoryName.toLowerCase().includes('svg');
        })
        : activeTab === 'illustrations'
            ? images.filter(img => {
                const categoryName = typeof img.imageCategory === 'string' 
                    ? img.imageCategory 
                    : img.imageCategory?.name;
                return categoryName &&
                    (categoryName.toLowerCase().includes('illustration') ||
                        categoryName.toLowerCase().includes('svg'));
            })
            : [];

    return (
        <>
            <Header />
            <main className="profile-page">
                <div className="profile-container">
                    {/* Profile Header */}
                    <div className="profile-header">
                        <div className="profile-avatar-container">
                            {user.avatarUrl ? (
                                <img
                                    src={user.avatarUrl}
                                    alt={user.displayName || user.username}
                                    className="profile-avatar"
                                />
                            ) : (
                                <div className="profile-avatar-placeholder">
                                    {(user.displayName || user.username)?.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>
                        <div className="profile-info">
                            <div className="profile-name-section">
                                <h1 className="profile-name">{user.displayName || user.username}</h1>
                                <div className="profile-actions">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleEditProfile}
                                        className="edit-profile-btn"
                                    >
                                        <Edit2 size={16} />
                                        Edit profile
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleEditPins}
                                        className="edit-pins-btn"
                                    >
                                        <Star size={16} />
                                        Edit pins
                                    </Button>
                                </div>
                            </div>
                            <p className="profile-description">
                                Download free, beautiful high-quality photos curated by {user.displayName || user.username}.
                            </p>
                            <div className="profile-availability">
                                <XCircle size={16} />
                                <span>Not available for hire</span>
                                <button
                                    className="availability-update-link"
                                    onClick={handleUpdateAvailability}
                                >
                                    Update
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="profile-tabs">
                        <button
                            className={`profile-tab ${activeTab === 'photos' ? 'active' : ''}`}
                            onClick={() => setActiveTab('photos')}
                        >
                            <span className="tab-icon">📷</span>
                            <span className="tab-label">Photos</span>
                            <span className="tab-count">{photosCount}</span>
                        </button>
                        <button
                            className={`profile-tab ${activeTab === 'illustrations' ? 'active' : ''}`}
                            onClick={() => setActiveTab('illustrations')}
                        >
                            <span className="tab-icon">✏️</span>
                            <span className="tab-label">Illustrations</span>
                            <span className="tab-count">{illustrationsCount}</span>
                        </button>
                        <button
                            className={`profile-tab ${activeTab === 'collections' ? 'active' : ''}`}
                            onClick={() => setActiveTab('collections')}
                        >
                            <span className="tab-icon">📁</span>
                            <span className="tab-label">Collections</span>
                            <span className="tab-count">{collectionsCount}</span>
                        </button>
                        <button
                            className={`profile-tab ${activeTab === 'stats' ? 'active' : ''}`}
                            onClick={() => setActiveTab('stats')}
                        >
                            <span className="tab-icon">📊</span>
                            <span className="tab-label">Stats</span>
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="profile-content">
                        {activeTab === 'photos' || activeTab === 'illustrations' ? (
                            loading ? (
                                <div className="loading-state">
                                    <p>Loading images...</p>
                                </div>
                            ) : displayImages.length === 0 ? (
                                <div className="empty-state">
                                    <p>No {activeTab} yet.</p>
                                </div>
                            ) : (
                                <div className="profile-image-grid">
                                    {displayImages.map((image) => (
                                        <div key={image._id} className="profile-image-item">
                                            <img
                                                src={image.imageUrl}
                                                alt={image.imageTitle || 'Photo'}
                                                className="profile-image"
                                                loading="lazy"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )
                        ) : activeTab === 'collections' ? (
                            <div className="coming-soon">
                                <h2>Collections</h2>
                                <p>This section is coming soon.</p>
                            </div>
                        ) : (
                            <div className="coming-soon">
                                <h2>Stats</h2>
                                <p>This section is coming soon.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </>
    );
}

export default ProfilePage;

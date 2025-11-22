import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuthStore } from "@/stores/useAuthStore";
import { imageService } from "@/services/imageService";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Edit2, Star, XCircle } from "lucide-react";
import { toast } from "sonner";
import type { Image } from "@/types/image";
import ImageModal from "@/components/ImageModal";
import ProgressiveImage from "@/components/ProgressiveImage";
import { Avatar } from "@/components/Avatar";
import api from "@/lib/axios";
import { generateImageSlug, extractIdFromSlug } from "@/lib/utils";
import { collectionService } from "@/services/collectionService";
import type { Collection } from "@/types/collection";
import { Folder, Edit2 as EditIcon, Trash2, Eye } from "lucide-react";
import "./ProfilePage.css";

type TabType = 'photos' | 'illustrations' | 'collections' | 'stats';

function ProfilePage() {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [activeTab, setActiveTab] = useState<TabType>('photos');
    const [images, setImages] = useState<Image[]>([]);
    const [loading, setLoading] = useState(true);
    const [photosCount, setPhotosCount] = useState(0);
    const [illustrationsCount, setIllustrationsCount] = useState(0);
    const [collections, setCollections] = useState<Collection[]>([]);
    const [collectionsLoading, setCollectionsLoading] = useState(false);
    const [collectionsCount, setCollectionsCount] = useState(0);
    
    // Track image aspect ratios (portrait vs landscape)
    const [imageTypes, setImageTypes] = useState<Map<string, 'portrait' | 'landscape'>>(new Map());
    const processedImages = useRef<Set<string>>(new Set());

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

    const fetchCollections = useCallback(async () => {
        if (!user?._id) return;

        try {
            setCollectionsLoading(true);
            const data = await collectionService.getUserCollections();
            setCollections(data);
            setCollectionsCount(data.length);
        } catch (error) {
            console.error('Failed to fetch collections:', error);
        } finally {
            setCollectionsLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (!user?._id) {
            navigate('/signin');
            return;
        }

        fetchUserImages();
        fetchCollections();
    }, [user, navigate, fetchUserImages, fetchCollections]);

    // Listen for refresh event after image upload
    useEffect(() => {
        const handleRefresh = () => {
            // Force fresh fetch with cache-busting
            // Use a small delay to ensure backend has processed the new image
            setTimeout(() => {
                fetchUserImages(true); // Pass true to enable cache-busting
                fetchCollections(); // Also refresh collections
            }, 500);
        };

        window.addEventListener('refreshProfile', handleRefresh);
        return () => {
            window.removeEventListener('refreshProfile', handleRefresh);
        };
    }, [fetchUserImages, fetchCollections]);

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

    // Calculate display images based on active tab
    const displayImages = useMemo(() => {
        if (activeTab === 'photos') {
            return images.filter(img => {
                const categoryName = typeof img.imageCategory === 'string' 
                    ? img.imageCategory 
                    : img.imageCategory?.name;
                return categoryName &&
                    !categoryName.toLowerCase().includes('illustration') &&
                    !categoryName.toLowerCase().includes('svg');
            });
        } else if (activeTab === 'illustrations') {
            return images.filter(img => {
                const categoryName = typeof img.imageCategory === 'string' 
                    ? img.imageCategory 
                    : img.imageCategory?.name;
                return categoryName &&
                    (categoryName.toLowerCase().includes('illustration') ||
                        categoryName.toLowerCase().includes('svg'));
            });
        }
        return [];
    }, [activeTab, images]);

    // Get selected image slug or ID from URL
    const imageParamFromUrl = searchParams.get('image');
    
    // Find selected image from URL (supports both slug format and legacy ID format)
    const selectedImage = useMemo(() => {
        if (!imageParamFromUrl) return null;
        
        // Check if it's a MongoDB ObjectId (24 hex characters) - legacy format
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(imageParamFromUrl);
        
        if (isObjectId) {
            // Legacy format: direct ID match
            return displayImages.find(img => img._id === imageParamFromUrl) || null;
        } else {
            // New format: slug with short ID
            const shortId = extractIdFromSlug(imageParamFromUrl);
            if (!shortId) return null;
            
            // Find image by matching the last 12 characters of ID
            return displayImages.find(img => {
                const imgShortId = img._id.slice(-12);
                return imgShortId === shortId;
            }) || null;
        }
    }, [imageParamFromUrl, displayImages]);

    // Get current image IDs for comparison
    const currentImageIds = useMemo(() => new Set(displayImages.map(img => img._id)), [displayImages]);

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

    if (!user) {
        return null;
    }

    return (
        <>
            <Header />
            <main className="profile-page">
                <div className="profile-container">
                    {/* Profile Header */}
                    <div className="profile-header">
                        <div className="profile-avatar-container">
                            <Avatar
                                user={user}
                                size={120}
                                className="profile-avatar"
                                fallbackClassName="profile-avatar-placeholder"
                            />
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
                                <div className="profile-image-grid" aria-label="Đang tải ảnh" aria-live="polite">
                                    {Array.from({ length: 12 }).map((_, index) => (
                                        <div
                                            key={`skeleton-${index}`}
                                            className={`profile-image-item ${index % 3 === 0 ? 'portrait' : 'landscape'}`}
                                        >
                                            <Skeleton className="w-full h-full min-h-[200px] rounded-lg" />
                                        </div>
                                    ))}
                                </div>
                            ) : displayImages.length === 0 ? (
                                <div className="empty-state" role="status" aria-live="polite">
                                    <p>Chưa có {activeTab === 'photos' ? 'ảnh' : 'minh họa'} nào.</p>
                                    <Button
                                        variant="outline"
                                        onClick={() => navigate('/upload')}
                                        className="mt-4"
                                    >
                                        Tải ảnh lên
                                    </Button>
                                </div>
                            ) : (
                                <div className="profile-image-grid">
                                    {displayImages.map((image) => {
                                        const imageType = imageTypes.get(image._id) || 'landscape';
                                        return (
                                            <div
                                                key={image._id}
                                                className={`profile-image-item ${imageType}`}
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
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                        ) : activeTab === 'collections' ? (
                            collectionsLoading ? (
                                <div className="profile-collections-grid" aria-label="Đang tải bộ sưu tập" aria-live="polite">
                                    {Array.from({ length: 6 }).map((_, index) => (
                                        <div key={`skeleton-${index}`} className="profile-collection-item">
                                            <Skeleton className="w-full h-48 rounded-lg mb-3" />
                                            <Skeleton className="w-3/4 h-4 rounded" />
                                        </div>
                                    ))}
                                </div>
                            ) : collections.length === 0 ? (
                                <div className="empty-state" role="status" aria-live="polite">
                                    <p>Chưa có bộ sưu tập nào.</p>
                                    <Button
                                        variant="outline"
                                        onClick={() => navigate('/')}
                                        className="mt-4"
                                    >
                                        Khám phá ảnh để tạo bộ sưu tập
                                    </Button>
                                </div>
                            ) : (
                                <div className="profile-collections-grid">
                                    {collections.map((collection) => {
                                        const coverImage =
                                            collection.coverImage &&
                                            typeof collection.coverImage === 'object'
                                                ? collection.coverImage
                                                : null;

                                        return (
                                            <div
                                                key={collection._id}
                                                className="profile-collection-item"
                                                onClick={() => navigate(`/collections/${collection._id}`)}
                                            >
                                                <div className="profile-collection-cover">
                                                    {coverImage ? (
                                                        <ProgressiveImage
                                                            src={coverImage.imageUrl}
                                                            thumbnailUrl={coverImage.thumbnailUrl}
                                                            smallUrl={coverImage.smallUrl}
                                                            regularUrl={coverImage.regularUrl}
                                                            alt={collection.name}
                                                        />
                                                    ) : (
                                                        <div className="profile-collection-placeholder">
                                                            <Folder size={48} />
                                                        </div>
                                                    )}
                                                    <div className="profile-collection-overlay">
                                                        <div className="profile-collection-actions">
                                                            <button
                                                                className="profile-collection-action-btn"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    navigate(`/collections/${collection._id}`);
                                                                }}
                                                                title="Xem bộ sưu tập"
                                                            >
                                                                <Eye size={18} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="profile-collection-info">
                                                    <h3>{collection.name}</h3>
                                                    {collection.description && (
                                                        <p className="profile-collection-description">
                                                            {collection.description}
                                                        </p>
                                                    )}
                                                    <div className="profile-collection-meta">
                                                        <span>{collection.imageCount || 0} ảnh</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                        ) : (
                            <div className="coming-soon">
                                <h2>Stats</h2>
                                <p>This section is coming soon.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* Image Modal */}
            {selectedImage && (
                <ImageModal
                    image={selectedImage}
                    images={displayImages}
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

export default ProfilePage;

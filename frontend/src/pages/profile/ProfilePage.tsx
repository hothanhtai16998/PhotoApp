import { useEffect, useState, useCallback, useMemo, useRef, lazy, Suspense } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { useAuthStore } from "@/stores/useAuthStore";
import { useUserStore } from "@/stores/useUserStore";
import { useProfileStore } from "@/stores/useProfileStore";
import { useUserImageStore } from "@/stores/useUserImageStore";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Image } from "@/types/image";
import ImageModal from "@/components/ImageModal";
import ProgressiveImage from "@/components/ProgressiveImage";
import api from "@/lib/axios";
import axios from "axios";
import { generateImageSlug, extractIdFromSlug } from "@/lib/utils";
import { Folder, Eye } from "lucide-react";
// Lazy load analytics dashboard - only needed when stats tab is active
const UserAnalyticsDashboard = lazy(() => import("./components/UserAnalyticsDashboard").then(module => ({ default: module.UserAnalyticsDashboard })));
import { userStatsService } from "@/services/userStatsService";
import { ProfileHeader } from "./components/ProfileHeader";
import { ProfileTabs } from "./components/ProfileTabs";
import { useRequestCancellationOnChange } from "@/hooks/useRequestCancellation";
import { toast } from "sonner";
import "./ProfilePage.css";

type TabType = 'photos' | 'illustrations' | 'collections' | 'stats';

function ProfilePage() {
    const { user: currentUser } = useUserStore();
    const navigate = useNavigate();
    const params = useParams<{ username?: string; userId?: string }>();
    const [searchParams, setSearchParams] = useSearchParams();
    
    // Profile store
    const {
        profileUser,
        profileUserLoading,
        followStats,
        userStats,
        collections,
        collectionsLoading,
        collectionsCount,
        fetchProfileUser,
        fetchFollowStats,
        fetchUserStats,
        fetchCollections,
        clearProfile,
    } = useProfileStore();

    // User image store
    const {
        images,
        loading,
        photosCount,
        illustrationsCount,
        imageTypes,
        fetchUserImages,
        setImageType,
        updateImage,
        clearImages,
    } = useUserImageStore();

    // Detect if we're on mobile - MOBILE ONLY check
    const [isMobile, setIsMobile] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.innerWidth <= 768;
    });

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const [activeTab, setActiveTab] = useState<TabType>('photos');
    const [isSwitchingProfile, setIsSwitchingProfile] = useState(false);
    // Track which user ID the current stats belong to
    const statsUserIdRef = useRef<string | undefined>(undefined);
    const processedImages = useRef<Set<string>>(new Set());
    const previousParams = useRef<string>('');

    // Cancel user lookup when params change
    const userLookupCancelSignal = useRequestCancellationOnChange([params.username, params.userId]);

    // Fetch profile user data if viewing someone else's profile
    useEffect(() => {
        const loadProfileUser = async () => {
            try {
                await fetchProfileUser(params.username, params.userId, userLookupCancelSignal);
            } catch (error) {
                // Error already handled in store, navigate away
                navigate('/');
            }
        };

        loadProfileUser();
    }, [params.username, params.userId, navigate, userLookupCancelSignal, fetchProfileUser]);

    // Determine which user's profile to display
    const displayUserId = useMemo(() => {
        if (params.userId) return params.userId;
        if (params.username && profileUser) return profileUser._id;
        return currentUser?._id;
    }, [params.userId, params.username, profileUser, currentUser?._id]);

    const isOwnProfile = useMemo(() => {
        return displayUserId === currentUser?._id;
    }, [displayUserId, currentUser?._id]);

    // Reset all state immediately when params change to prevent flashing old data
    useEffect(() => {
        // Create a unique key from params to detect changes
        const paramsKey = `${params.username || ''}-${params.userId || ''}`;

        // Only reset if params actually changed (not on initial mount)
        if (previousParams.current && previousParams.current !== paramsKey) {
            // Mark that we're switching profiles
            setIsSwitchingProfile(true);

            // Clear the stats user ID ref so old data won't be shown
            statsUserIdRef.current = undefined;

            // Clear all profile-related state immediately when switching users
            clearProfile();
            clearImages();
            processedImages.current.clear();
        }

        // Update the ref for next comparison (on initial mount, this will be set)
        if (!previousParams.current || previousParams.current !== paramsKey) {
            previousParams.current = paramsKey;
        }
    }, [params.username, params.userId, clearProfile, clearImages]);

    // Wrapper to handle race condition checks
    const fetchUserImagesWrapper = useCallback(async (refresh = false, signal?: AbortSignal) => {
        if (!displayUserId) return;
        const currentUserId = displayUserId; // Capture at start of fetch

        try {
            await fetchUserImages(displayUserId, refresh, signal);
            // Update ref to track which user this data belongs to
            if (displayUserId === currentUserId && !statsUserIdRef.current) {
                statsUserIdRef.current = displayUserId;
            }
        } catch (error) {
            // Error already handled in store
        }
    }, [displayUserId, fetchUserImages]);

    // Wrapper to handle race condition checks and own profile check
    const fetchCollectionsWrapper = useCallback(async (signal?: AbortSignal) => {
        if (!displayUserId) return;
        const currentUserId = displayUserId; // Capture at start of fetch

        // For now, only fetch own collections. TODO: Add endpoint to fetch other users' collections
        if (!isOwnProfile) {
            return;
        }

        try {
            await fetchCollections(displayUserId, signal);
            // Update ref to track which user this data belongs to
            if (displayUserId === currentUserId && !statsUserIdRef.current) {
                statsUserIdRef.current = displayUserId;
            }
        } catch (error) {
            // Error already handled in store
        }
    }, [displayUserId, isOwnProfile, fetchCollections]);

    // Wrapper to handle race condition checks
    const fetchFollowStatsWrapper = useCallback(async (signal?: AbortSignal) => {
        if (!displayUserId) return;
        const currentUserId = displayUserId; // Capture at start of fetch

        try {
            await fetchFollowStats(displayUserId, signal);
            // Update ref to track which user this data belongs to
            if (displayUserId === currentUserId && !statsUserIdRef.current) {
                statsUserIdRef.current = displayUserId;
            }
        } catch (error) {
            // Error already handled in store
        }
    }, [displayUserId, fetchFollowStats]);

    // Wrapper to handle race condition checks
    const fetchUserStatsWrapper = useCallback(async (signal?: AbortSignal) => {
        if (!displayUserId) return;
        const currentUserId = displayUserId; // Capture at start of fetch

        try {
            await fetchUserStats(displayUserId, signal);
            // Only update if we're still on the same user
            if (displayUserId === currentUserId) {
                statsUserIdRef.current = displayUserId;
                // Mark that we're done switching once stats are loaded
                setIsSwitchingProfile(false);
            }
        } catch (error) {
            // Error already handled in store
            if (displayUserId === currentUserId) {
                setIsSwitchingProfile(false);
            }
        }
    }, [displayUserId, fetchUserStats]);

    // Track profile view when component mounts (only once per session)
    useEffect(() => {
        if (!displayUserId || !currentUser?._id) return;

        // Only track views for other users' profiles
        if (!isOwnProfile) {
            const hasTrackedView = sessionStorage.getItem(`profile_view_${displayUserId}_${currentUser._id}`);
            if (!hasTrackedView) {
                userStatsService.trackProfileView(displayUserId).catch(err => {
                    console.error('Failed to track profile view:', err);
                    // Don't show error to user - this is background tracking
                });
                sessionStorage.setItem(`profile_view_${displayUserId}_${currentUser._id}`, 'true');
            }
        }
    }, [displayUserId, currentUser?._id, isOwnProfile]);

    // Cancel requests when displayUserId changes
    const cancelSignal = useRequestCancellationOnChange([displayUserId]);

    useEffect(() => {
        // Require authentication for viewing profiles
        if (!currentUser?._id) {
            navigate('/signin');
            return;
        }

        if (!displayUserId) return;

        // Show loading state immediately (optimistic loading)
        setLoading(true);

        // Only fetch essential data on initial load (images and follow stats for header)
        // Collections and stats will be lazy-loaded when their tabs are clicked
        Promise.all([
            fetchUserImagesWrapper(false, cancelSignal),
            fetchFollowStatsWrapper(cancelSignal),
        ]).catch((error) => {
            // Ignore cancellation errors - these are expected when navigating away
            const isCanceled = axios.isCancel(error) || (error as { code?: string })?.code === 'ERR_CANCELED';
            if (!isCanceled) {
                console.error('Error fetching profile data:', error);
            }
        });
    }, [displayUserId, currentUser, navigate, fetchUserImagesWrapper, fetchFollowStatsWrapper, cancelSignal]);

    // Lazy-load collections only when collections tab is active
    useEffect(() => {
        if (activeTab === 'collections' && !collectionsLoading && collections.length === 0 && displayUserId) {
            fetchCollectionsWrapper(cancelSignal);
        }
    }, [activeTab, displayUserId, fetchCollectionsWrapper, cancelSignal, collectionsLoading, collections.length]);

    // Lazy-load stats only when stats tab is active
    useEffect(() => {
        if (activeTab === 'stats' && !userStats && displayUserId) {
            fetchUserStatsWrapper(cancelSignal);
        }
    }, [activeTab, displayUserId, fetchUserStatsWrapper, cancelSignal, userStats]);

    // Listen for refresh event after image upload
    useEffect(() => {
        const handleRefresh = () => {
            // Force fresh fetch with cache-busting
            // Use a small delay to ensure backend has processed the new image
            // Don't use cancelSignal for refresh - this is a manual refresh action
            setTimeout(() => {
                fetchUserImagesWrapper(true); // Pass true to enable cache-busting, no signal for manual refresh
                if (isOwnProfile) {
                    fetchCollectionsWrapper(); // Also refresh collections, no signal for manual refresh
                }
            }, 500);
        };

        window.addEventListener('refreshProfile', handleRefresh);
        return () => {
            window.removeEventListener('refreshProfile', handleRefresh);
        };
    }, [fetchUserImagesWrapper, fetchCollectionsWrapper, isOwnProfile]);

    const handleEditProfile = () => {
        navigate('/profile/edit');
    };

    const handleEditPins = () => {
        // Feature coming soon - allows users to pin favorite images to their profile
        toast.info('Tính năng chỉnh sửa ghim sẽ sớm ra mắt! Tính năng này sẽ cho phép bạn giới thiệu những hình ảnh yêu thích trên hồ sơ của mình.');
    };

    const handleUpdateAvailability = () => {
        // Feature coming soon - allows users to indicate if they're available for hire
        toast.info('Tính năng cập nhật tình trạng sẵn sàng sẽ sớm ra mắt! Bạn sẽ có thể cho biết mình có sẵn sàng nhận công việc chụp ảnh hay không.');
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

    // MOBILE ONLY: If URL has ?image=slug on mobile, redirect to ImagePage
    useEffect(() => {
        if (imageParamFromUrl && (isMobile || window.innerWidth <= 768)) {
            // Set flag to indicate we're opening from grid
            sessionStorage.setItem('imagePage_fromGrid', 'true');
            // Navigate to ImagePage with images state
            navigate(`/photos/${imageParamFromUrl}`, {
                state: { 
                    images: displayImages,
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
    }, [imageParamFromUrl, isMobile, navigate, displayImages, setSearchParams]);

    // Find selected image from URL (supports both slug format and legacy ID format) - DESKTOP ONLY
    const selectedImage = useMemo(() => {
        // Don't show modal on mobile
        if (isMobile || window.innerWidth <= 768) return null;
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
        setImageType(imageId, imageType);
    }, [currentImageIds, setImageType]);

    // Update image in the state when stats change
    const handleImageUpdate = useCallback((updatedImage: Image) => {
        updateImage(updatedImage._id, updatedImage);
    }, [updateImage]);

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

    if (!currentUser) {
        return null;
    }

    if (profileUserLoading) {
        return (
            <>
                <Header />
                <main className="profile-page">
                    <div className="profile-container">
                        <Skeleton className="h-32 w-full" />
                    </div>
                </main>
            </>
        );
    }

    const displayUser = profileUser || currentUser;

    return (
        <>
            <Header />
            <main className="profile-page">
                <div className="profile-container">
                    {/* Profile Header */}
                    <ProfileHeader
                        displayUser={displayUser as PublicUser}
                        isOwnProfile={isOwnProfile}
                        userStats={userStats}
                        displayUserId={displayUserId}
                        isSwitchingProfile={isSwitchingProfile}
                        statsUserIdRef={statsUserIdRef}
                        photosCount={photosCount}
                        collectionsCount={collectionsCount}
                        followStats={followStats}
                        onEditProfile={handleEditProfile}
                        onEditPins={handleEditPins}
                        onUpdateAvailability={handleUpdateAvailability}
                        onTabChange={setActiveTab}
                    />

                    {/* Navigation Tabs */}
                    <ProfileTabs
                        activeTab={activeTab}
                        photosCount={photosCount}
                        illustrationsCount={illustrationsCount}
                        collectionsCount={collectionsCount}
                        onTabChange={setActiveTab}
                    />

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
                                                    // MOBILE ONLY: Navigate to ImagePage instead of opening modal
                                                    if (isMobile || window.innerWidth <= 768) {
                                                        // Set flag to indicate we're opening from grid
                                                        sessionStorage.setItem('imagePage_fromGrid', 'true');
                                                        // Pass images via state for navigation
                                                        const slug = generateImageSlug(image.imageTitle, image._id);
                                                        navigate(`/photos/${slug}`, {
                                                            state: { 
                                                                images: displayImages,
                                                                fromGrid: true 
                                                            }
                                                        });
                                                        return;
                                                    }

                                                    // DESKTOP: Use modal (existing behavior)
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
                            <Suspense fallback={<div className="profile-stats-loading"><Skeleton className="h-64 w-full" /></div>}>
                                <UserAnalyticsDashboard />
                            </Suspense>
                        )}
                    </div>
                </div>
            </main>

            {/* Image Modal - DESKTOP ONLY */}
            {/* On mobile, we navigate to ImagePage instead */}
            {selectedImage && !isMobile && window.innerWidth > 768 && (
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

import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Share2,
  Info,
  MoreVertical,
  CheckCircle2,
  ChevronDown,
  Heart,
  MapPin,
  ExternalLink,
  Mail,
  Link as LinkIcon,
  Edit2,
  ImageOff,
} from 'lucide-react';
import type { Image } from '@/types/image';
import ProgressiveImage from './ProgressiveImage';
import { imageService } from '@/services/imageService';
import { favoriteService } from '@/services/favoriteService';
import { useAuthStore } from '@/stores/useAuthStore';
import { toast } from 'sonner';
import { generateImageSlug } from '@/lib/utils';
import EditImageModal from './EditImageModal';
import './ImageModal.css';

interface ImageModalProps {
  image: Image;
  images: Image[];
  onClose: () => void;
  onImageSelect: (image: Image) => void;
  onDownload: (image: Image, e: React.MouseEvent) => void;
  imageTypes: Map<string, 'portrait' | 'landscape'>;
  onImageLoad: (imageId: string, img: HTMLImageElement) => void;
  currentImageIds: Set<string>;
  processedImages: React.MutableRefObject<Set<string>>;
}

const ImageModal = ({
  image,
  images,
  onClose,
  onImageSelect,
  onDownload,
  imageTypes,
  onImageLoad,
  currentImageIds,
  processedImages,
}: ImageModalProps) => {
  const modalContentRef = useRef<HTMLDivElement>(null);
  const relatedImagesLoadMoreRef = useRef<HTMLDivElement>(null);
  const [relatedImagesLimit, setRelatedImagesLimit] = useState(12);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isLoadingRelatedImages, setIsLoadingRelatedImages] = useState(false);
  const [views, setViews] = useState<number>(image.views || 0);
  const [downloads, setDownloads] = useState<number>(image.downloads || 0);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [activeTab, setActiveTab] = useState<'views' | 'downloads'>('views');
  const [hoveredBar, setHoveredBar] = useState<{ date: string; views: number; downloads: number; x: number; y: number } | null>(null);
  const mouseMoveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isFavorited, setIsFavorited] = useState<boolean>(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState<boolean>(false);
  const [showUserProfileCard, setShowUserProfileCard] = useState(false);
  const [isClosingProfileCard, setIsClosingProfileCard] = useState(false);
  const [userImages, setUserImages] = useState<Image[]>([]);
  const [isLoadingUserImages, setIsLoadingUserImages] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const infoButtonRef = useRef<HTMLButtonElement>(null);
  const shareButtonRef = useRef<HTMLButtonElement>(null);
  const userInfoRef = useRef<HTMLDivElement>(null);
  const userProfileCardRef = useRef<HTMLDivElement>(null);
  const incrementedViewIds = useRef<Set<string>>(new Set());
  const currentImageIdRef = useRef<string | null>(null);
  const [modalImageSrc, setModalImageSrc] = useState<string>('');
  const [isModalImageLoaded, setIsModalImageLoaded] = useState(false);
  const modalImageRef = useRef<HTMLImageElement>(null);
  const { accessToken, user } = useAuthStore();
  const navigate = useNavigate();

  // Memoize formatted date to avoid recalculation on every render
  const formattedDate = useMemo(() => {
    if (!image.createdAt) return null;
    return new Date(image.createdAt).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, [image.createdAt]);

  // Generate accurate chart data - show views/downloads on the published date
  // Since we only have total counts (not per-day), we show all views on the published date
  // Memoize chart data and max values together to avoid recalculation
  const { chartData, maxViews, maxDownloads } = useMemo(() => {
    // Parse published date - backend stores dates in UTC
    const publishedDate = new Date(image.createdAt);

    // Get today's date in local timezone for chart display
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Helper to format date as YYYY-MM-DD using local timezone
    const formatDateLocal = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    // Helper to convert UTC date string (YYYY-MM-DD) to local date string
    // Backend stores dates in UTC, but we need to match them to local dates
    const convertUTCToLocalDateStr = (utcDateStr: string) => {
      // Parse UTC date string and convert to local date
      const utcDate = new Date(utcDateStr + 'T00:00:00.000Z');
      return formatDateLocal(utcDate);
    };

    // Convert UTC published date to local date for comparison
    const publishedLocalDate = new Date(
      publishedDate.getUTCFullYear(),
      publishedDate.getUTCMonth(),
      publishedDate.getUTCDate()
    );
    const publishedStr = formatDateLocal(publishedLocalDate);

    // Get daily views and downloads from image (backend stores in UTC date strings)
    const dailyViews = image.dailyViews || {};
    const dailyDownloads = image.dailyDownloads || {};

    // Check if we have any per-day data
    // An empty object {} means no per-day data exists (old images)
    const hasDailyViews = dailyViews && typeof dailyViews === 'object' && Object.keys(dailyViews).length > 0;
    const hasDailyDownloads = dailyDownloads && typeof dailyDownloads === 'object' && Object.keys(dailyDownloads).length > 0;

    // Calculate total tracked views/downloads and remaining untracked ones
    const totalTrackedViews = hasDailyViews
      ? Object.values(dailyViews).reduce((sum, count) => sum + (count || 0), 0)
      : 0;
    const totalTrackedDownloads = hasDailyDownloads
      ? Object.values(dailyDownloads).reduce((sum, count) => sum + (count || 0), 0)
      : 0;

    const remainingViews = Math.max(0, (image.views || 0) - totalTrackedViews);
    const remainingDownloads = Math.max(0, (image.downloads || 0) - totalTrackedDownloads);

    const data = Array.from({ length: 14 }, (_, i) => {
      // Calculate date: i=0 is 13 days ago, i=13 is today (0 days ago)
      const daysAgo = 13 - i;
      const date = new Date(today);
      date.setDate(today.getDate() - daysAgo);

      // Format chart date in local timezone
      const dateStr = formatDateLocal(date);
      const isBeforePublished = dateStr < publishedStr;

      let viewsValue = 0;
      let downloadsValue = 0;

      // Show per-day tracked views (real data)
      if (hasDailyViews) {
        for (const [utcDateStr, count] of Object.entries(dailyViews)) {
          const localDateStr = convertUTCToLocalDateStr(utcDateStr);
          if (localDateStr === dateStr && !isBeforePublished) {
            viewsValue += count;
          }
        }
      }

      // Show remaining untracked views on published date (fallback for old views)
      // This handles views that happened before per-day tracking was implemented
      if (remainingViews > 0 && dateStr === publishedStr && !isBeforePublished) {
        viewsValue += remainingViews;
      }

      // Show per-day tracked downloads (real data)
      if (hasDailyDownloads) {
        for (const [utcDateStr, count] of Object.entries(dailyDownloads)) {
          const localDateStr = convertUTCToLocalDateStr(utcDateStr);
          if (localDateStr === dateStr && !isBeforePublished) {
            downloadsValue += count;
          }
        }
      }

      // Show remaining untracked downloads on published date (fallback for old downloads)
      if (remainingDownloads > 0 && dateStr === publishedStr && !isBeforePublished) {
        downloadsValue += remainingDownloads;
      }

      return {
        date,
        views: viewsValue,
        downloads: downloadsValue,
        isBeforePublished,
      };
    });

    // Calculate max values once
    const maxViews = Math.max(...data.map(d => d.views), 1);
    const maxDownloads = Math.max(...data.map(d => d.downloads), 1);

    return { chartData: data, maxViews, maxDownloads };
  }, [image.createdAt, image.dailyViews, image.dailyDownloads, image.views, image.downloads]);

  // Reset related images limit and update stats when image changes
  useEffect(() => {
    setRelatedImagesLimit(12);
    setViews(image.views || 0);
    setDownloads(image.downloads || 0);
    currentImageIdRef.current = image._id;
    // Note: dailyViews and dailyDownloads are used directly from image prop in chart calculation

    // Reset modal image state and start progressive loading
    setIsModalImageLoaded(false);
    // Start with regularUrl (1080px) for better performance, fallback to smallUrl or imageUrl
    const initialSrc = image.regularUrl || image.smallUrl || image.imageUrl;
    setModalImageSrc(initialSrc);

    // If we have a full-size imageUrl and it's different from initial, preload it in background
    if (image.imageUrl && image.imageUrl !== initialSrc && (image.regularUrl || image.smallUrl)) {
      const fullSizeImg = new Image();
      fullSizeImg.onload = () => {
        // Upgrade to full size after initial load completes
        if (currentImageIdRef.current === image._id) {
          setModalImageSrc(image.imageUrl);
        }
      };
      fullSizeImg.src = image.imageUrl;
    }

    // Check favorite status when image changes (only if user is logged in)
    if (accessToken && image && image._id) {
      // Ensure imageId is a string and valid MongoDB ObjectId
      const imageId = String(image._id).trim();

      // Validate MongoDB ObjectId format (24 hex characters)
      const isValidMongoId = /^[0-9a-fA-F]{24}$/.test(imageId);

      if (!imageId || imageId === 'undefined' || imageId === 'null' || !isValidMongoId) {
        setIsFavorited(false);
        return;
      }

      favoriteService.checkFavorites([imageId])
        .then((response) => {
          // Check response structure - backend returns { success: true, favorites: { imageId: boolean } }
          if (response && response.favorites && typeof response.favorites === 'object') {
            // Check both string and original ID format to handle any type mismatches
            const isFavorited = response.favorites[imageId] === true ||
              response.favorites[String(image._id)] === true ||
              response.favorites[image._id] === true;
            setIsFavorited(!!isFavorited);
          } else {
            setIsFavorited(false);
          }
        })
        .catch((error) => {
          // Silently fail - favorite status is optional
          console.error('Failed to check favorite status:', error);
        });
    } else {
      setIsFavorited(false);
    }
    // Dependencies: image URLs and accessToken
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image._id, image.regularUrl, image.smallUrl, image.imageUrl, accessToken]);

  // Close info modal when clicking outside
  useEffect(() => {
    if (!showInfoModal) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        infoButtonRef.current &&
        !infoButtonRef.current.contains(target) &&
        !target.closest('.info-modal')
      ) {
        setShowInfoModal(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showInfoModal]);

  // Close share menu when clicking outside
  useEffect(() => {
    if (!showShareMenu) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        shareButtonRef.current &&
        !shareButtonRef.current.contains(target) &&
        !target.closest('.share-menu')
      ) {
        setShowShareMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showShareMenu]);

  // Fetch user images when hovering over user info
  useEffect(() => {
    if (!showUserProfileCard || !image.uploadedBy._id) return;

    let isMounted = true;
    setIsLoadingUserImages(true);

    const fetchUserImages = async () => {
      try {
        const response = await imageService.fetchUserImages(image.uploadedBy._id, { limit: 3 });
        if (isMounted) {
          // Exclude current image from the list
          const otherImages = (response.images || []).filter(
            (img: Image) => img._id !== image._id
          ).slice(0, 3);
          setUserImages(otherImages);
        }
      } catch (error) {
        console.error('Failed to fetch user images:', error);
        if (isMounted) {
          setUserImages([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingUserImages(false);
        }
      }
    };

    fetchUserImages();

    return () => {
      isMounted = false;
    };
  }, [showUserProfileCard, image.uploadedBy._id, image._id]);

  // Close user profile card when clicking outside
  useEffect(() => {
    if (!showUserProfileCard) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Clear hover timeout if any
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = null;
      }

      // Close if click is outside both user info and profile card
      const isInsideUserInfo = userInfoRef.current?.contains(target);
      const isInsideProfileCard = userProfileCardRef.current?.contains(target);

      if (!isInsideUserInfo && !isInsideProfileCard) {
        setIsClosingProfileCard(true);
        // Wait for fade-out animation before actually hiding
        setTimeout(() => {
          setShowUserProfileCard(false);
          setIsClosingProfileCard(false);
        }, 250); // Match CSS transition duration
      }
    };

    // Add listener immediately - clicks outside should always close
    document.addEventListener('mousedown', handleClickOutside, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [showUserProfileCard]);

  // Use a timeout to handle mouse leave with a small delay (to allow moving to the card)
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsClosingProfileCard(false);
    setShowUserProfileCard(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    // Add a delay before closing to allow moving to the card
    // Increased delay for smoother UX
    hoverTimeoutRef.current = setTimeout(() => {
      setIsClosingProfileCard(true);
      // Wait for fade-out animation before actually hiding
      setTimeout(() => {
        setShowUserProfileCard(false);
        setIsClosingProfileCard(false);
      }, 250); // Match CSS transition duration
    }, 200);
  }, []);

  // Handle view profile navigation
  const handleViewProfile = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    // Clear any pending hover timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    // Close card immediately
    setShowUserProfileCard(false);
    // Small delay to ensure card is closed before navigation
    setTimeout(() => {
      // If viewing own profile or if user is logged in, navigate to profile page
      // Note: Currently the app only supports viewing own profile
      if (user && user._id === image.uploadedBy._id) {
        navigate('/profile');
      } else {
        // For other users, show a message (feature coming soon)
        toast.info('Viewing other users\' profiles is coming soon!');
      }
    }, 50);
  }, [navigate, image.uploadedBy._id, user]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      if (mouseMoveTimeoutRef.current) {
        clearTimeout(mouseMoveTimeoutRef.current);
      }
    };
  }, []);

  // Increment view count when modal opens (only once per image)
  useEffect(() => {
    const imageId = image._id;
    // Only increment if we haven't incremented for this image ID before
    if (imageId && !incrementedViewIds.current.has(imageId)) {
      incrementedViewIds.current.add(imageId);
      imageService.incrementView(imageId)
        .then((response) => {
          setViews(response.views);
          // Update the image in the parent component and store
          // Use the current image from the ref to avoid stale closure
          const currentImage = image;
          if (onImageSelect && currentImage) {
            // Merge dailyViews to ensure we have all historical data
            const mergedDailyViews = {
              ...(currentImage.dailyViews || {}),
              ...(response.dailyViews || {})
            };
            onImageSelect({
              ...currentImage,
              views: response.views,
              dailyViews: mergedDailyViews
            });
          }
        })
        .catch((error) => {
          console.error('Failed to increment view:', error);
          // Remove from set on error so it can be retried
          incrementedViewIds.current.delete(imageId);
        });
    }
    // Only depend on image._id to avoid re-running when image object changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [image._id]);

  // Get related images (same category, excluding current image) with infinite scroll
  // Combined calculation to avoid duplicate filtering
  const { relatedImages, hasMoreRelatedImages } = useMemo(() => {
    if (!image || images.length === 0) {
      return { relatedImages: [], hasMoreRelatedImages: false };
    }

    const currentCategoryId = typeof image.imageCategory === 'string'
      ? image.imageCategory
      : image.imageCategory?._id;

    let filtered: Image[];

    if (!currentCategoryId) {
      // If no category, return other images from current view (excluding current)
      filtered = images.filter(img => img._id !== image._id);
    } else {
      // Filter images by same category, excluding current image
      filtered = images.filter(img => {
        if (img._id === image._id) return false;
        const imgCategoryId = typeof img.imageCategory === 'string'
          ? img.imageCategory
          : img.imageCategory?._id;
        return imgCategoryId === currentCategoryId;
      });
    }

    // Return limited images for infinite scroll and check if more available
    return {
      relatedImages: filtered.slice(0, relatedImagesLimit),
      hasMoreRelatedImages: filtered.length > relatedImagesLimit,
    };
  }, [image, images, relatedImagesLimit]);

  // Infinite scroll for related images (modal content scrolling)
  useEffect(() => {
    if (!relatedImagesLoadMoreRef.current || isLoadingRelatedImages || !modalContentRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && hasMoreRelatedImages && !isLoadingRelatedImages) {
          setIsLoadingRelatedImages(true);
          // Load more images after a short delay for smooth UX
          setTimeout(() => {
            setRelatedImagesLimit(prev => prev + 12);
            setIsLoadingRelatedImages(false);
          }, 300);
        }
      },
      {
        root: modalContentRef.current, // Use modal content as root for scrolling detection
        rootMargin: '200px',
      }
    );

    observer.observe(relatedImagesLoadMoreRef.current);

    return () => {
      observer.disconnect();
    };
  }, [hasMoreRelatedImages, isLoadingRelatedImages]);

  // Get share URL and text
  const getShareData = useCallback(() => {
    const slug = generateImageSlug(image.imageTitle, image._id);
    const shareUrl = `${window.location.origin}/?image=${slug}`;
    const shareText = `Check out this photo: ${image.imageTitle || 'Untitled'}`;
    return { shareUrl, shareText };
  }, [image._id, image.imageTitle]);

  // Handle share to Facebook
  const handleShareFacebook = useCallback(() => {
    const { shareUrl } = getShareData();
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400');
    setShowShareMenu(false);
  }, [getShareData]);

  // Handle share to Pinterest
  const handleSharePinterest = useCallback(() => {
    const { shareUrl } = getShareData();
    const pinterestUrl = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(shareUrl)}&media=${encodeURIComponent(image.imageUrl)}&description=${encodeURIComponent(image.imageTitle || 'Photo')}`;
    window.open(pinterestUrl, '_blank', 'width=600,height=400');
    setShowShareMenu(false);
  }, [getShareData, image.imageUrl, image.imageTitle]);

  // Handle share to Twitter
  const handleShareTwitter = useCallback(() => {
    const { shareUrl, shareText } = getShareData();
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
    setShowShareMenu(false);
  }, [getShareData]);

  // Handle share via Email
  const handleShareEmail = useCallback(() => {
    const { shareUrl, shareText } = getShareData();
    const emailUrl = `mailto:?subject=${encodeURIComponent(image.imageTitle || 'Photo')}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`;
    window.location.href = emailUrl;
    setShowShareMenu(false);
  }, [getShareData, image.imageTitle]);

  // Handle share via Web Share API
  const handleShareVia = useCallback(async () => {
    const { shareUrl, shareText } = getShareData();

    if (navigator.share) {
      try {
        await navigator.share({
          title: image.imageTitle || 'Photo',
          text: shareText,
          url: shareUrl,
        });
        toast.success('Đã chia sẻ ảnh');
        setShowShareMenu(false);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Share failed:', error);
          toast.error('Không thể chia sẻ. Vui lòng thử lại.');
        }
      }
    } else {
      toast.error('Trình duyệt của bạn không hỗ trợ tính năng này');
    }
  }, [getShareData, image.imageTitle]);

  // Handle copy link
  const handleCopyLink = useCallback(async () => {
    const { shareUrl } = getShareData();
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Đã sao chép liên kết vào clipboard');
      setShowShareMenu(false);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      toast.error('Không thể sao chép liên kết. Vui lòng thử lại.');
    }
  }, [getShareData]);

  // Handle share button click (opens menu)
  const handleShare = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowShareMenu(!showShareMenu);
  }, [showShareMenu]);

  // Handle toggle favorite
  const handleToggleFavorite = useCallback(async () => {
    if (!accessToken || !image._id || isTogglingFavorite) return;

    setIsTogglingFavorite(true);
    try {
      const imageId = String(image._id);
      const response = await favoriteService.toggleFavorite(imageId);

      // Update local state immediately
      setIsFavorited(response.isFavorited);

      if (response.isFavorited) {
        toast.success('Đã thêm vào yêu thích');
      } else {
        toast.success('Đã xóa khỏi yêu thích');
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      toast.error('Không thể cập nhật yêu thích. Vui lòng thử lại.');
    } finally {
      setIsTogglingFavorite(false);
    }
  }, [accessToken, image._id, isTogglingFavorite]);

  // Memoize current image index to avoid recalculation
  const currentImageIndex = useMemo(() => {
    return images.findIndex(img => img._id === image._id);
  }, [images, image._id]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      // Close modal on Escape
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Only handle shortcuts when modal is open (not typing in inputs)
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Arrow keys for navigation (if multiple images)
      if (e.key === 'ArrowLeft' && images.length > 1) {
        if (currentImageIndex > 0) {
          onImageSelect(images[currentImageIndex - 1]);
        }
        e.preventDefault();
        return;
      }

      if (e.key === 'ArrowRight' && images.length > 1) {
        if (currentImageIndex < images.length - 1) {
          onImageSelect(images[currentImageIndex + 1]);
        }
        e.preventDefault();
        return;
      }

      // Download with Ctrl/Cmd + D
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        const downloadBtn = document.querySelector('.modal-download-btn') as HTMLElement;
        if (downloadBtn) {
          downloadBtn.click();
        }
        return;
      }

      // Share with Ctrl/Cmd + S
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        setShowShareMenu(prev => !prev);
        return;
      }

      // Toggle favorite with F
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        if (accessToken && !isTogglingFavorite) {
          handleToggleFavorite();
        }
        return;
      }
    };

    // Handle wheel events to scroll modal content when scrolling on overlay or anywhere
    const handleWheel = (e: Event) => {
      if (!modalContentRef.current) return;

      const wheelEvent = e as WheelEvent;
      const target = e.target as HTMLElement;

      // Don't interfere if scrolling inside the modal content itself
      if (modalContentRef.current.contains(target)) {
        return;
      }

      // Prevent default scrolling
      wheelEvent.preventDefault();

      // Scroll the modal content instead
      const modalContent = modalContentRef.current;
      modalContent.scrollTop += wheelEvent.deltaY;
    };

    document.addEventListener('keydown', handleKeyboard);
    // Prevent page/body scrolling when modal is open
    document.body.style.overflow = 'hidden';
    // Prevent scrolling on the image grid container
    const gridContainer = document.querySelector('.image-grid-container');
    if (gridContainer) {
      (gridContainer as HTMLElement).style.overflow = 'hidden';
    }

    // Add wheel event listener to document to catch all scroll events
    document.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      document.removeEventListener('keydown', handleKeyboard);
      document.removeEventListener('wheel', handleWheel);
      document.body.style.overflow = '';
      const gridContainer = document.querySelector('.image-grid-container');
      if (gridContainer) {
        (gridContainer as HTMLElement).style.overflow = '';
      }
    };
  }, [onClose, images, currentImageIndex, onImageSelect, accessToken, isTogglingFavorite, handleToggleFavorite, image._id]);

  return (
    <>
      <div
        className="image-modal-overlay"
        onClick={onClose}
      />
      <div
        className="image-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="image-modal-header">
          {/* Left: User Info */}
          <div
            className="modal-header-left"
            ref={userInfoRef}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            style={{ position: 'relative' }}
          >
            {image.uploadedBy.avatarUrl ? (
              <img
                src={image.uploadedBy.avatarUrl}
                alt={image.uploadedBy.displayName || image.uploadedBy.username}
                className="modal-user-avatar"
              />
            ) : (
              <div className="modal-user-avatar-placeholder">
                {(image.uploadedBy.displayName || image.uploadedBy.username || 'U').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="modal-user-info">
              <div
                className="modal-user-name hoverable"
                style={{ cursor: 'pointer' }}
              >
                {image.uploadedBy.displayName?.trim() || image.uploadedBy.username}
                <CheckCircle2 className="verified-badge" size={16} />
              </div>
              <div className="modal-user-status">Available for hire</div>
            </div>

            {/* User Profile Card */}
            {showUserProfileCard && (
              <div
                ref={userProfileCardRef}
                className={`user-profile-card ${isClosingProfileCard ? 'closing' : ''}`}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
              >
                <div className="user-profile-card-header">
                  <div className="user-profile-card-avatar-section">
                    {image.uploadedBy.avatarUrl ? (
                      <img
                        src={image.uploadedBy.avatarUrl}
                        alt={image.uploadedBy.displayName || image.uploadedBy.username}
                        className="user-profile-card-avatar"
                      />
                    ) : (
                      <div className="user-profile-card-avatar-placeholder">
                        {(image.uploadedBy.displayName || image.uploadedBy.username || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="user-profile-card-name-section">
                      <div className="user-profile-card-name">
                        {image.uploadedBy.displayName?.trim() || image.uploadedBy.username}
                      </div>
                      <div className="user-profile-card-username">{image.uploadedBy.username}</div>
                    </div>
                  </div>
                </div>

                {isLoadingUserImages && userImages.length === 0 ? (
                  <div className="user-profile-card-loading">
                    <div className="loading-spinner-small" />
                  </div>
                ) : userImages.length > 0 ? (
                  <div className="user-profile-card-images">
                    {userImages.map((userImage) => (
                      <div
                        key={userImage._id}
                        className="user-profile-card-image-item"
                        onClick={() => {
                          setShowUserProfileCard(false);
                          onImageSelect(userImage);
                          if (modalContentRef.current) {
                            modalContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                          }
                        }}
                      >
                        <img
                          src={userImage.thumbnailUrl || userImage.smallUrl || userImage.imageUrl}
                          alt={userImage.imageTitle || 'Photo'}
                          loading="lazy"
                        />
                      </div>
                    ))}
                  </div>
                ) : null}

                <button
                  className="user-profile-card-view-btn"
                  onClick={handleViewProfile}
                >
                  View profile
                </button>
              </div>
            )}
          </div>

          {/* Right: Action Buttons */}
          <div className="modal-header-right">
            <button
              className="modal-download-btn"
              onClick={async (e) => {
                e.stopPropagation();
                // Increment download count
                try {
                  const response = await imageService.incrementDownload(image._id);
                  setDownloads(response.downloads);
                  // Update the image in the parent component and store
                  if (onImageSelect) {
                    onImageSelect({
                      ...image,
                      downloads: response.downloads,
                      dailyDownloads: response.dailyDownloads || image.dailyDownloads
                    });
                  }
                } catch (error) {
                  console.error('Failed to increment download:', error);
                }
                // Then trigger the download
                onDownload(image, e);
              }}
              title="Download"
            >
              <span>Tải xuống</span>
              <ChevronDown size={16} />
            </button>
          </div>
        </div>

        {/* Modal Image Content - Scrollable */}
        <div
          className="image-modal-content"
          ref={modalContentRef}
        >
          {/* Main Image */}
          <div className="modal-main-image-container">
            <img
              ref={modalImageRef}
              src={modalImageSrc || image.regularUrl || image.smallUrl || image.imageUrl}
              srcSet={
                image.thumbnailUrl && image.smallUrl && image.regularUrl && image.imageUrl
                  ? `${image.thumbnailUrl} 200w, ${image.smallUrl} 800w, ${image.regularUrl} 1080w, ${image.imageUrl} 1920w`
                  : undefined
              }
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 90vw, 1080px"
              alt={image.imageTitle || 'Photo'}
              className={`modal-image ${isModalImageLoaded ? 'loaded' : 'loading'}`}
              loading="eager"
              decoding="async"
              fetchPriority="high"
              onLoad={() => setIsModalImageLoaded(true)}
            />
          </div>

          {/* Modal Footer */}
          <div className="image-modal-footer">
            {/* Left: Stats */}
            <div className="modal-footer-left">
              <div className="modal-footer-left-stats">
                <div className="modal-stat">
                  <span className="stat-label">Lượt xem</span>
                  <span className="stat-value">{views.toLocaleString()}</span>
                </div>
                <div className="modal-stat">
                  <span className="stat-label">Lượt tải</span>
                  <span className="stat-value">{downloads.toLocaleString()}</span>
                </div>
              </div>
              {/* Image Info */}
              <div className="modal-image-info">
                {image.imageTitle && (
                  <div className="image-info-title">{image.imageTitle}</div>
                )}
                {(image.location || image.cameraModel) && (
                  <div className="image-info-details">
                    {image.location && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={14} style={{ flexShrink: 0 }} />
                        {image.coordinates ? (
                          <a
                            href={`https://www.google.com/maps?q=${image.coordinates.latitude},${image.coordinates.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              color: 'inherit',
                              textDecoration: 'none',
                              transition: 'opacity 0.2s',
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                            title="Xem trên Google Maps"
                          >
                            {image.location}
                            <ExternalLink size={12} style={{ flexShrink: 0, opacity: 0.7 }} />
                          </a>
                        ) : (
                          <span>{image.location}</span>
                        )}
                      </span>
                    )}
                    {image.location && image.cameraModel && <span> • </span>}
                    {image.cameraModel && <span>{image.cameraModel}</span>}
                  </div>
                )}
                {formattedDate && (
                  <div className="image-info-date">
                    {formattedDate}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Actions */}
            <div className="modal-footer-right">
              {accessToken && (
                <button
                  className={`modal-footer-btn ${isFavorited ? 'favorited' : ''}`}
                  onClick={handleToggleFavorite}
                  disabled={isTogglingFavorite}
                  aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Heart
                    size={18}
                    fill={isFavorited ? 'currentColor' : 'none'}
                    className={isFavorited ? 'favorite-icon-filled' : ''}
                  />
                  <span>{isFavorited ? 'Đã lưu' : 'Lưu'}</span>
                </button>
              )}
              <div style={{ position: 'relative' }}>
                <button
                  ref={shareButtonRef}
                  className={`modal-footer-btn ${showShareMenu ? 'active' : ''}`}
                  onClick={handleShare}
                  title="Share (Ctrl/Cmd + S)"
                  aria-label="Chia sẻ ảnh"
                >
                  <Share2 size={18} />
                  <span>Chia sẻ</span>
                </button>
                {/* Share Menu */}
                {showShareMenu && (
                  <div className="share-menu-wrapper">
                    <div className="share-menu">
                      <button
                        className="share-menu-item"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShareFacebook();
                        }}
                      >
                        <div className="share-menu-icon facebook-icon">f</div>
                        <span>Facebook</span>
                      </button>
                      <button
                        className="share-menu-item"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSharePinterest();
                        }}
                      >
                        <div className="share-menu-icon pinterest-icon">P</div>
                        <span>Pinterest</span>
                      </button>
                      <button
                        className="share-menu-item"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShareTwitter();
                        }}
                      >
                        <div className="share-menu-icon twitter-icon">X</div>
                        <span>Twitter</span>
                      </button>
                      <button
                        className="share-menu-item"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShareEmail();
                        }}
                      >
                        <Mail size={20} className="share-menu-icon-svg" />
                        <span>Email</span>
                      </button>
                      <button
                        className="share-menu-item"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShareVia();
                        }}
                      >
                        <Share2 size={20} className="share-menu-icon-svg" />
                        <span>Share via...</span>
                      </button>
                      <div className="share-menu-divider" />
                      <button
                        className="share-menu-item"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyLink();
                        }}
                      >
                        <LinkIcon size={20} className="share-menu-icon-svg" />
                        <span>Copy link</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <button
                  ref={infoButtonRef}
                  className={`modal-footer-btn ${showInfoModal ? 'active' : ''}`}
                  onClick={() => setShowInfoModal(!showInfoModal)}
                >
                  <Info size={18} />
                  <span>Thông tin</span>
                </button>
                {/* Info Modal */}
                {showInfoModal && (
                  <div className="info-modal-wrapper">
                    <div className="info-modal">
                      <div className="info-modal-header">
                        <h2 className="info-modal-title">Thông tin</h2>
                        <button
                          className="info-modal-close"
                          onClick={() => setShowInfoModal(false)}
                          aria-label="Close info modal"
                        >
                          ×
                        </button>
                      </div>
                      <div className="info-modal-content">
                        <div className="info-published">
                          Đã đăng vào {(() => {
                            const daysAgo = Math.floor((Date.now() - new Date(image.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                            if (daysAgo === 0) return 'hôm nay';
                            if (daysAgo === 1) return '1 ngày trước';
                            return `${daysAgo} ngày trước`;
                          })()}
                        </div>

                        {/* Chart Container */}
                        <div
                          className="info-chart-container"
                          ref={chartContainerRef}
                          onMouseMove={(e) => {
                            // Throttle mouse move handler to improve performance
                            if (mouseMoveTimeoutRef.current) {
                              return;
                            }

                            mouseMoveTimeoutRef.current = setTimeout(() => {
                              mouseMoveTimeoutRef.current = null;

                              if (!chartContainerRef.current) return;

                              const chartInner = chartContainerRef.current.querySelector('.info-chart') as HTMLElement;
                              if (!chartInner) return;

                              // Get all bar elements to find exact positions
                              const bars = Array.from(chartInner.querySelectorAll('.info-chart-bar'));
                              if (bars.length === 0) return;

                              const chartInnerRect = chartInner.getBoundingClientRect();

                              // Find which bar the mouse is closest to horizontally
                              let hoveredBarIndex = -1;
                              let minDistance = Infinity;
                              let barCenterX = 0;
                              let barTopY = 0;

                              bars.forEach((bar, index) => {
                                const barRect = bar.getBoundingClientRect();
                                const barCenter = barRect.left + (barRect.width / 2);
                                const distance = Math.abs(e.clientX - barCenter);

                                // Also check if mouse is within the chart area vertically
                                if (e.clientY >= chartInnerRect.top && e.clientY <= chartInnerRect.bottom) {
                                  if (distance < minDistance) {
                                    minDistance = distance;
                                    hoveredBarIndex = index;
                                    barCenterX = barCenter;
                                    // Get the top of the bar (where the tooltip should appear)
                                    barTopY = barRect.top;
                                  }
                                }
                              });

                              if (hoveredBarIndex >= 0 && hoveredBarIndex < chartData.length) {
                                const data = chartData[hoveredBarIndex];
                                // Format date in local timezone - use simple formatting to avoid UTC label
                                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                                const dateStr = `${monthNames[data.date.getMonth()]} ${data.date.getDate()}, ${data.date.getFullYear()}`;

                                // Ensure tooltip stays within viewport
                                const tooltipWidth = 200;
                                const margin = 10;
                                let finalX = barCenterX;

                                // Adjust if too far right
                                if (finalX + (tooltipWidth / 2) > window.innerWidth - margin) {
                                  finalX = window.innerWidth - (tooltipWidth / 2) - margin;
                                }

                                // Adjust if too far left
                                if (finalX - (tooltipWidth / 2) < margin) {
                                  finalX = (tooltipWidth / 2) + margin;
                                }

                                setHoveredBar({
                                  date: dateStr,
                                  views: data.views,
                                  downloads: data.downloads,
                                  x: finalX,
                                  y: barTopY - 8
                                });
                              } else {
                                setHoveredBar(null);
                              }
                            }, 16); // ~60fps throttling
                          }}
                          onMouseLeave={() => {
                            if (mouseMoveTimeoutRef.current) {
                              clearTimeout(mouseMoveTimeoutRef.current);
                              mouseMoveTimeoutRef.current = null;
                            }
                            setHoveredBar(null);
                          }}
                        >
                          <div className="info-chart">
                            {chartData.map((data, i) => {
                              const value = activeTab === 'views' ? data.views : data.downloads;
                              const maxValue = activeTab === 'views' ? maxViews : maxDownloads;
                              const height = maxValue > 0 ? (value / maxValue) * 100 : 0;

                              return (
                                <div
                                  key={i}
                                  className={`info-chart-bar ${data.isBeforePublished ? 'before-published' : ''}`}
                                  style={{ height: `${Math.max(height, 2)}%` }}
                                />
                              );
                            })}
                          </div>
                          {hoveredBar && typeof document !== 'undefined' && createPortal(
                            <div
                              className="info-chart-tooltip"
                              style={{
                                left: `${hoveredBar.x}px`,
                                top: `${hoveredBar.y}px`,
                                transform: 'translate(-50%, -100%)'
                              }}
                            >
                              <div>{hoveredBar.date}</div>
                              {activeTab === 'views' ? (
                                <div>Đã xem {hoveredBar.views.toLocaleString()} lần</div>
                              ) : (
                                <div>Đã tải {hoveredBar.downloads.toLocaleString()} lần</div>
                              )}
                            </div>,
                            document.body
                          )}
                        </div>

                        {/* Tabs */}
                        <div className="info-tabs">
                          <button
                            className={`info-tab ${activeTab === 'views' ? 'active' : ''}`}
                            onClick={() => setActiveTab('views')}
                          >
                            Lượt xem
                          </button>
                          <button
                            className={`info-tab ${activeTab === 'downloads' ? 'active' : ''}`}
                            onClick={() => setActiveTab('downloads')}
                          >
                            Lượt tải
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {user && (user._id === image.uploadedBy._id || user.isAdmin || user.isSuperAdmin) && (
                <button
                  className="modal-footer-btn"
                  onClick={() => setShowEditModal(true)}
                  aria-label="Edit image"
                  title="Edit image"
                >
                  <Edit2 size={18} />
                </button>
              )}
              <button className="modal-footer-btn">
                <MoreVertical size={18} />
              </button>
            </div>
          </div>

          {/* Related Images Section */}
          <div className="modal-related-images">
            <h3 className="related-images-title">Các ảnh cùng chủ đề</h3>
            {relatedImages.length > 0 ? (
              <>
                <div className="related-images-grid">
                  {relatedImages.map((relatedImage) => {
                    const imageType = imageTypes.get(relatedImage._id) || 'landscape';
                    return (
                      <div
                        key={relatedImage._id}
                        className={`related-image-item ${imageType}`}
                        onClick={() => {
                          onImageSelect(relatedImage);
                          // Scroll to top of modal content
                          if (modalContentRef.current) {
                            modalContentRef.current.scrollTo({ top: 0, behavior: 'smooth' });
                          }
                        }}
                      >
                        <ProgressiveImage
                          src={relatedImage.imageUrl}
                          thumbnailUrl={relatedImage.thumbnailUrl}
                          smallUrl={relatedImage.smallUrl}
                          regularUrl={relatedImage.regularUrl}
                          alt={relatedImage.imageTitle || 'Photo'}
                          onLoad={(img) => {
                            if (!processedImages.current.has(relatedImage._id) && currentImageIds.has(relatedImage._id)) {
                              onImageLoad(relatedImage._id, img);
                            }
                          }}
                        />
                        <div className="related-image-overlay">
                          <span className="related-image-title">{relatedImage.imageTitle}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Infinite scroll trigger for related images */}
                {hasMoreRelatedImages && (
                  <div ref={relatedImagesLoadMoreRef} className="related-images-load-more-trigger" />
                )}
                {isLoadingRelatedImages && (
                  <div className="related-images-loading">
                    <div className="loading-spinner" />
                    <p>Đang tải ảnh...</p>
                  </div>
                )}
              </>
            ) : (
              <div className="related-images-empty">
                <div className="related-images-empty-icon">
                  <ImageOff size={48} />
                </div>
                <p className="related-images-empty-text">Không có ảnh liên quan</p>
              </div>
            )}
          </div>
        </div>

        {/* Close Button */}
        {/* <button
          className="modal-close-btn"
          onClick={onClose}
          aria-label="Close modal"
        >
          <X size={24} />
        </button> */}
      </div>

      {/* Edit Image Modal */}
      <EditImageModal
        image={image}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onUpdate={(updatedImage) => {
          onImageSelect(updatedImage);
          setShowEditModal(false);
        }}
      />
    </>
  );
};

export default ImageModal;


import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Header from '@/components/Header';
import ImageModal from '@/components/ImageModal';
import { imageService } from '@/services/imageService';
import { extractIdFromSlug, generateImageSlug } from '@/lib/utils';
import type { Image } from '@/types/image';
import './ImagePage.css';

function ImagePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [image, setImage] = useState<Image | null>(null);
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageTypes, setImageTypes] = useState<Map<string, 'portrait' | 'landscape'>>(new Map());
  const processedImages = useRef<Set<string>>(new Set());
  const currentImageIds = useRef<Set<string>>(new Set());

  // Detect if we came from grid (modal) or refresh/direct access (page)
  // Initialize state immediately based on location.state and sessionStorage
  const getInitialFromGrid = () => {
    // Check if we have state from navigation
    const hasState = location.state?.fromGrid === true;
    
    // Check sessionStorage (set when clicking from grid)
    const fromGridFlag = sessionStorage.getItem('imagePage_fromGrid');
    
    // If we have state OR sessionStorage flag, it's from grid (modal mode)
    const fromGrid = hasState || fromGridFlag === 'true';
    
    // Clear sessionStorage flag after reading (only if it exists)
    if (fromGridFlag === 'true') {
      sessionStorage.removeItem('imagePage_fromGrid');
    }
    
    return fromGrid;
  };
  
  // Initialize state once - use lazy initialization to prevent re-detection
  const [isFromGrid] = useState(() => getInitialFromGrid());
  const renderAsPage = !isFromGrid; // Page mode when NOT from grid

  // Extract image ID from slug
  const imageId = useMemo(() => {
    if (!slug) return null;
    return extractIdFromSlug(slug);
  }, [slug]);

  // Fetch image
  useEffect(() => {
    if (!imageId) {
      setError('Invalid image slug');
      setLoading(false);
      return;
    }

    const fetchImage = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // If coming from grid, try to use passed images first (faster)
        const passedImages = location.state?.images as Image[] | undefined;
        if (passedImages && passedImages.length > 0) {
          const foundImage = passedImages.find(img => {
            const imgShortId = img._id.slice(-12);
            return imgShortId === imageId;
          });
          
          if (foundImage) {
            setImage(foundImage);
            setImages(passedImages);
            currentImageIds.current = new Set(passedImages.map(img => img._id));
            setLoading(false);
            return;
          }
        }
        
        // Otherwise, fetch from API
        const relatedResponse = await imageService.fetchImages({ limit: 50 });
        const allImages = relatedResponse.images || [];
        
        const foundImage = allImages.find(img => {
          const imgShortId = img._id.slice(-12);
          return imgShortId === imageId;
        });
        
        if (foundImage) {
          setImage(foundImage);
          setImages(allImages);
          currentImageIds.current = new Set(allImages.map(img => img._id));
        } else {
          setError('Image not found');
        }
      } catch (err: unknown) {
        console.error('Error fetching image:', err);
        setError(err.response?.data?.message || 'Failed to load image');
      } finally {
        setLoading(false);
      }
    };

    fetchImage();
  }, [imageId, location.state]);

  const handleImageLoad = useCallback((imageId: string, img: HTMLImageElement) => {
    if (processedImages.current.has(imageId)) return;
    processedImages.current.add(imageId);
    const isPortrait = img.naturalHeight > img.naturalWidth;
    const imageType = isPortrait ? 'portrait' : 'landscape';
    setImageTypes(prev => {
      if (prev.has(imageId)) return prev;
      const newMap = new Map(prev);
      newMap.set(imageId, imageType);
      return newMap;
    });
  }, []);

  const handleImageSelect = useCallback((selectedImage: Image) => {
    const newSlug = generateImageSlug(selectedImage.imageTitle, selectedImage._id);
    // When navigating between images, keep as page mode (no fromGrid state)
    navigate(`/photos/${newSlug}`, { replace: true, state: { images } });
  }, [navigate, images]);

  const handleDownload = useCallback((_image: Image, e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  const handleClose = useCallback(() => {
    if (isFromGrid) {
      navigate(-1); // Go back to grid
    } else {
      navigate('/'); // Go to home
    }
  }, [navigate, isFromGrid]);

  // Set meta tags for social sharing (Open Graph, Twitter Cards)
  useEffect(() => {
    if (!image) return;

    const imageUrl = image.regularUrl || image.smallUrl || image.imageUrl;
    const title = image.imageTitle || 'Photo';
    const description = `Photo by ${image.uploadedBy?.displayName || image.uploadedBy?.username || 'Unknown'}`;
    const currentUrl = `${window.location.origin}/photos/${slug}`;

    // Helper to set or update meta tag
    const setMetaTag = (property: string, content: string, isProperty = true) => {
      const attribute = isProperty ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attribute}="${property}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attribute, property);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    // Open Graph tags (Facebook)
    setMetaTag('og:title', title);
    setMetaTag('og:description', description);
    setMetaTag('og:image', imageUrl);
    setMetaTag('og:url', currentUrl);
    setMetaTag('og:type', 'website');

    // Twitter Card tags
    setMetaTag('twitter:card', 'summary_large_image', false);
    setMetaTag('twitter:title', title, false);
    setMetaTag('twitter:description', description, false);
    setMetaTag('twitter:image', imageUrl, false);

    // Update page title
    document.title = `${title} - PhotoApp`;

    // Cleanup function to restore default meta tags
    return () => {
      document.title = 'PhotoApp - Discover Beautiful Photos';
      // Note: We don't remove meta tags as they might be reused
      // The next image will just overwrite them
    };
  }, [image, slug]);

  if (loading) {
    return (
      <>
        <Header />
        <div className="image-page-loading">
          <div className="loading-spinner" />
          <p>Đang tải ảnh...</p>
        </div>
      </>
    );
  }

  if (error || !image) {
    return (
      <>
        <Header />
        <div className="image-page-error">
          <p>{error || 'Không tìm thấy ảnh'}</p>
          <button onClick={() => navigate('/')}>Quay lại trang chủ</button>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className={`image-page-container ${isFromGrid ? 'modal-mode' : 'page-mode'}`}>
        <ImageModal
          image={image}
          images={images}
          onClose={handleClose}
          onImageSelect={handleImageSelect}
          onDownload={handleDownload}
          imageTypes={imageTypes}
          onImageLoad={handleImageLoad}
          currentImageIds={currentImageIds.current}
          processedImages={processedImages}
          renderAsPage={renderAsPage}
        />
      </div>
    </>
  );
}

export default ImagePage;

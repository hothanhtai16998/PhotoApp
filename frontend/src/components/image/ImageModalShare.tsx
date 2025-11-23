import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Share2, Mail, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
import { generateImageSlug } from '@/lib/utils';
import type { Image } from '@/types/image';

interface ImageModalShareProps {
  image: Image;
}

export const ImageModalShare = memo(({ image }: ImageModalShareProps) => {
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [positionBelow, setPositionBelow] = useState(false);
  const shareButtonRef = useRef<HTMLButtonElement>(null);
  const shareMenuRef = useRef<HTMLDivElement>(null);

  // Check available space and position menu accordingly
  useEffect(() => {
    if (!showShareMenu || !shareButtonRef.current) return;

    const checkPosition = () => {
      const buttonRect = shareButtonRef.current?.getBoundingClientRect();

      if (buttonRect) {
        const spaceAbove = buttonRect.top;
        const spaceBelow = window.innerHeight - buttonRect.bottom;
        // Estimate menu height (usually around 300-350px)
        const estimatedMenuHeight = 350;
        const requiredSpace = estimatedMenuHeight + 20; // 20px for gap

        // If not enough space above but enough below, position below
        if (spaceAbove < requiredSpace && spaceBelow >= requiredSpace) {
          setPositionBelow(true);
        } else {
          setPositionBelow(false);
        }
      }
    };

    // Check position immediately and after menu renders
    checkPosition();
    const timer = setTimeout(checkPosition, 50);
    const timer2 = setTimeout(checkPosition, 200); // Check again after animation

    // Also check on scroll/resize
    window.addEventListener('scroll', checkPosition, true);
    window.addEventListener('resize', checkPosition);

    // Use ResizeObserver for more accurate detection
    let resizeObserver: ResizeObserver | null = null;
    if (shareMenuRef.current) {
      resizeObserver = new ResizeObserver(checkPosition);
      resizeObserver.observe(shareMenuRef.current);
    }

    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
      window.removeEventListener('scroll', checkPosition, true);
      window.removeEventListener('resize', checkPosition);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [showShareMenu]);

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

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={shareButtonRef}
        className={`modal-footer-btn modal-share-btn ${showShareMenu ? 'active' : ''}`}
        onClick={handleShare}
        title="Chia sẻ (Ctrl/Cmd + S)"
        aria-label="Chia sẻ ảnh"
      >
        <Share2 size={18} />
        <span>Chia sẻ</span>
        <kbd className="keyboard-hint">⌘S</kbd>
      </button>
      {/* Share Menu */}
      {showShareMenu && (
        <div
          ref={shareMenuRef}
          className={`share-menu-wrapper ${positionBelow ? 'position-below' : ''}`}
        >
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
  );
});

ImageModalShare.displayName = 'ImageModalShare';


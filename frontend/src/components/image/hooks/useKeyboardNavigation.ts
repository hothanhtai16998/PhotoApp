import { useEffect, useRef } from 'react';
import type { Image } from '@/types/image';

interface UseKeyboardNavigationOptions {
  onClose: () => void;
  onNavigateLeft?: () => void;
  onNavigateRight?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  onToggleFavorite?: () => void;
  onFocusSearch?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onResetZoom?: () => void;
  images?: Image[];
  currentImageIndex?: number;
  isEnabled?: boolean;
  isModalOpen?: boolean; // Whether modal is currently open
}

/**
 * Custom hook for keyboard navigation and shortcuts
 * Handles Escape, Arrow keys, and other keyboard shortcuts
 */
export const useKeyboardNavigation = ({
  onClose,
  onNavigateLeft,
  onNavigateRight,
  onDownload,
  onShare,
  onToggleFavorite,
  onFocusSearch,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  images = [],
  currentImageIndex = -1,
  isEnabled = true,
  isModalOpen = false,
}: UseKeyboardNavigationOptions) => {
  const isEnabledRef = useRef(isEnabled);
  const imagesRef = useRef(images);
  const currentImageIndexRef = useRef(currentImageIndex);
  const isModalOpenRef = useRef(isModalOpen);

  // Update refs when values change
  useEffect(() => {
    isEnabledRef.current = isEnabled;
    imagesRef.current = images;
    currentImageIndexRef.current = currentImageIndex;
    isModalOpenRef.current = isModalOpen;
  }, [isEnabled, images, currentImageIndex, isModalOpen]);

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

    const handleKeyboard = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputFocused = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      
      // Focus search with / key (only when modal is not open and not typing in inputs)
      if (e.key === '/' && !isModalOpenRef.current && !isInputFocused && onFocusSearch) {
        e.preventDefault();
        onFocusSearch();
        return;
      }

      // Close modal on Escape
      if (e.key === 'Escape' && isModalOpenRef.current) {
        onClose();
        return;
      }

      // Only handle modal shortcuts when modal is open (not typing in inputs)
      if (!isModalOpenRef.current || isInputFocused) {
        return;
      }

      // Arrow keys for navigation (if multiple images)
      if (e.key === 'ArrowLeft' && onNavigateLeft && imagesRef.current.length > 1) {
        if (currentImageIndexRef.current > 0) {
          e.preventDefault();
          onNavigateLeft();
        }
        return;
      }

      if (e.key === 'ArrowRight' && onNavigateRight && imagesRef.current.length > 1) {
        if (currentImageIndexRef.current < imagesRef.current.length - 1) {
          e.preventDefault();
          onNavigateRight();
        }
        return;
      }

      // Download with Ctrl/Cmd + D
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && onDownload) {
        e.preventDefault();
        const downloadBtn = document.querySelector('.modal-download-btn') as HTMLElement;
        if (downloadBtn) {
          downloadBtn.click();
        } else {
          onDownload();
        }
        return;
      }

      // Share with Ctrl/Cmd + S
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && onShare) {
        e.preventDefault();
        const shareBtn = document.querySelector('.modal-share-btn') as HTMLElement;
        if (shareBtn) {
          shareBtn.click();
        } else {
          onShare();
        }
        return;
      }

      // Toggle favorite with F
      if ((e.key === 'f' || e.key === 'F') && onToggleFavorite) {
        e.preventDefault();
        onToggleFavorite();
        return;
      }

      // Zoom controls with + and -
      if ((e.key === '+' || e.key === '=') && onZoomIn) {
        e.preventDefault();
        onZoomIn();
        return;
      }

      if (e.key === '-' && onZoomOut) {
        e.preventDefault();
        onZoomOut();
        return;
      }

      // Reset zoom with 0
      if (e.key === '0' && onResetZoom) {
        e.preventDefault();
        onResetZoom();
        return;
      }
    };

    // Handle wheel events to scroll modal content when scrolling on overlay or anywhere
    const handleWheel = (e: Event) => {
      const modalContent = document.querySelector('.image-modal-content') as HTMLElement;
      if (!modalContent) return;

      const wheelEvent = e as WheelEvent;
      const target = e.target as HTMLElement;

      // Don't interfere if scrolling inside the modal content itself
      if (modalContent.contains(target)) {
        return;
      }

      // Prevent default scrolling
      wheelEvent.preventDefault();

      // Scroll the modal content instead
      modalContent.scrollTop += wheelEvent.deltaY;
    };

    document.addEventListener('keydown', handleKeyboard);
    
    // Prevent page/body scrolling when modal is open
    // Calculate scrollbar width to prevent layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    const originalBodyOverflow = document.body.style.overflow;
    const originalBodyPaddingRight = document.body.style.paddingRight;
    
    document.body.style.overflow = 'hidden';
    // Compensate for scrollbar width to prevent layout shift
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    
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
      // Restore original styles
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.paddingRight = originalBodyPaddingRight;
      const gridContainer = document.querySelector('.image-grid-container');
      if (gridContainer) {
        (gridContainer as HTMLElement).style.overflow = '';
      }
    };
  }, [isEnabled, onClose, onNavigateLeft, onNavigateRight, onDownload, onShare, onToggleFavorite, onFocusSearch, onZoomIn, onZoomOut, onResetZoom, isModalOpen]);
};


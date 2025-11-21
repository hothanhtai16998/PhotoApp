import { useEffect, useRef } from 'react';
import type { Image } from '@/types/image';

interface UseKeyboardNavigationOptions {
  onClose: () => void;
  onNavigateLeft?: () => void;
  onNavigateRight?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  onToggleFavorite?: () => void;
  images?: Image[];
  currentImageIndex?: number;
  isEnabled?: boolean;
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
  images = [],
  currentImageIndex = -1,
  isEnabled = true,
}: UseKeyboardNavigationOptions) => {
  const isEnabledRef = useRef(isEnabled);
  const imagesRef = useRef(images);
  const currentImageIndexRef = useRef(currentImageIndex);

  // Update refs when values change
  useEffect(() => {
    isEnabledRef.current = isEnabled;
    imagesRef.current = images;
    currentImageIndexRef.current = currentImageIndex;
  }, [isEnabled, images, currentImageIndex]);

  useEffect(() => {
    if (!isEnabled) {
      return;
    }

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
  }, [isEnabled, onClose, onNavigateLeft, onNavigateRight, onDownload, onShare, onToggleFavorite]);
};


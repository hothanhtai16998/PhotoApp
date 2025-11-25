import { X } from 'lucide-react';
import { useState, useEffect, useRef, useCallback } from 'react';
import type { ImageData } from './hooks/useImageUpload';
import './UploadPreview.css';

interface UploadPreviewProps {
  imageData: ImageData;
  index: number;
  totalImages: number;
  onRemove: () => void;
}

export const UploadPreview = ({ imageData, index, totalImages, onRemove }: UploadPreviewProps) => {
  const isUploading = imageData.isUploading === true; // Explicitly check for true
  const uploadProgress = imageData.uploadProgress || 0;
  const uploadError = imageData.uploadError;
  const hasPreUploadData = !!imageData.preUploadData; // Upload is complete when we have this
  const isUploaded = hasPreUploadData && !uploadError && !isUploading;

  // Overlay should show when:
  // 1. isUploading is true, OR
  // 2. We don't have preUploadData yet (upload not complete)
  // This ensures overlay stays until upload is truly successful
  const showOverlay = isUploading || (!hasPreUploadData && !uploadError);

  // Unsplash-style clearing effect: random 2-6% per 1-5 seconds, stops at 30%, then clears to 0% when upload completes
  // Overlay starts at 100% (fully covering image) and clears to reveal image
  const [clearingProgress, setClearingProgress] = useState(100); // Start at 100% (fully covered)
  
  // Debug logging
  useEffect(() => {
    console.log('[UploadPreview] State update', {
      isUploading,
      hasPreUploadData,
      uploadError,
      showOverlay,
      clearingProgress,
      uploadProgress
    });
  }, [isUploading, hasPreUploadData, uploadError, showOverlay, clearingProgress, uploadProgress]);
  const clearingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clearingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasReached30Ref = useRef(false);
  const isClearingRef = useRef(false);
  const clearingProgressRef = useRef(100); // Keep ref in sync with state

  // Sync ref with state
  useEffect(() => {
    clearingProgressRef.current = clearingProgress;
  }, [clearingProgress]);

  // Define clearing function outside effect to persist across re-renders
  const scheduleNextClear = useCallback(() => {
    // Check current progress from ref (always up-to-date)
    if (clearingProgressRef.current <= 30 || hasReached30Ref.current) {
      console.log('[UploadPreview] Clearing stopped at 30%', { current: clearingProgressRef.current, hasReached30: hasReached30Ref.current });
      return;
    }

    // Random wait time: 1-5 seconds
    const randomWaitTime = 1000 + Math.random() * 4000; // 1000-5000ms
    // Random clear amount: 2-6%
    const randomClearAmount = 2 + Math.random() * 4; // 2-6%

    console.log('[UploadPreview] Scheduling next clear', { 
      currentProgress: clearingProgressRef.current, 
      waitTime: randomWaitTime, 
      clearAmount: randomClearAmount 
    });

    clearingTimeoutRef.current = setTimeout(() => {
      // Check if we should continue (overlay might have been hidden)
      if (clearingProgressRef.current <= 30 || hasReached30Ref.current) {
        console.log('[UploadPreview] Clearing stopped, not updating');
        return;
      }

      setClearingProgress((prev) => {
        const next = Math.max(30, prev - randomClearAmount); // Decrease (reveal more image), but don't go below 30%
        clearingProgressRef.current = next; // Update ref
        console.log('[UploadPreview] Clearing progress updated', { prev, next, clearingProgress: clearingProgressRef.current });
        if (next <= 30) {
          hasReached30Ref.current = true;
          console.log('[UploadPreview] Reached 30%, pausing');
          return 30; // Stop at 30%
        }
        // Schedule next clear
        scheduleNextClear();
        return next;
      });
    }, randomWaitTime);
  }, []); // Empty deps - function doesn't depend on any props/state

  // Track showOverlay in a ref to check in cleanup
  const showOverlayRef = useRef(showOverlay);
  useEffect(() => {
    showOverlayRef.current = showOverlay;
  }, [showOverlay]);

  // Initialize clearing when overlay shows
  useEffect(() => {
    console.log('[UploadPreview] Clearing effect triggered', { showOverlay, clearingProgress, isClearingRef: isClearingRef.current });
    
    if (!showOverlay) {
      // Reset when overlay is hidden
      console.log('[UploadPreview] Overlay hidden, resetting');
      setClearingProgress(100);
      clearingProgressRef.current = 100;
      hasReached30Ref.current = false;
      isClearingRef.current = false;
      if (clearingTimeoutRef.current) {
        clearTimeout(clearingTimeoutRef.current);
        clearingTimeoutRef.current = null;
      }
      if (clearingIntervalRef.current) {
        clearInterval(clearingIntervalRef.current);
        clearingIntervalRef.current = null;
      }
      return;
    }

    // Only start clearing if not already started
    if (isClearingRef.current) {
      console.log('[UploadPreview] Already clearing, skipping start');
      return; // Don't restart if already clearing
    }

    // Start clearing animation
    console.log('[UploadPreview] Starting clearing animation');
    isClearingRef.current = true;
    hasReached30Ref.current = false;
    scheduleNextClear();

    // Cleanup only if overlay is being hidden
    return () => {
      // Only cleanup if overlay is actually being hidden
      if (!showOverlayRef.current) {
        console.log('[UploadPreview] Cleaning up clearing effect (overlay hidden)');
        if (clearingTimeoutRef.current) {
          clearTimeout(clearingTimeoutRef.current);
          clearingTimeoutRef.current = null;
        }
        if (clearingIntervalRef.current) {
          clearInterval(clearingIntervalRef.current);
          clearingIntervalRef.current = null;
        }
      } else {
        console.log('[UploadPreview] Effect re-running but overlay still showing, NOT cleaning up');
      }
    };
  }, [showOverlay, scheduleNextClear]); // Include scheduleNextClear in deps

  // Final clear when upload completes
  useEffect(() => {
    if (hasPreUploadData && hasReached30Ref.current && clearingProgress > 0) {
      // Upload complete: clear from 30% to 0% quickly (fully reveal image)
      if (clearingTimeoutRef.current) {
        clearTimeout(clearingTimeoutRef.current);
        clearingTimeoutRef.current = null;
      }
      
      // Animate from current progress to 0% in 0.5 seconds
      const startProgress = clearingProgress;
      const duration = 500; // 500ms to go from 30% to 0%
      const steps = 30; // 30 steps for smooth animation
      const stepSize = startProgress / steps;
      const stepDuration = duration / steps;
      
      let currentStep = 0;
      clearingIntervalRef.current = setInterval(() => {
        currentStep++;
        const newProgress = Math.max(0, startProgress - (stepSize * currentStep));
        setClearingProgress(newProgress);
        
        if (newProgress <= 0 || currentStep >= steps) {
          setClearingProgress(0);
          if (clearingIntervalRef.current) {
            clearInterval(clearingIntervalRef.current);
            clearingIntervalRef.current = null;
          }
        }
      }, stepDuration);
    }

    return () => {
      if (clearingIntervalRef.current) {
        clearInterval(clearingIntervalRef.current);
        clearingIntervalRef.current = null;
      }
    };
  }, [hasPreUploadData, clearingProgress]);

  // Reset when upload starts - ensure clearing starts
  useEffect(() => {
    if (isUploading && showOverlay) {
      // Reset clearing state when upload starts
      setClearingProgress(100);
      clearingProgressRef.current = 100;
      hasReached30Ref.current = false;
      isClearingRef.current = false;
      // Clear any existing timeouts/intervals
      if (clearingTimeoutRef.current) {
        clearTimeout(clearingTimeoutRef.current);
        clearingTimeoutRef.current = null;
      }
      if (clearingIntervalRef.current) {
        clearInterval(clearingIntervalRef.current);
        clearingIntervalRef.current = null;
      }
    }
  }, [isUploading, showOverlay]);

  return (
    <div style={{ position: 'relative', marginBottom: '16px' }}>
      <div style={{ position: 'relative', display: 'block', width: '100%' }}>
        <img
          src={URL.createObjectURL(imageData.file)}
          alt={`Preview ${index + 1}`}
          style={{
            width: '100%',
            height: 'auto', // Preserve aspect ratio
            maxHeight: '500px', // Limit max height for very tall images
            objectFit: 'contain', // Show full image without cropping
            borderRadius: '8px',
            border: '1px solid #e5e5e5',
            display: 'block',
            transition: 'opacity 0.3s ease'
          }}
        />
        {/* Unsplash-style Overlay - Starts at 100% (fully covering), clears from left to right to reveal image */}
        {showOverlay && clearingProgress > 0 && (
          <div 
            className="image-upload-overlay"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(4px)',
              borderRadius: '8px',
              zIndex: 10,
              pointerEvents: 'none',
              animation: 'fadeIn 0.2s ease',
              // Use clip-path to create left-to-right clearing effect
              // clearingProgress: 100% = fully covered (clip 0% from right), 0% = fully revealed (clip 100% from right)
              // inset(0 X% 0 0) clips X% from the right, so we need: 100% - clearingProgress
              clipPath: `inset(0 ${100 - clearingProgress}% 0 0)`,
              transition: 'clip-path 0.3s ease'
            }}
          />
        )}
      </div>
      {/* Success Indicator - Show after upload completes */}
      {isUploaded && !isUploading && (
        <div style={{
          position: 'absolute',
          top: '8px',
          left: '8px',
          background: '#10b981',
          color: 'white',
          padding: '6px 12px',
          borderRadius: '6px',
          fontSize: '13px',
          fontWeight: '600',
          zIndex: 100,
          pointerEvents: 'none',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
          animation: 'fadeIn 0.3s ease'
        }}>
          ✓ Đã tải lên
        </div>
      )}
      {/* Error Indicator */}
      {uploadError && (
        <div style={{
          position: 'absolute',
          top: '8px',
          left: '8px',
          background: '#dc2626',
          color: 'white',
          padding: '4px 10px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: '600',
          zIndex: 100,
          pointerEvents: 'none'
        }}>
          ✗ Lỗi
        </div>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          background: 'rgba(0, 0, 0, 0.7)',
          border: 'none',
          borderRadius: '50%',
          width: '28px',
          height: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'white'
        }}
      >
        <X size={16} />
      </button>
      <div style={{
        position: 'absolute',
        bottom: '8px',
        left: '8px',
        background: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '4px 10px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: '600'
      }}>
        {index + 1} / {totalImages}
      </div>
    </div>
  );
};


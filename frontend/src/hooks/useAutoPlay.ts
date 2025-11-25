import { useEffect, useRef, useState } from 'react';
import { AUTO_PLAY_INTERVAL, SLIDER_CONSTANTS } from '@/utils/sliderConstants';
import type { SlideAnimationType } from '@/components/SlideAnimationSelector';

interface UseAutoPlayOptions {
  slidesLength: number;
  currentSlide: number;
  animationType: SlideAnimationType;
  slidesReady: boolean;
  onNextSlide: () => void;
  onTypewriterReverse?: (reversing: boolean) => void;
}

interface UseAutoPlayReturn {
  progress: number;
  isRunning: boolean;
}

/**
 * Custom hook for managing slider auto-play functionality
 * Handles progress tracking, timing, and animation coordination
 */
export function useAutoPlay({
  slidesLength,
  currentSlide,
  animationType,
  slidesReady,
  onNextSlide,
  onTypewriterReverse,
}: UseAutoPlayOptions): UseAutoPlayReturn {
  const [progress, setProgress] = useState(0);
  const [isRunning, setIsRunning] = useState(false);

  // Refs for tracking state without causing re-renders
  const progressStartTimeRef = useRef<number>(0);
  const lastSlideIndexRef = useRef<number>(-1);
  const hasInitializedRef = useRef<boolean>(false);
  const prevAnimationTypeRef = useRef<SlideAnimationType | null>(null);
  const typewriterReverseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Reset state when no slides available
    if (slidesLength === 0) {
      setProgress(0);
      setIsRunning(false);
      lastSlideIndexRef.current = -1;
      hasInitializedRef.current = false;
      return;
    }

    // Validate current slide index
    if (currentSlide < 0 || currentSlide >= slidesLength) {
      return;
    }

    // Determine if we should start/restart auto-play
    const slideChanged = currentSlide !== lastSlideIndexRef.current;
    const isFirstLoad = lastSlideIndexRef.current === -1;
    const animationTypeChanged =
      prevAnimationTypeRef.current !== null && prevAnimationTypeRef.current !== animationType;

    // Only proceed if slide changed, first load, or animation type changed
    if (!slideChanged && !isFirstLoad && !animationTypeChanged) {
      return;
    }

    // Update tracking refs
    prevAnimationTypeRef.current = animationType;
    if (isFirstLoad) {
      hasInitializedRef.current = true;
    }

    // Initialize auto-play state
    lastSlideIndexRef.current = currentSlide;
    setIsRunning(true);
    progressStartTimeRef.current = Date.now();
    setProgress(0);

    // Reset typewriter reverse state
    if (onTypewriterReverse) {
      onTypewriterReverse(false);
    }

    // Cleanup function for timeouts and animation frames
    let animationFrameId: number | null = null;
    let slideTimeout: ReturnType<typeof setTimeout> | null = null;

    // Setup typewriter reverse animation if needed
    if (animationType === 'typewriter' && onTypewriterReverse) {
      const reverseStartTime =
        AUTO_PLAY_INTERVAL - SLIDER_CONSTANTS.TYPEWRITER_REVERSE_DURATION;

      if (reverseStartTime > 0) {
        // Clear any existing timeout
        if (typewriterReverseTimeoutRef.current) {
          clearTimeout(typewriterReverseTimeoutRef.current);
        }

        // Start reverse animation
        typewriterReverseTimeoutRef.current = setTimeout(() => {
          if (currentSlide === lastSlideIndexRef.current) {
            onTypewriterReverse(true);
          }
        }, reverseStartTime);
      }
    }

    // Progress animation function
    const animate = () => {
      // Check if we should still be running
      if (currentSlide !== lastSlideIndexRef.current) {
        return;
      }

      const elapsed = Date.now() - progressStartTimeRef.current;
      const newProgress = Math.min((elapsed / AUTO_PLAY_INTERVAL) * 100, 100);
      setProgress(newProgress);

      if (newProgress < 100) {
        animationFrameId = requestAnimationFrame(animate);
      }
    };

    // Start progress animation
    animationFrameId = requestAnimationFrame(animate);

    // Setup slide transition timeout
    const slideIndexAtSetup = currentSlide;
    const slidesLengthAtSetup = slidesLength;

    slideTimeout = setTimeout(() => {
      // Verify we're still on the expected slide
      if (
        slideIndexAtSetup === lastSlideIndexRef.current &&
        slideIndexAtSetup >= 0 &&
        slidesLengthAtSetup > 0
      ) {
        onNextSlide();
      }
    }, AUTO_PLAY_INTERVAL);

    // Cleanup function
    return () => {
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
      }
      if (slideTimeout) {
        clearTimeout(slideTimeout);
      }
      if (typewriterReverseTimeoutRef.current) {
        clearTimeout(typewriterReverseTimeoutRef.current);
        typewriterReverseTimeoutRef.current = null;
      }
    };
  }, [currentSlide, slidesLength, animationType, slidesReady, onNextSlide, onTypewriterReverse]);

  return { progress, isRunning };
}


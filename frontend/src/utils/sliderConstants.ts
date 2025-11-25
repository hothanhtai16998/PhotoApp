/**
 * Constants for slider component
 * Centralized configuration for easy maintenance
 */

export const SLIDER_CONSTANTS = {
  // Timing configuration
  TRANSITION_DURATION: 1200, // Time for slide transition animation (ms)
  IMAGE_VISIBLE_TIME: 5000, // Time image stays visible after transition (ms)
  TYPEWRITER_REVERSE_DURATION: 1500, // Time for typewriter reverse animation (ms)
  ANIMATION_DELAY: 100, // Delay for smooth animation effect (ms)

  // Interaction thresholds
  SWIPE_THRESHOLD: 50, // Minimum distance for swipe (px)

  // Image detection
  ORIENTATION_DETECTION_TIMEOUT: 5000, // Timeout for image orientation detection (ms)

  // Data fetching
  SLIDER_IMAGE_LIMIT: 10, // Maximum number of images to fetch for slider
} as const;

// Calculated constants
export const AUTO_PLAY_INTERVAL =
  SLIDER_CONSTANTS.TRANSITION_DURATION + SLIDER_CONSTANTS.IMAGE_VISIBLE_TIME;

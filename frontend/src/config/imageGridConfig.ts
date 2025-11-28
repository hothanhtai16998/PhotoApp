/**
 * Image Grid Configuration
 * 
 * Edit this file to customize image grid behavior and performance settings.
 */

export const imageGridConfig = {
    // Number of images to load eagerly (above the fold)
    eagerImageCount: 12,
    
    // Preload margins for intersection observer
    preload: {
        // Margin for slow connections (2g, slow-2g)
        slowConnectionMargin: '200px',
        
        // Margin for normal/fast connections
        normalConnectionMargin: '400px',
    },
    
    // Intersection observer threshold (0.01 = trigger when 1% visible)
    intersectionThreshold: 0.01,
    
    // Limit concurrent preloads to avoid overwhelming the browser
    maxConcurrentPreloads: 5,
} as const;


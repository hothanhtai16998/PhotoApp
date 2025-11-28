/**
 * General Application Configuration
 * 
 * Edit this file to customize general app settings.
 */

export const appConfig = {
    // Mobile breakpoint in pixels
    mobileBreakpoint: 768,
    
    // API timeout in milliseconds (2 minutes for file uploads)
    apiTimeout: 120000,
    
    // Storage keys
    storage: {
        // Search history localStorage key
        searchHistoryKey: 'photoApp_searchHistory',
        
        // Image page navigation flag (sessionStorage)
        imagePageFromGridKey: 'imagePage_fromGrid',
        
        // Profile view tracking (sessionStorage) - format: `profile_view_${userId}_${viewerId}`
        profileViewKeyPrefix: 'profile_view_',
    },
} as const;


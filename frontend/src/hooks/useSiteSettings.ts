import { useState, useEffect } from 'react';
import { adminService } from '@/services/adminService';

interface SiteSettings {
    siteName: string;
    siteDescription: string;
    maxUploadSize: number;
    allowedFileTypes: string[];
    maintenanceMode: boolean;
}

const defaultSettings: SiteSettings = {
    siteName: 'PhotoApp',
    siteDescription: 'Discover beautiful photos',
    maxUploadSize: 10,
    allowedFileTypes: ['jpg', 'jpeg', 'png', 'webp'],
    maintenanceMode: false,
};

/**
 * Hook to fetch and use site settings
 * Updates document title when site name changes
 */
export function useSiteSettings() {
    const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const data = await adminService.getSettings();
            if (data.settings) {
                const settingsData = data.settings as {
                    siteName?: string;
                    siteDescription?: string;
                    maxUploadSize?: number;
                    allowedFileTypes?: string[] | string;
                    maintenanceMode?: boolean;
                };
                
                const loadedSettings: SiteSettings = {
                    siteName: (settingsData.siteName as string) || defaultSettings.siteName,
                    siteDescription: (settingsData.siteDescription as string) || defaultSettings.siteDescription,
                    maxUploadSize: (settingsData.maxUploadSize as number) || defaultSettings.maxUploadSize,
                    allowedFileTypes: Array.isArray(settingsData.allowedFileTypes)
                        ? settingsData.allowedFileTypes
                        : typeof settingsData.allowedFileTypes === 'string'
                        ? settingsData.allowedFileTypes.split(',').map(t => t.trim())
                        : defaultSettings.allowedFileTypes,
                    maintenanceMode: (settingsData.maintenanceMode as boolean) || false,
                };
                
                setSettings(loadedSettings);
            }
        } catch (error) {
            // If settings can't be loaded (e.g., user not admin), use defaults
            console.warn('Could not load site settings, using defaults:', error);
            setSettings(defaultSettings);
        } finally {
            setLoading(false);
        }
    };

    // Update document title when site name changes
    useEffect(() => {
        if (settings.siteName && !loading) {
            document.title = settings.siteName;
        }
    }, [settings.siteName, loading]);

    return {
        settings,
        loading,
        refreshSettings: loadSettings,
    };
}


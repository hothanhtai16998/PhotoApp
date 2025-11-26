import type { User } from './user';

import type { Category } from './category';

export interface Image {
  _id: string;
  publicId: string;
  imageTitle: string;
  imageUrl: string;
  // Multiple image sizes for progressive loading (like Unsplash)
  thumbnailUrl?: string; // Small thumbnail for blur-up effect - WebP
  smallUrl?: string; // Small size for grid view - WebP
  regularUrl?: string; // Regular size for detail view - WebP
  // AVIF versions for better compression (modern browsers)
  thumbnailAvifUrl?: string; // Small thumbnail - AVIF
  smallAvifUrl?: string; // Small size - AVIF
  regularAvifUrl?: string; // Regular size - AVIF
  imageAvifUrl?: string; // Original - AVIF
  // imageCategory can be a string (legacy) or populated Category object
  imageCategory: string | Category;
  uploadedBy: User;
  location?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  cameraModel?: string;
  // EXIF metadata
  cameraMake?: string; // Camera manufacturer (e.g., "Canon", "Nikon")
  focalLength?: number; // Focal length in mm (e.g., 60.0)
  aperture?: number; // Aperture f-stop (e.g., 9.0)
  shutterSpeed?: string; // Shutter speed (e.g., "1/80", "2s")
  iso?: number; // ISO sensitivity (e.g., 100)
  dominantColors?: string[]; // Array of color names: 'red', 'orange', 'yellow', etc.
  tags?: string[]; // Array of tag strings for searchability
  views?: number;
  downloads?: number;
  // Daily views and downloads tracking (date string as key: "YYYY-MM-DD")
  dailyViews?: Record<string, number>;
  dailyDownloads?: Record<string, number>;
  // Moderation status
  isModerated?: boolean;
  moderationStatus?: 'pending' | 'approved' | 'rejected' | 'flagged';
  moderatedAt?: string;
  moderationNotes?: string;
  createdAt: string;
  updatedAt: string;
}

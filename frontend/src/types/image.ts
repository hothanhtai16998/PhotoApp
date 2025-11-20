import type { User } from './user';

import type { Category } from './category';

export interface Image {
	_id: string;
	publicId: string;
	imageTitle: string;
	imageUrl: string;
	// Multiple image sizes for progressive loading (like Unsplash)
	thumbnailUrl?: string; // Small thumbnail for blur-up effect
	smallUrl?: string; // Small size for grid view
	regularUrl?: string; // Regular size for detail view
	// imageCategory can be a string (legacy) or populated Category object
	imageCategory: string | Category;
	uploadedBy: User;
	location?: string;
	coordinates?: {
		latitude: number;
		longitude: number;
	};
	cameraModel?: string;
	views?: number;
	downloads?: number;
	createdAt: string;
	updatedAt: string;
}

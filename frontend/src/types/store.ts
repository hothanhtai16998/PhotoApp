import type { User } from './user';
import type { Image } from './image';

export type UploadImageData = {
	image: File;
	imageTitle: string;
	imageCategory: string;
	location?: string;
	coordinates?: {
		latitude: number;
		longitude: number;
	};
	cameraModel?: string;
};

export interface AuthState {
	accessToken: string | null;
	user: User | null;
	loading: boolean;
	isInitializing: boolean;

	setAccessToken: (
		accessToken: string
	) => void;
	clearState: () => void;
	signUp: (
		username: string,
		password: string,
		email: string,
		firstName: string,
		lastName: string,
		phone?: string,
		bio?: string
	) => Promise<void>;
	signIn: (
		username: string,
		password: string
	) => Promise<void>;
	signOut: () => Promise<void>;
	fetchMe: () => Promise<void>;
	refresh: () => Promise<void>;
	initializeApp: () => Promise<void>;
}

export interface ImageState {
	images: Image[];
	loading: boolean;
	error: string | null;
	uploadProgress: number;
	pagination: {
		page: number;
		limit: number;
		total: number;
		pages: number;
	} | null;
	currentSearch?: string;
	currentCategory?: string;
	deletedImageIds: string[]; // Track deleted image IDs to filter them out
	uploadImage: (
		data: UploadImageData
	) => Promise<void>;
	fetchImages: (params?: {
		page?: number;
		limit?: number;
		search?: string;
		category?: string;
		_refresh?: boolean;
	}) => Promise<void>;
	removeImage: (imageId: string) => void;
}

import type { Image } from './image';
import type { User } from './user';

export interface Collection {
	_id: string;
	name: string;
	description?: string;
	createdBy: User | string;
	images: Image[] | string[];
	imageCount?: number;
	isPublic: boolean;
	coverImage?: Image | string | null;
	views?: number;
	createdAt: string;
	updatedAt: string;
}

export interface CreateCollectionData {
	name: string;
	description?: string;
	isPublic?: boolean;
}

export interface UpdateCollectionData {
	name?: string;
	description?: string;
	isPublic?: boolean;
	coverImage?: string | null;
}

export interface CollectionResponse {
	success: boolean;
	collection?: Collection;
	collections?: Collection[];
	message?: string;
}


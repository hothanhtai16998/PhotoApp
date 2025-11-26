import api from '@/lib/axios';
import type {
	Collection,
	CreateCollectionData,
	UpdateCollectionData,
	CollectionResponse,
} from '@/types/collection';

export const collectionService = {
	/**
	 * Get all collections for the authenticated user
	 */
	getUserCollections: async (): Promise<Collection[]> => {
		const response = await api.get<CollectionResponse>('/collections');
		if (response.data.success && response.data.collections) {
			return response.data.collections;
		}
		throw new Error('Failed to fetch collections');
	},

	/**
	 * Get a single collection by ID
	 */
	getCollectionById: async (collectionId: string): Promise<Collection> => {
		const response = await api.get<CollectionResponse>(`/collections/${collectionId}`);
		if (response.data.success && response.data.collection) {
			return response.data.collection;
		}
		throw new Error('Failed to fetch collection');
	},

	/**
	 * Create a new collection
	 */
	createCollection: async (data: CreateCollectionData): Promise<Collection> => {
		const response = await api.post<CollectionResponse>('/collections', data);
		if (response.data.success && response.data.collection) {
			return response.data.collection;
		}
		throw new Error(response.data.message || 'Failed to create collection');
	},

	/**
	 * Update a collection
	 */
	updateCollection: async (
		collectionId: string,
		data: UpdateCollectionData
	): Promise<Collection> => {
		const response = await api.patch<CollectionResponse>(`/collections/${collectionId}`, data);
		if (response.data.success && response.data.collection) {
			return response.data.collection;
		}
		throw new Error(response.data.message || 'Failed to update collection');
	},

	/**
	 * Delete a collection
	 */
	deleteCollection: async (collectionId: string): Promise<void> => {
		const response = await api.delete<CollectionResponse>(`/collections/${collectionId}`);
		if (!response.data.success) {
			throw new Error(response.data.message || 'Failed to delete collection');
		}
	},

	/**
	 * Add image to collection
	 */
	addImageToCollection: async (
		collectionId: string,
		imageId: string
	): Promise<Collection> => {
		const response = await api.post<CollectionResponse>(
			`/collections/${collectionId}/images`,
			{ imageId }
		);
		if (response.data.success && response.data.collection) {
			return response.data.collection;
		}
		throw new Error(response.data.message || 'Failed to add image to collection');
	},

	/**
	 * Remove image from collection
	 */
	removeImageFromCollection: async (
		collectionId: string,
		imageId: string
	): Promise<Collection> => {
		const response = await api.delete<CollectionResponse>(
			`/collections/${collectionId}/images/${imageId}`
		);
		if (response.data.success && response.data.collection) {
			return response.data.collection;
		}
		throw new Error(response.data.message || 'Failed to remove image from collection');
	},

	/**
	 * Get collections that contain a specific image
	 */
	getCollectionsContainingImage: async (imageId: string): Promise<Collection[]> => {
		const response = await api.get<CollectionResponse>(
			`/collections/containing/${imageId}`
		);
		if (response.data.success && response.data.collections) {
			return response.data.collections;
		}
		throw new Error('Failed to fetch collections');
	},

	/**
	 * Reorder images in a collection
	 */
	reorderCollectionImages: async (
		collectionId: string,
		imageIds: string[]
	): Promise<Collection> => {
		const response = await api.patch<CollectionResponse>(
			`/collections/${collectionId}/images/reorder`,
			{ imageIds }
		);
		if (response.data.success && response.data.collection) {
			return response.data.collection;
		}
		throw new Error(response.data.message || 'Failed to reorder images');
	},
};



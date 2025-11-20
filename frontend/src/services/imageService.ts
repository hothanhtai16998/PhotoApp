import api from '@/lib/axios';
import type { UploadImageData } from '@/types/store';

interface FetchImagesParams {
	page?: number;
	limit?: number;
	search?: string;
	category?: string;
}

import type { Image } from '@/types/image';

interface FetchImagesResponse {
	images: Image[];
	pagination?: {
		page: number;
		limit: number;
		total: number;
		pages: number;
	};
}

export const imageService = {
	uploadImage: async (
		data: UploadImageData,
		onUploadProgress?: (
			progress: number
		) => void
	) => {
		const formData = new FormData();
		formData.append(
			'image',
			data.image
		);
		formData.append(
			'imageTitle',
			data.imageTitle
		);
		formData.append(
			'imageCategory',
			data.imageCategory
		);

		if (data.location) {
			formData.append(
				'location',
				data.location
			);
		}
		if (data.coordinates) {
			formData.append(
				'coordinates',
				JSON.stringify(data.coordinates)
			);
		}
		if (data.cameraModel) {
			formData.append(
				'cameraModel',
				data.cameraModel
			);
		}

		const res = await api.post(
			'/images/upload',
			formData,
			{
				headers: {
					'Content-Type':
						'multipart/form-data',
				},
				withCredentials: true,
				timeout: 120000, // 2 minutes for uploads
				onUploadProgress: (
					progressEvent
				) => {
					if (
						onUploadProgress &&
						progressEvent.total
					) {
						// Calculate HTTP upload progress (uploading file to our backend)
						// Cap at 85% - the remaining 15% is for S3 upload and image processing on backend
						const httpProgress =
							Math.round(
								(progressEvent.loaded *
									100) /
									progressEvent.total
							);
						// Show 0-85% during HTTP upload to backend
						const percentCompleted =
							Math.min(
								85,
								httpProgress
							);
						onUploadProgress(
							percentCompleted
						);
					}
				},
			}
		);

		return res.data;
	},

	fetchImages: async (
		params?: FetchImagesParams & {
			_refresh?: boolean;
		}
	): Promise<FetchImagesResponse> => {
		const queryParams =
			new URLSearchParams();

		if (params?.page) {
			queryParams.append(
				'page',
				params.page.toString()
			);
		}
		if (params?.limit) {
			queryParams.append(
				'limit',
				params.limit.toString()
			);
		}
		if (params?.search) {
			queryParams.append(
				'search',
				params.search
			);
		}
		if (params?.category) {
			queryParams.append(
				'category',
				params.category
			);
		}

		// Add cache-busting timestamp if refresh is requested
		if (params?._refresh) {
			queryParams.append(
				'_t',
				Date.now().toString()
			);
		}

		const queryString =
			queryParams.toString();
		const url = queryString
			? `/images?${queryString}`
			: '/images';

		const res = await api.get(url, {
			withCredentials: true,
			// Cache busting is handled by timestamp query parameter (_t)
		});

		// Handle both old format (just images array) and new format (with pagination)
		if (res.data.images) {
			return res.data;
		}
		return { images: res.data };
	},

	fetchUserImages: async (
		userId: string,
		params?: FetchImagesParams & {
			_refresh?: boolean;
		}
	): Promise<FetchImagesResponse> => {
		const queryParams =
			new URLSearchParams();

		if (params?.page) {
			queryParams.append(
				'page',
				params.page.toString()
			);
		}
		if (params?.limit) {
			queryParams.append(
				'limit',
				params.limit.toString()
			);
		}

		// Add cache-busting timestamp if refresh is requested
		if (params?._refresh) {
			queryParams.append(
				'_t',
				Date.now().toString()
			);
		}

		const queryString =
			queryParams.toString();
		const url = queryString
			? `/images/user/${userId}?${queryString}`
			: `/images/user/${userId}`;

		const res = await api.get(url, {
			withCredentials: true,
			// Cache busting is handled by timestamp query parameter (_t)
		});

		if (res.data.images) {
			return res.data;
		}
		return { images: res.data };
	},

	incrementView: async (
		imageId: string
	): Promise<{ views: number }> => {
		const res = await api.patch(
			`/images/${imageId}/view`,
			{},
			{
				withCredentials: true,
			}
		);
		return res.data;
	},

	incrementDownload: async (
		imageId: string
	): Promise<{ downloads: number }> => {
		const res = await api.patch(
			`/images/${imageId}/download`,
			{},
			{
				withCredentials: true,
			}
		);
		return res.data;
	},
};

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { toast } from 'sonner';
import { imageService } from '@/services/imageService';
import type {
	ImageState,
	UploadImageData,
} from '@/types/store';

export const useImageStore = create(
	immer<ImageState>((set) => ({
		images: [],
		loading: false,
		error: null,
		pagination: null,
		uploadProgress: 0,
		currentSearch: undefined as
			| string
			| undefined,
		currentCategory: undefined as
			| string
			| undefined,
		uploadImage: async (
			data: UploadImageData
		) => {
			set((state) => {
				state.loading = true;
				state.error = null;
				state.uploadProgress = 0;
			});

			let progressInterval: ReturnType<
				typeof setInterval
			> | null = null;

			try {
				const response =
					await imageService.uploadImage(
						data,
						(progress) => {
							set((state) => {
								// Progress tracks HTTP upload (0-85%)
								state.uploadProgress =
									progress;
							});
						}
					);
				// HTTP upload to backend complete (85%)
				// Now backend is uploading to Cloudinary - simulate progress 85-95%
				// This gives visual feedback that processing is happening
				let cloudinaryProgress = 85;

				// Start progress simulation
				progressInterval = setInterval(
					() => {
						cloudinaryProgress += 1;
						if (
							cloudinaryProgress < 95
						) {
							set((state) => {
								state.uploadProgress =
									cloudinaryProgress;
							});
						} else {
							if (progressInterval)
								clearInterval(
									progressInterval
								);
							progressInterval = null;
						}
					},
					500
				); // Update every 500ms

				// Backend response received = Cloudinary upload AND processing complete
				// The response only comes after Cloudinary finishes
				if (progressInterval) {
					clearInterval(
						progressInterval
					);
					progressInterval = null;
				}
				set((state) => {
					// Ensure uploaded image has createdAt timestamp if missing
					const uploadedImage = {
						...response.image,
						createdAt:
							response.image
								.createdAt ||
							new Date().toISOString(),
					};
					state.images.unshift(
						uploadedImage
					);
					// Now set to 100% - everything is complete
					state.uploadProgress = 100;
					state.loading = false;
				});
				toast.success(
					'Image uploaded successfully!'
				);
			} catch (error: unknown) {
				// Clear progress interval if it's still running
				if (progressInterval) {
					clearInterval(
						progressInterval
					);
					progressInterval = null;
				}

				const axiosError = error as {
					response?: {
						data?: {
							message?: string;
						};
						status?: number;
					};
					code?: string;
					message?: string;
				};

				// Handle timeout errors specifically
				let message =
					'Failed to upload image. Please try again.';

				if (
					axiosError.code ===
						'ECONNABORTED' ||
					axiosError.message?.includes(
						'timeout'
					)
				) {
					message =
						'Upload timeout: The upload took too long. Please try again with a smaller file or check your internet connection.';
				} else if (
					axiosError.response?.data
						?.message
				) {
					message =
						axiosError.response.data
							.message;
				} else if (axiosError.message) {
					message = axiosError.message;
				}

				set((state) => {
					state.loading = false;
					state.error = message;
					state.uploadProgress = 0;
				});
				toast.error(message);
			}
		},
		fetchImages: async (params?: {
			page?: number;
			limit?: number;
			search?: string;
			category?: string;
			_refresh?: boolean;
		}) => {
			// Prevent concurrent requests - if already loading and not a refresh, skip
			const currentState =
				useImageStore.getState();
			if (
				currentState.loading &&
				!params?._refresh
			) {
				return;
			}

			set((state) => {
				state.loading = true;
				state.error = null;
			});
			try {
				const response =
					await imageService.fetchImages(
						params
					);
				set((state) => {
					// Handle both array response and object with images property
					const newImages =
						Array.isArray(response)
							? response
							: response.images || [];

					// Merge strategy: If it's a new search/category, replace. Otherwise, append for pagination
					const isNewQuery =
						params?.search !==
							undefined ||
						params?.category !==
							undefined ||
						params?.page === 1 ||
						!params?.page;

					// Update current search/category for infinite scroll
					if (isNewQuery) {
						state.currentSearch =
							params?.search;
						state.currentCategory =
							params?.category;
					}

					if (isNewQuery) {
						// New query - replace images, but preserve recently uploaded images
						// that might not be in the backend response yet (within last 15 minutes)
						// This is especially important after upload when refreshing
						const now = Date.now();
						const recentUploads =
							state.images.filter(
								(img) => {
									// Keep images that were uploaded in the last 15 minutes
									// These might not be in the backend response yet or might be filtered out
									// IMPORTANT: Preserve them even if category doesn't match, because:
									// 1. Backend might not have indexed them yet
									// 2. Category might be stored differently (string vs object)
									// 3. User just uploaded it, so it should be visible
									if (img.createdAt) {
										try {
											const uploadTime =
												new Date(
													img.createdAt
												).getTime();
											if (
												!isNaN(
													uploadTime
												)
											) {
												const isRecent =
													now -
														uploadTime <
													900000; // 15 minutes
												if (isRecent) {
													return true; // Always preserve recent uploads
												}
											}
										} catch {
											// If date parsing fails, keep it as a safety measure during refresh
											if (
												params?._refresh ===
												true
											) {
												return true;
											}
										}
									}
									// If no createdAt or invalid date, keep ALL existing images during refresh
									// This ensures uploaded images stay visible even if backend hasn't returned them
									return (
										params?._refresh ===
										true
									);
								}
							);

						// Merge: recent uploads first, then fetched images (avoiding duplicates)
						const fetchedIds = new Set(
							newImages.map(
								(img) => img._id
							)
						);
						// Keep recent uploads that aren't in the fetched response
						// This is important because:
						// 1. Backend might not have indexed them yet
						// 2. Category filter might exclude them
						// 3. They were just uploaded, so user expects to see them
						const uniqueRecentUploads =
							recentUploads.filter(
								(img) =>
									!fetchedIds.has(
										img._id
									)
							);

						// Debug: Log preserved images to help troubleshoot
						if (
							uniqueRecentUploads.length >
								0 &&
							params?._refresh
						) {
							console.log(
								'Preserving recent uploads:',
								uniqueRecentUploads.length,
								uniqueRecentUploads.map(
									(img) => ({
										id: img._id,
										title:
											img.imageTitle,
										category:
											typeof img.imageCategory ===
											'string'
												? img.imageCategory
												: img
														.imageCategory
														?.name,
										createdAt:
											img.createdAt,
									})
								)
							);
						}

						// Combine and sort by createdAt descending (newest first) to ensure proper order
						const combined = [
							...uniqueRecentUploads,
							...newImages,
						];
						combined.sort((a, b) => {
							const dateA = a.createdAt
								? new Date(
										a.createdAt
								  ).getTime()
								: 0;
							const dateB = b.createdAt
								? new Date(
										b.createdAt
								  ).getTime()
								: 0;
							// If dates are equal or very close (within 1 second), preserve original order
							if (
								Math.abs(
									dateB - dateA
								) < 1000
							) {
								const aIsRecent =
									uniqueRecentUploads.some(
										(ru) =>
											ru._id === a._id
									);
								const bIsRecent =
									uniqueRecentUploads.some(
										(ru) =>
											ru._id === b._id
									);
								if (
									aIsRecent &&
									!bIsRecent
								)
									return -1;
								if (
									!aIsRecent &&
									bIsRecent
								)
									return 1;
							}
							return dateB - dateA;
						});

						state.images = combined;
					} else {
						// Pagination - merge with existing, avoiding duplicates
						const existingIds = new Set(
							state.images.map(
								(img) => img._id
							)
						);
						const uniqueNewImages =
							newImages.filter(
								(img) =>
									!existingIds.has(
										img._id
									)
							);
						state.images = [
							...state.images,
							...uniqueNewImages,
						];
					}

					state.pagination =
						Array.isArray(response)
							? null
							: response.pagination ||
							  null;
					state.loading = false;
				});
			} catch (error: unknown) {
				const message =
					(
						error as {
							response?: {
								data?: {
									message?: string;
								};
							};
						}
					)?.response?.data?.message ||
					'Failed to fetch images. Please try again.';
				set((state) => {
					state.loading = false;
					state.error = message;
				});
				toast.error(message);
			}
		},
	}))
);

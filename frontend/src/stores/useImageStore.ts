import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { toast } from 'sonner';
import axios from 'axios';
import { imageService } from '@/services/imageService';
import type { ImageState, UploadImageData } from '@/types/store';
import type { Image, FetchImagesParams } from '@/types/image';
import type { AxiosErrorResponse, ApiErrorResponse } from '@/types/errors';

export const useImageStore = create(
  immer<ImageState>((set) => ({
    images: [],
    loading: false,
    error: null,
    pagination: null,
    uploadProgress: 0,
    currentSearch: undefined as string | undefined,
    currentCategory: undefined as string | undefined,
    currentLocation: undefined as string | undefined,
    deletedImageIds: [] as string[],
    uploadImage: async (data: UploadImageData) => {
      set((state) => {
        state.loading = true;
        state.error = null;
        state.uploadProgress = 0;
      });

      let progressInterval: ReturnType<typeof setInterval> | null = null;

      try {
        const response = await imageService.uploadImage(data, (progress) => {
          set((state) => {
            // Progress tracks HTTP upload (0-85%)
            state.uploadProgress = progress;
          });
        });
        // HTTP upload to backend complete (85%)
        // Now backend is processing and uploading to S3 - simulate progress 85-95%
        // This gives visual feedback that processing is happening
        let s3Progress = 85;

        // Start progress simulation
        progressInterval = setInterval(() => {
          s3Progress += 1;
          if (s3Progress < 95) {
            set((state) => {
              state.uploadProgress = s3Progress;
            });
          } else {
            if (progressInterval) clearInterval(progressInterval);
            progressInterval = null;
          }
        }, 500); // Update every 500ms

        // Backend response received = S3 upload AND processing complete
        // The response only comes after S3 upload and image processing finishes
        if (progressInterval) {
          clearInterval(progressInterval);
          progressInterval = null;
        }
        
        set((state) => {
          // Ensure uploaded image has createdAt timestamp if missing
          const uploadedImage = {
            ...response.image,
            createdAt: response.image.createdAt || new Date().toISOString(),
          };
          
          // Only add to state if image is approved
          // Regular users' pending images won't appear until admin approves them
          // Admin images are auto-approved on backend, so they'll have moderationStatus: 'approved'
          const isApproved = uploadedImage.moderationStatus === 'approved' || 
                           !uploadedImage.moderationStatus; // Backward compatibility - old images without moderation status
          
          if (isApproved) {
            state.images.unshift(uploadedImage);
          }
          
          // Now set to 100% - everything is complete
          state.uploadProgress = 100;
          state.loading = false;
        });
        
        // Show appropriate message based on moderation status
        const uploadedImage = response.image;
        if (uploadedImage.moderationStatus === 'pending') {
          toast.success('Image uploaded successfully! It will appear after admin approval.');
        } else {
          toast.success('Image uploaded successfully!');
        }
      } catch (error: unknown) {
        // Clear progress interval if it's still running
        if (progressInterval) {
          clearInterval(progressInterval);
          progressInterval = null;
        }

        const axiosError = error as AxiosErrorResponse;

        // Handle timeout errors specifically
        let message = 'Failed to upload image. Please try again.';

        if (
          axiosError.code === 'ECONNABORTED' ||
          axiosError.message?.includes('timeout')
        ) {
          message =
            'Upload timeout: The upload took too long. Please try again with a smaller file or check your internet connection.';
        } else if (axiosError.response?.data?.message) {
          message = axiosError.response.data.message;
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
    fetchImages: async (params?: FetchImagesParams, signal?: AbortSignal) => {
      // Prevent concurrent requests - use atomic check-and-set to avoid race condition
      let shouldProceed = false;
      
      set((state) => {
        // Atomic check: if already loading and not a refresh, skip
        if (state.loading && !params?._refresh) {
          shouldProceed = false;
          return; // Don't update state
        }
        // Set loading flag atomically
        state.loading = true;
        state.error = null;
        shouldProceed = true;

        // Check if category/search/location changed
        const currentCategory = state.currentCategory;
        const currentSearch = state.currentSearch;
        const currentLocation = state.currentLocation;
        const categoryChanged =
          params?.category !== undefined && params.category !== currentCategory;
        const searchChanged =
          params?.search !== undefined && params.search !== currentSearch;
        const locationChanged =
          params?.location !== undefined && params.location !== currentLocation;

        // If it's a new query (category/search/location changed or page 1), clear images
        if (
          categoryChanged ||
          searchChanged ||
          locationChanged ||
          params?.page === 1 ||
          !params?.page
        ) {
          state.images = [];
          state.pagination = null;
        }
      });

      // If we skipped due to concurrent request, return early
      if (!shouldProceed) {
        return;
      }

      try {
        // Always use cache-busting on initial load, category change, or search change to ensure fresh data
        // This prevents deleted images or wrong category images from appearing due to browser cache
        // Get current state from the store state (already set above) instead of getState() to avoid stale reads
        const state = useImageStore.getState();
        const currentCategory = state.currentCategory;
        const currentSearch = state.currentSearch;
        const categoryChanged =
          params?.category !== undefined && params.category !== currentCategory;
        const searchChanged =
          params?.search !== undefined && params.search !== currentSearch;
        const shouldBustCache =
          !params?.page ||
          params.page === 1 ||
          params?._refresh ||
          categoryChanged ||
          searchChanged;
        const fetchParams =
          shouldBustCache && !params?._refresh
            ? { ...params, _refresh: true }
            : params;

        // Color filter is already included in params if provided
        const response = await imageService.fetchImages(fetchParams, signal);
        set((state) => {
          // Handle both array response and object with images property
          const newImagesRaw = Array.isArray(response)
            ? response
            : response.images || [];

          // Filter out deleted images from the response
          // Use Set for O(1) lookup instead of O(n) array includes
          const deletedIdsSet = new Set(state.deletedImageIds);
          const newImages = newImagesRaw.filter(
            (img: Image) => !deletedIdsSet.has(img._id)
          );

          // Merge strategy: If it's a new search/category/location, replace. Otherwise, append for pagination
          const isNewQuery =
            params?.search !== undefined ||
            params?.category !== undefined ||
            params?.location !== undefined ||
            params?.page === 1 ||
            !params?.page;

          // Update current search/category/location for infinite scroll
          if (isNewQuery) {
            state.currentSearch = params?.search;
            state.currentCategory = params?.category;
            state.currentLocation = params?.location;
          }

          if (isNewQuery) {
            // New query - replace images, but preserve recently uploaded images
            // that might not be in the backend response yet (within last 15 minutes)
            // This is especially important after upload when refreshing
            const now = Date.now();
            const recentUploads = state.images.filter((img) => {
              // Keep images that were uploaded in the last 15 minutes
              // These might not be in the backend response yet or might be filtered out
              // BUT: Only preserve if they match the current category filter!
              const currentCategory = params?.category;
              if (img.createdAt) {
                try {
                  const uploadTime = new Date(img.createdAt).getTime();
                  if (!isNaN(uploadTime)) {
                    const isRecent = now - uploadTime < 900000; // 15 minutes
                    if (isRecent) {
                      // Check if category matches current filter
                      if (currentCategory !== undefined) {
                        // If filtering by category, only preserve if category matches
                        const imgCategoryName =
                          typeof img.imageCategory === 'string'
                            ? img.imageCategory
                            : img.imageCategory?.name;
                        if (
                          imgCategoryName &&
                          imgCategoryName.toLowerCase() ===
                            currentCategory.toLowerCase()
                        ) {
                          return true; // Preserve - category matches
                        }
                        return false; // Don't preserve - category doesn't match
                      }
                      // If no category filter, preserve all recent uploads
                      return true;
                    }
                  }
                } catch {
                  // If date parsing fails, only keep during refresh if no category filter
                  if (
                    params?._refresh === true &&
                    currentCategory === undefined
                  ) {
                    return true;
                  }
                }
              }
              // During refresh after deletion, don't preserve images without createdAt
              // Only preserve images that were recently uploaded (have valid createdAt)
              return false;
            });

            // Merge: recent uploads first, then fetched images (avoiding duplicates)
            const fetchedIds = new Set(newImages.map((img) => img._id));
            // Keep recent uploads that aren't in the fetched response
            // This is important because:
            // 1. Backend might not have indexed them yet
            // 2. Category filter might exclude them
            // 3. They were just uploaded, so user expects to see them
            const uniqueRecentUploads = recentUploads.filter(
              (img) => !fetchedIds.has(img._id)
            );

            // Combine and sort by createdAt descending (newest first) to ensure proper order
            const combined = [...uniqueRecentUploads, ...newImages];
            combined.sort((a, b) => {
              const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
              const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
              // If dates are equal or very close (within 1 second), preserve original order
              if (Math.abs(dateB - dateA) < 1000) {
                const aIsRecent = uniqueRecentUploads.some(
                  (ru) => ru._id === a._id
                );
                const bIsRecent = uniqueRecentUploads.some(
                  (ru) => ru._id === b._id
                );
                if (aIsRecent && !bIsRecent) return -1;
                if (!aIsRecent && bIsRecent) return 1;
              }
              return dateB - dateA;
            });

            state.images = combined;
          } else {
            // Pagination - merge with existing, avoiding duplicates
            const existingIds = new Set(state.images.map((img) => img._id));
            const uniqueNewImages = newImages.filter(
              (img) => !existingIds.has(img._id)
            );
            state.images = [...state.images, ...uniqueNewImages];
          }

          state.pagination = Array.isArray(response)
            ? null
            : response.pagination || null;
          state.loading = false;
        });
      } catch (error: unknown) {
        // Ignore cancelled requests (user navigated away or changed filters)
        if (axios.isCancel(error) || (error as { code?: string })?.code === 'ERR_CANCELED') {
          // Silently ignore cancelled requests
          set((state) => {
            state.loading = false;
          });
          return;
        }

        const message =
          (error as ApiErrorResponse)?.response?.data?.message ||
          'Failed to fetch images. Please try again.';
        set((state) => {
          state.loading = false;
          state.error = message;
        });
        toast.error(message);
      }
    },
    removeImage: (imageId: string) => {
      set((state) => {
        // Add to deleted IDs array so it's filtered out in future fetches
        if (!state.deletedImageIds.includes(imageId)) {
          state.deletedImageIds.push(imageId);
        }

        // Prevent memory leak: limit deletedImageIds array size to last 1000 deletions
        // This is sufficient for filtering while preventing unbounded growth
        if (state.deletedImageIds.length > 1000) {
          state.deletedImageIds = state.deletedImageIds.slice(-1000);
        }

        const beforeCount = state.images.length;
        state.images = state.images.filter((img) => img._id !== imageId);
        const afterCount = state.images.length;

        // Debug: Log if image was actually removed from current store
        if (beforeCount === afterCount) {
          console.log(
            `Image ${imageId} not in current store, but added to deleted list to prevent future fetches`
          );
        } else {
          console.log(
            `Successfully removed image ${imageId} from store. Count: ${beforeCount} -> ${afterCount}`
          );
        }

        // Update pagination total if it exists
        if (state.pagination) {
          state.pagination.total = Math.max(0, state.pagination.total - 1);
        }
      });
    },
  }))
);

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { authService } from '@/services/authService';
import { useAuthStore } from '@/stores/useAuthStore';
import type { UserState } from '@/types/store';
import type { HttpErrorResponse } from '@/types/errors';

export const useUserStore = create(
	immer<UserState>((set) => ({
		user: null,
		loading: false,

		fetchMe: async () => {
			try {
				set((state) => {
					state.loading = true;
				});

				const user = await authService.fetchMe();

				set((state) => {
					state.user = user;
					state.loading = false;
				});
			} catch (error) {
				// Only clear state if it's a 401/403 (unauthorized/forbidden)
				// This means the user is actually not authenticated
				const errorStatus = (error as HttpErrorResponse)?.response?.status;

				if (errorStatus === 401 || errorStatus === 403) {
					// User is not authenticated, clear both user and auth state
					set((state) => {
						state.user = null;
						state.loading = false;
					});
					// Also clear auth token
					useAuthStore.getState().clearAuth();
				} else {
					// For other errors (network, 500, etc.), keep existing user data
					set((state) => {
						state.loading = false;
					});
				}
				// Don't show error toast on fetchMe failure during initialization
				// It's expected if user is not logged in
			}
		},

		clearUser: () => {
			set((state) => {
				state.user = null;
			});
		},
	}))
);





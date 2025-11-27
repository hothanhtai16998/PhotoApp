import { create } from 'zustand';
import { toast } from 'sonner';
import { authService } from '@/services/authService';
import type { AuthState } from '@/types/store';
import type { ApiErrorResponse, ValidationErrorResponse, HttpErrorResponse } from '@/types/errors';

export const useAuthStore =
	create<AuthState>((set, get) => ({
		accessToken: null,
		user: null,
		loading: false,
		isInitializing: true,

		setAccessToken: (accessToken) => {
			set({ accessToken });
		},
		clearState: () => {
			set({
				accessToken: null,
				user: null,
				loading: false,
			});
		},

		signUp: async (
			username,
			password,
			email,
			firstName,
			lastName,
			phone,
			bio
		) => {
			try {
				set({ loading: true });

				//  gọi api
				await authService.signUp(
					username,
					password,
					email,
					firstName,
					lastName,
					phone,
					bio
				);

				toast.success(
					'Đăng ký thành công! Bạn sẽ được chuyển sang trang đăng nhập.'
				);
			} catch (error: unknown) {
				const message =
					(error as ApiErrorResponse)?.response?.data?.message ||
					'Đăng ký thất bại. Vui lòng thử lại.';
				toast.error(message);
			} finally {
				set({ loading: false });
			}
		},

		signIn: async (
			username,
			password
		) => {
			try {
				set({ loading: true });

				const response =
					await authService.signIn(
						username,
						password
					);

				// Set access token
				if (response.accessToken) {
					get().setAccessToken(
						response.accessToken
					);
				}

				// Always fetch full user data with permissions from /users/me
				// This ensures we have the latest user data including permissions
				await get().fetchMe();

				toast.success(
					'Chào mừng bạn quay lại 🎉'
				);
			} catch (error: unknown) {
				const errorResponse = error as ValidationErrorResponse;

				// Handle validation errors (express-validator format)
				if (
					errorResponse.response?.data?.errors &&
					Array.isArray(errorResponse.response.data.errors)
				) {
					const validationErrors =
						errorResponse.response.data.errors
							.map(
								(err) =>
									err.msg ||
									err.message ||
									'Validation failed'
							)
							.join(', ');
					toast.error(
						`Lỗi xác thực: ${validationErrors}`
					);
				} else {
					const message =
						errorResponse.response?.data
							?.message ||
						'Đăng nhập thất bại. Kiểm tra lại tên tài khoản hoặc mật khẩu của bạn.';
					toast.error(message);
				}
				// Re-throw error so form can handle navigation
				throw error;
			} finally {
				set({ loading: false });
			}
		},

		signOut: async () => {
			try {
				get().clearState();
				await authService.signOut();
				toast.success(
					'Đăng xuất thành công!'
				);
			} catch {
				// Don't show error toast on logout failure
				// User is already logged out locally
				// Log error silently
			}
		},

		fetchMe: async () => {
			try {
				set({ loading: true });
				const user =
					await authService.fetchMe();

				set({ user });
			} catch (error) {
				// Only clear state if it's a 401/403 (unauthorized/forbidden)
				// This means the user is actually not authenticated
				const errorStatus = (error as HttpErrorResponse)?.response?.status;
				
				if (errorStatus === 401 || errorStatus === 403) {
					// User is not authenticated, clear state
					set({
						user: null,
						accessToken: null,
					});
				}
				// For other errors (network, 500, etc.), keep existing user data
				// Don't show error toast on fetchMe failure during initialization
				// It's expected if user is not logged in
			} finally {
				set({ loading: false });
			}
		},

		refresh: async () => {
			try {
				const {
					user,
					fetchMe,
					setAccessToken,
				} = get();
				const accessToken =
					await authService.refresh();

				setAccessToken(accessToken);

				if (!user) {
					await fetchMe();
				}
			} catch (error: unknown) {
				const errorStatus = (error as HttpErrorResponse)?.response?.status;
				// Only show error if it's not a 401/403 (expected when not logged in)
				if (
					errorStatus !== 401 &&
					errorStatus !== 403
				) {
					toast.error(
						'Session hết hạn. Vui lòng đăng nhập lại.'
					);
				}
				get().clearState();
			}
		},

		initializeApp: async () => {
			try {
				await get().refresh();
			} catch {
				// Silently handle initialization errors
				// User might not be logged in
			} finally {
				set({ isInitializing: false });
			}
		},
	}));

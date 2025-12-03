import { create } from 'zustand';
import { toast } from 'sonner';
import { authService } from '@/services/authService';
import type { AuthState } from '@/types/store';
import type { ApiErrorResponse, ValidationErrorResponse, HttpErrorResponse } from '@/types/errors';
import { dispatchLogout, dispatchLoginSuccess } from '@/utils/authEvents';

export const useAuthStore = create<AuthState>((set, get) => ({
	accessToken: null,
	loading: false,
	isInitializing: true,

	setAccessToken: (accessToken) => {
		set({ accessToken });
	},

	clearAuth: () => {
		set({
			accessToken: null,
			loading: false,
		});
		// Dispatch event to notify other stores (decoupled from useUserStore)
		dispatchLogout();
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
					(error as ApiErrorResponse)?.response?.data?.message ??
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
					get().setAccessToken(response.accessToken);
				}

				// Dispatch event to notify other stores to fetch user data (decoupled)
				dispatchLoginSuccess();

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
									err.msg ??
									err.message ??
									'Validation failed'
							)
							.join(', ');
					toast.error(
						`Lỗi xác thực: ${validationErrors}`
					);
				} else {
					const message =
						errorResponse.response?.data
							?.message ??
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
				get().clearAuth();
				await authService.signOut();
				toast.success('Đăng xuất thành công!');
			} catch {
				// Don't show error toast on logout failure
				// User is already logged out locally
				// Log error silently
			}
		},

		refresh: async () => {
			try {
				const { setAccessToken } = get();
				const accessToken = await authService.refresh();

				setAccessToken(accessToken);

				// Dispatch event to let user store handle fetching user data
				dispatchLoginSuccess();
			} catch (error: unknown) {
				const errorStatus = (error as HttpErrorResponse)?.response?.status;
				// Only show error if it's not a 401/403 (expected when not logged in)
				if (errorStatus !== 401 && errorStatus !== 403) {
					toast.error('Session hết hạn. Vui lòng đăng nhập lại.');
				}
				get().clearAuth();
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

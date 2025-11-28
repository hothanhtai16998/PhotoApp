import { useAuthStore } from '@/stores/useAuthStore';
import axios, {
	type AxiosError,
	type InternalAxiosRequestConfig,
} from 'axios';
import { appConfig } from '@/config/appConfig';

const api = axios.create({
	baseURL:
		import.meta.env.MODE ===
		'development'
			? 'http://localhost:3000/api'
			: '/api',
	withCredentials: true,
	timeout: appConfig.apiTimeout, // 2 minutes for file uploads (can be overridden per request)
});

// Helper function to get CSRF token from cookie
const getCsrfTokenFromCookie = (): string | null => {
	if (typeof document === 'undefined') return null;
	const cookies = document.cookie.split(';');
	for (const cookie of cookies) {
		const [name, value] = cookie.trim().split('=');
		if (name === 'XSRF-TOKEN' && value) {
			return decodeURIComponent(value);
		}
	}
	return null;
};

// Request interceptors (order matters - cancellation check first, then auth)
// Handle request cancellation (AbortController)
api.interceptors.request.use(
	(config) => {
		// If signal is provided and already aborted, reject immediately
		if (config.signal?.aborted) {
			return Promise.reject(new axios.Cancel('Request was cancelled'));
		}
		return config;
	},
	(error) => {
		return Promise.reject(error);
	}
);

// Attach access token and CSRF token to request headers
api.interceptors.request.use(
	(
		config: InternalAxiosRequestConfig
	) => {
		const { accessToken } =
			useAuthStore.getState();

		if (accessToken && config.headers) {
			config.headers.Authorization = `Bearer ${accessToken}`;
		}

		// Add CSRF token for state-changing requests (POST, PUT, DELETE, PATCH)
		if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(config.method?.toUpperCase() ?? '')) {
			const csrfToken = getCsrfTokenFromCookie();
			if (csrfToken && config.headers) {
				config.headers['X-XSRF-TOKEN'] = csrfToken;
			}
		}

		// Ensure Content-Type is set for JSON requests (if not already set)
		if (
			config.data &&
			typeof config.data === 'object' &&
			!config.headers?.[
				'Content-Type'
			] &&
			!config.headers?.['content-type']
		) {
			if (config.headers) {
				config.headers['Content-Type'] =
					'application/json';
			}
		}

		return config;
	},
	(error) => {
		return Promise.reject(error);
	}
);

// Automatically refresh token when access token expires
api.interceptors.response.use(
	(res) => res,
	async (error: AxiosError) => {
		const originalRequest =
			error.config as InternalAxiosRequestConfig & {
				_retryCount?: number;
			};

		if (!originalRequest) {
			return Promise.reject(error);
		}

		// Handle rate limit errors (429) - don't retry, just reject with error
		// The error handler will show user-friendly message
		if (error.response?.status === 429) {
			// Rate limit errors should not be retried
			// The error will be handled by useErrorHandler with user-friendly message
			return Promise.reject(error);
		}

		// Skip token refresh for auth endpoints
		const authEndpoints = [
			'/auth/signin',
			'/auth/signup',
			'/auth/refresh',
		];
		if (
			originalRequest.url &&
			authEndpoints.some((endpoint) =>
				originalRequest.url?.includes(
					endpoint
				)
			)
		) {
			return Promise.reject(error);
		}

		originalRequest._retryCount =
			originalRequest._retryCount ?? 0;

		// Retry on 403 (token expired) or 401 (unauthorized)
		if (
			(error.response?.status === 403 ||
				error.response?.status ===
					401) &&
			originalRequest._retryCount < 3
		) {
			originalRequest._retryCount += 1;

			try {
				const res = await api.post(
					'/auth/refresh',
					{},
					{ withCredentials: true }
				);
				const newAccessToken =
					res.data.accessToken;

				useAuthStore
					.getState()
					.setAccessToken(
						newAccessToken
					);

				if (originalRequest.headers) {
					originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
				}

				return api(originalRequest);
			} catch (refreshError) {
				useAuthStore
					.getState()
					.clearAuth();
				return Promise.reject(
					refreshError
				);
			}
		}

		return Promise.reject(error);
	}
);

export default api;

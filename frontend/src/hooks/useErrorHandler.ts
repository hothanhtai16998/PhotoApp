import { useCallback } from 'react';
import { toast } from 'sonner';

interface ErrorHandlerOptions {
  showToast?: boolean;
  fallbackMessage?: string;
  logError?: boolean;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
      errors?: Array<{ msg?: string; message?: string }>;
    };
    status?: number;
  };
  code?: string;
  message?: string;
}

/**
 * Custom hook for centralized error handling
 * Provides consistent error handling patterns across the application
 */
export function useErrorHandler(options: ErrorHandlerOptions = {}) {
  const {
    showToast = true,
    fallbackMessage = 'Đã xảy ra lỗi. Vui lòng thử lại.',
    logError = true,
  } = options;

  const handleError = useCallback(
    (error: unknown, customMessage?: string) => {
      if (logError) {
        console.error('Error:', error);
      }

      let message = customMessage || fallbackMessage;

      // Handle Axios errors
      if (error && typeof error === 'object' && 'response' in error) {
        const apiError = error as ApiError;

        // Handle validation errors (express-validator format)
        if (
          apiError.response?.data?.errors &&
          Array.isArray(apiError.response.data.errors)
        ) {
          const validationErrors = apiError.response.data.errors
            .map(
              (err: { msg?: string; message?: string }) =>
                err.msg || err.message || 'Validation failed'
            )
            .join(', ');
          message = `Lỗi xác thực: ${validationErrors}`;
        } else if (apiError.response?.data?.message) {
          message = apiError.response.data.message;
        } else if (apiError.message) {
          message = apiError.message;
        }

        // Handle specific error codes
        if (apiError.code === 'ECONNABORTED' || apiError.message?.includes('timeout')) {
          message = 'Yêu cầu hết thời gian. Vui lòng thử lại.';
        } else if (apiError.response?.status === 401 || apiError.response?.status === 403) {
          message = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
        } else if (apiError.response?.status === 404) {
          message = 'Không tìm thấy tài nguyên.';
        } else if (apiError.response?.status === 500) {
          message = 'Lỗi máy chủ. Vui lòng thử lại sau.';
        }
      } else if (error instanceof Error) {
        message = error.message || message;
      }

      if (showToast) {
        toast.error(message);
      }

      return message;
    },
    [showToast, fallbackMessage, logError]
  );

  const handleAsyncError = useCallback(
    async <T,>(
      asyncFn: () => Promise<T>,
      options?: ErrorHandlerOptions
    ): Promise<[T | null, Error | null]> => {
      try {
        const result = await asyncFn();
        return [result, null];
      } catch (error) {
        const mergedOptions = { ...options, ...options };
        handleError(error, mergedOptions.fallbackMessage);
        return [null, error as Error];
      }
    },
    [handleError]
  );

  return {
    handleError,
    handleAsyncError,
  };
}


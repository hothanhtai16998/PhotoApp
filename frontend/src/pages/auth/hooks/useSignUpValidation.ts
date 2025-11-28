import { useState, useMemo, useEffect, useRef } from 'react';
import { authService } from '@/services/authService';

interface ValidationStatus {
  isValidFormat: boolean;
  isAvailable: boolean | null; // null = checking, true = available, false = taken
  errorMessage: string | null;
}

export const useSignUpValidation = (email: string, username: string) => {
  const emailCheckTimeoutRef = useRef<number | null>(null);
  const usernameCheckTimeoutRef = useRef<number | null>(null);

  // Email validation state
  const [emailStatus, setEmailStatus] = useState<ValidationStatus>({
    isValidFormat: false,
    isAvailable: null,
    errorMessage: null,
  });

  // Username validation state
  const [usernameStatus, setUsernameStatus] = useState<ValidationStatus>({
    isValidFormat: false,
    isAvailable: null,
    errorMessage: null,
  });

  // Email format validation
  const emailFormatValid = useMemo(() => {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, [email]);

  // Username format validation
  const usernameFormatValid = useMemo(() => {
    if (!username) return false;
    // Must be 6-20 characters, only letters, numbers, and underscores
    const usernameRegex = /^[a-zA-Z0-9_]{6,20}$/;
    return usernameRegex.test(username);
  }, [username]);

  // Check email availability (debounced)
  useEffect(() => {
    // Clear previous timeout
    if (emailCheckTimeoutRef.current) {
      clearTimeout(emailCheckTimeoutRef.current);
    }

    // Reset status if email is empty
    if (!email) {
      setEmailStatus({
        isValidFormat: false,
        isAvailable: null,
        errorMessage: null,
      });
      return;
    }

    // Update format status
    setEmailStatus(prev => ({
      ...prev,
      isValidFormat: emailFormatValid,
    }));

    // Only check availability if format is valid
    if (!emailFormatValid) {
      setEmailStatus(prev => ({
        ...prev,
        isAvailable: null,
        errorMessage: null,
      }));
      return;
    }

    // Debounce email availability check (500ms)
    emailCheckTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await authService.checkEmailAvailability(email);
        setEmailStatus({
          isValidFormat: true,
          isAvailable: response.available,
          errorMessage: response.available ? null : (response.message || "Email đã tồn tại"),
        });
      } catch (error: any) {
        // Email is not available
        const message = error?.response?.data?.message || "Email đã tồn tại";
        setEmailStatus({
          isValidFormat: true,
          isAvailable: false,
          errorMessage: message,
        });
      }
    }, 500);

    return () => {
      if (emailCheckTimeoutRef.current) {
        clearTimeout(emailCheckTimeoutRef.current);
      }
    };
  }, [email, emailFormatValid]);

  // Check username availability (debounced)
  useEffect(() => {
    // Clear previous timeout
    if (usernameCheckTimeoutRef.current) {
      clearTimeout(usernameCheckTimeoutRef.current);
    }

    // Reset status if username is empty
    if (!username) {
      setUsernameStatus({
        isValidFormat: false,
        isAvailable: null,
        errorMessage: null,
      });
      return;
    }

    // Update format status
    setUsernameStatus(prev => ({
      ...prev,
      isValidFormat: usernameFormatValid,
    }));

    // Only check availability if format is valid
    if (!usernameFormatValid) {
      setUsernameStatus(prev => ({
        ...prev,
        isAvailable: null,
        errorMessage: null,
      }));
      return;
    }

    // Debounce username availability check (500ms)
    usernameCheckTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await authService.checkUsernameAvailability(username);
        setUsernameStatus({
          isValidFormat: true,
          isAvailable: response.available,
          errorMessage: response.available ? null : (response.message || "Tên tài khoản đã tồn tại"),
        });
      } catch (error: any) {
        // Username is not available
        const message = error?.response?.data?.message || "Tên tài khoản đã tồn tại";
        setUsernameStatus({
          isValidFormat: true,
          isAvailable: false,
          errorMessage: message,
        });
      }
    }, 500);

    return () => {
      if (usernameCheckTimeoutRef.current) {
        clearTimeout(usernameCheckTimeoutRef.current);
      }
    };
  }, [username, usernameFormatValid]);

  return {
    emailStatus,
    usernameStatus,
  };
};





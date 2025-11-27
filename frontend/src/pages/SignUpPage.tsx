import { useState, useMemo, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "@/stores/useAuthStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Check, X, AlertTriangle } from "lucide-react";
import { authService } from "@/services/authService";
import "./SignUpPage.css";

const signUpSchema = z.object({
    username: z.string()
        .min(6, { message: "Tên tài khoản phải từ 6 ký tự trở lên." })
        .max(20, { message: "Tên tài khoản phải từ 20 ký tự trở xuống." })
        .regex(/^[a-zA-Z0-9_]+$/, { message: "Tên tài khoản chỉ có thể chứa chữ, số và gạch dưới." }),
    firstName: z.string()
        .min(2, { message: "Họ không được để trống." })
        .trim(),
    lastName: z.string()
        .min(2, { message: "Tên không được để trống." })
        .trim(),
    email: z.string().email({ message: "Vui lòng nhập email hợp lệ." }),
    password: z.string()
        .min(6, { message: "Mật khẩu phải từ 6 ký tự trở lên." })
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*([0-9]|[^a-zA-Z0-9]))/, {
            message: "Mật khẩu phải có chữ hoa, chữ thường và số hoặc ký tự đặc biệt."
        }),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Xác nhận mật khẩu không chính xác.",
    path: ["confirmPassword"],
});

type SignUpFormValue = z.infer<typeof signUpSchema>;

function SignUpPage() {
    const { signUp } = useAuthStore();
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { register, handleSubmit, watch, formState: { errors } } = useForm<SignUpFormValue>({
        resolver: zodResolver(signUpSchema),
    });

    // Watch password, email, and username for real-time validation
    const password = watch('password') || '';
    const email = watch('email') || '';
    const username = watch('username') || '';

    // Email validation state
    const [emailStatus, setEmailStatus] = useState<{
        isValidFormat: boolean;
        isAvailable: boolean | null; // null = checking, true = available, false = taken
        errorMessage: string | null;
    }>({
        isValidFormat: false,
        isAvailable: null,
        errorMessage: null,
    });

    const emailCheckTimeoutRef = useRef<number | null>(null);
    const usernameCheckTimeoutRef = useRef<number | null>(null);

    // Username validation state
    const [usernameStatus, setUsernameStatus] = useState<{
        isValidFormat: boolean;
        isAvailable: boolean | null; // null = checking, true = available, false = taken
        errorMessage: string | null;
    }>({
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

    // Password validation checks
    const passwordValidation = useMemo(() => {
        return {
            minLength: password.length >= 6,
            hasLowerUpper: /[a-z]/.test(password) && /[A-Z]/.test(password),
            hasNumberOrSymbol: /[0-9]/.test(password) || /[^a-zA-Z0-9]/.test(password),
        };
    }, [password]);

    const onSubmit = async (data: SignUpFormValue) => {
        setIsSubmitting(true);
        try {
            await signUp(
                data.username,
                data.password,
                data.email,
                data.firstName,
                data.lastName
            );
            navigate("/signin");
        } catch {
            // Error is handled by the store
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSocialLogin = (provider: string) => {
        if (provider === 'google') {
            // Google OAuth - redirect to backend
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
            window.location.href = `${apiUrl}/api/auth/google`;
        } else {
            // For other providers, show coming soon message
            alert(`Đăng nhập bằng ${provider.charAt(0).toUpperCase() + provider.slice(1)} chưa khả dụng!`);
        }
    };

    return (
        <div className="signup-page">
            {/* Background Image */}
            <div className="signup-background">
                <div className="background-overlay"></div>
                <div className="background-logo">
                    <span className="logo-text">Be PhotoApp</span>
                </div>
            </div>

            {/* Signup Modal */}
            <div className="signup-modal">
                <div className="signup-modal-content">
                    <div className="signup-header">
                        <h1 className="signup-title">Tạo tài khoản</h1>
                    </div>

                    {/* Social Login Buttons */}
                    <div className="social-login-section">
                        <button
                            type="button"
                            className="social-btn google-btn"
                            onClick={() => handleSocialLogin('google')}
                        >
                            <span className="social-icon">G</span>
                        </button>
                        <button
                            type="button"
                            className="social-btn facebook-btn"
                            onClick={() => handleSocialLogin('facebook')}
                        >
                            <span className="social-icon">F</span>
                        </button>
                        <button
                            type="button"
                            className="social-btn apple-btn"
                            onClick={() => handleSocialLogin('apple')}
                        >
                            <span className="social-icon">M</span>
                        </button>
                    </div>

                    {/* Separator */}
                    <div className="signup-separator">
                        <div className="separator-line"></div>
                        <span className="separator-text">Hoặc</span>
                        <div className="separator-line"></div>
                    </div>

                    {/* Email Signup Form */}
                    <form onSubmit={handleSubmit(onSubmit)} className="signup-form">
                        <div className="signup-form-header">
                            <h2 className="form-subtitle">Đăng nhập với tài khoản</h2>
                            <p className="form-switch">
                                Đã có tài khoản?{" "}
                                <Link to="/signin" className="form-link">
                                    Đăng nhập
                                </Link>
                            </p>
                        </div>

                        {/* Username */}
                        <div className="form-group">
                            <div className="username-input-wrapper">
                                <Input
                                    type="text"
                                    id="username"
                                    placeholder="Tên tài khoản"
                                    {...register('username')}
                                    className={
                                        errors.username || (usernameStatus.isAvailable === false)
                                            ? 'error'
                                            : usernameStatus.isValidFormat && usernameStatus.isAvailable === true
                                            ? 'valid'
                                            : ''
                                    }
                                />
                                {/* Show green checkmark when username is valid and available */}
                                {usernameStatus.isValidFormat && usernameStatus.isAvailable === true && (
                                    <Check size={20} className="username-status-icon valid-icon" />
                                )}
                                {/* Show warning icon when username is taken */}
                                {usernameStatus.isAvailable === false && (
                                    <AlertTriangle size={20} className="username-status-icon error-icon" />
                                )}
                            </div>
                            {/* Show error message when username is taken */}
                            {usernameStatus.isAvailable === false && usernameStatus.errorMessage && (
                                <p className="error-message">
                                    {usernameStatus.errorMessage}
                                </p>
                            )}
                            {/* Show format error from Zod */}
                            {errors.username && (
                                <p className="error-message">{errors.username.message}</p>
                            )}
                        </div>

                        {/* First Name and Last Name */}
                        <div className="form-group-row">
                            <div className="form-group">
                                <Input
                                    type="text"
                                    id="firstName"
                                    placeholder="Họ"
                                    {...register('firstName')}
                                    className={errors.firstName ? 'error' : ''}
                                />
                                {errors.firstName && (
                                    <p className="error-message">{errors.firstName.message}</p>
                                )}
                            </div>
                            <div className="form-group">
                                <Input
                                    type="text"
                                    id="lastName"
                                    placeholder="Tên"
                                    {...register('lastName')}
                                    className={errors.lastName ? 'error' : ''}
                                />
                                {errors.lastName && (
                                    <p className="error-message">{errors.lastName.message}</p>
                                )}
                            </div>
                        </div>

                        {/* Email */}
                        <div className="form-group">
                            <div className="email-input-wrapper">
                                <Input
                                    type="email"
                                    id="email"
                                    placeholder="Email address"
                                    {...register('email')}
                                    className={
                                        errors.email || (emailStatus.isAvailable === false)
                                            ? 'error'
                                            : emailStatus.isValidFormat && emailStatus.isAvailable === true
                                            ? 'valid'
                                            : ''
                                    }
                                />
                                {/* Show green checkmark when email is valid and available */}
                                {emailStatus.isValidFormat && emailStatus.isAvailable === true && (
                                    <Check size={20} className="email-status-icon valid-icon" />
                                )}
                                {/* Show warning icon when email is taken */}
                                {emailStatus.isAvailable === false && (
                                    <AlertTriangle size={20} className="email-status-icon error-icon" />
                                )}
                            </div>
                            {/* Show error message when email is taken */}
                            {emailStatus.isAvailable === false && emailStatus.errorMessage && (
                                <p className="error-message">
                                    {emailStatus.errorMessage.includes('Google') ? (
                                        emailStatus.errorMessage
                                    ) : (
                                        <>
                                            Một tài khoản với địa chỉ email này đã tồn tại.{" "}
                                            <Link to="/signin" className="error-link">
                                                Đăng nhập
                                            </Link>
                                        </>
                                    )}
                                </p>
                            )}
                            {/* Show format error from Zod */}
                            {errors.email && (
                                <p className="error-message">{errors.email.message}</p>
                            )}
                        </div>

                        {/* Password */}
                        <div className="form-group">
                            <div className="password-input-wrapper">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    placeholder="Mật khẩu"
                                    {...register('password')}
                                    className={errors.password ? 'error' : ''}
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                            {errors.password && (
                                <p className="error-message">{errors.password.message}</p>
                            )}
                            
                            {/* Password Requirements Box */}
                            {password.length > 0 && (
                                <div className="password-requirements">
                                    <div className={`requirement-item ${passwordValidation.minLength ? 'valid' : 'invalid'}`}>
                                        {passwordValidation.minLength ? (
                                            <Check size={16} className="requirement-icon check-icon" />
                                        ) : (
                                            <X size={16} className="requirement-icon x-icon" />
                                        )}
                                        <span className="requirement-text">Chứa ít nhất 6 ký tự</span>
                                    </div>
                                    <div className={`requirement-item ${passwordValidation.hasLowerUpper ? 'valid' : 'invalid'}`}>
                                        {passwordValidation.hasLowerUpper ? (
                                            <Check size={16} className="requirement-icon check-icon" />
                                        ) : (
                                            <X size={16} className="requirement-icon x-icon" />
                                        )}
                                        <span className="requirement-text">Chứa cả chữ thường (a-z) và chữ hoa (A-Z)</span>
                                    </div>
                                    <div className={`requirement-item ${passwordValidation.hasNumberOrSymbol ? 'valid' : 'invalid'}`}>
                                        {passwordValidation.hasNumberOrSymbol ? (
                                            <Check size={16} className="requirement-icon check-icon" />
                                        ) : (
                                            <X size={16} className="requirement-icon x-icon" />
                                        )}
                                        <span className="requirement-text">Chứa ít nhất một số (0-9) hoặc ký tự đặc biệt</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div className="form-group">
                            <div className="password-input-wrapper">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    id="confirmPassword"
                                    placeholder="Xác nhận mật khẩu"
                                    {...register('confirmPassword')}
                                    className={errors.confirmPassword ? 'error' : ''}
                                />
                            </div>
                            {errors.confirmPassword && (
                                <p className="error-message">{errors.confirmPassword.message}</p>
                            )}
                        </div>

                        <Button
                            type="submit"
                            className="continue-btn"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Đang tạo...' : 'Tiếp tục'}
                        </Button>
                    </form>
                </div>
            </div>

            {/* Footer */}
            {/* <footer className="signup-footer">
                <p className="footer-text">
                    Copyright © 2025 PhotoApp. All rights reserved.
                </p>
                <div className="footer-links">
                    <a href="#" className="footer-link">Terms of Use</a>
                    <a href="#" className="footer-link">Cookie preferences</a>
                    <a href="#" className="footer-link">Privacy</a>
                    <a href="#" className="footer-link">Do not sell or share my personal information</a>
                </div>
            </footer> */}
        </div>
    );
}

export default SignUpPage;

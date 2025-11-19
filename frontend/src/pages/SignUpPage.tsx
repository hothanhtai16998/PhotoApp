import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "@/stores/useAuthStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
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
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
            message: "Mật khẩu phải có chữ hoa, chữ thường mà số."
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

    const { register, handleSubmit, formState: { errors } } = useForm<SignUpFormValue>({
        resolver: zodResolver(signUpSchema),
    });

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
        } catch (error) {
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
                            <Input
                                type="text"
                                id="username"
                                placeholder="Tên tài khoản"
                                {...register('username')}
                                className={errors.username ? 'error' : ''}
                            />
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
                            <Input
                                type="email"
                                id="email"
                                placeholder="Email"
                                {...register('email')}
                                className={errors.email ? 'error' : ''}
                            />
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

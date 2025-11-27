import { z } from 'zod';

// Sign Up Form Schema
export const signUpSchema = z.object({
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

export type SignUpFormValue = z.infer<typeof signUpSchema>;

// Alternative Sign Up Schema (for signup-form.tsx component)
export const signUpSchemaAlt = z.object({
    firstname: z.string().min(2, { message: "Họ không được để trống." }),
    lastname: z.string().min(2, { message: "Tên không được để trống." }),
    username: z.string().min(6, { message: "Tên đăng nhập phải có ít nhất 3 ký tự." }),
    email: z.string().email({ message: "Email không hợp lệ." }),
    password: z.string().min(8, { message: "Mật khẩu phải có ít nhất 8 ký tự." }),
    confirmpassword: z.string()
}).refine((data) => data.password === data.confirmpassword, {
    message: "Mật khẩu không khớp.",
    path: ["confirmpassword"],
});

export type SignUpFormValueAlt = z.infer<typeof signUpSchemaAlt>;

// Sign In Form Schema
export const signInSchema = z.object({
    username: z.string().min(1, { message: "Tên tải khoản không được để trống." }),
    password: z.string().min(1, { message: "Mật khẩu không được để trống." }),
});

export type SignInFormValue = z.infer<typeof signInSchema>;

// Profile Form Data
export interface ProfileFormData {
    firstName: string;
    lastName: string;
    email: string;
    username: string;
    location: string;
    phone: string;
    personalSite: string;
    bio: string;
    interests: string;
    instagram: string;
    twitter: string;
    paypalEmail: string;
    showMessageButton: boolean;
}

// Change Password Form Schema
export const changePasswordSchema = z.object({
    password: z.string().min(1, { message: "Current password is required" }),
    newPassword: z.string().min(8, { message: "Password must be at least 8 characters" }),
    newPasswordMatch: z.string().min(1, { message: "Password confirmation is required" }),
}).refine((data) => data.newPassword === data.newPasswordMatch, {
    message: "Passwords do not match",
    path: ["newPasswordMatch"],
});

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

// Upload Form Schema
export const uploadSchema = z.object({
    image: z.instanceof(FileList).refine(files => files?.length === 1, 'Image is required.'),
    imageTitle: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
    imageCategory: z.string().min(1, 'Category is required'),
    location: z.string().optional(),
    cameraModel: z.string().optional(),
});

export type UploadFormValues = z.infer<typeof uploadSchema>;


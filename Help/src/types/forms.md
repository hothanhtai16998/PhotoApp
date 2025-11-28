# forms Types Explanation

## What is forms Types?

`forms` types is a **TypeScript type definitions file** that defines all form-related types and Zod schemas. It provides type safety and validation for sign up, sign in, profile, password change, and upload forms.

## Key Features

### 1. **Form Schemas**
- Sign up schema
- Sign in schema
- Password change schema
- Upload schema

### 2. **Validation**
- Zod schemas
- Field validation
- Custom messages
- Type inference

### 3. **Form Data Types**
- Profile form data
- Inferred types from schemas

## Step-by-Step Breakdown

### Sign Up Schema

```typescript
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
```

**What this does:**
- Defines sign up validation
- Username: 6-20 chars, alphanumeric + underscore
- Password: min 6, uppercase, lowercase, number/special
- Password confirmation match
- Vietnamese error messages

### Sign In Schema

```typescript
export const signInSchema = z.object({
    username: z.string().min(1, { message: "Tên tải khoản không được để trống." }),
    password: z.string().min(1, { message: "Mật khẩu không được để trống." }),
});

export type SignInFormValue = z.infer<typeof signInSchema>;
```

**What this does:**
- Defines sign in validation
- Simple required fields
- Vietnamese messages

### Change Password Schema

```typescript
export const changePasswordSchema = z.object({
    password: z.string().min(1, { message: "Current password is required" }),
    newPassword: z.string().min(8, { message: "Password must be at least 8 characters" }),
    newPasswordMatch: z.string().min(1, { message: "Password confirmation is required" }),
}).refine((data) => data.newPassword === data.newPasswordMatch, {
    message: "Passwords do not match",
    path: ["newPasswordMatch"],
});

export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;
```

**What this does:**
- Defines password change validation
- Current password required
- New password min 8 chars
- Password match validation

### Upload Schema

```typescript
export const uploadSchema = z.object({
    image: z.instanceof(FileList).refine(files => files?.length === 1, 'Image is required.'),
    imageTitle: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
    imageCategory: z.string().min(1, 'Category is required'),
    location: z.string().optional(),
    cameraModel: z.string().optional(),
});

export type UploadFormValues = z.infer<typeof uploadSchema>;
```

**What this does:**
- Defines upload validation
- File required
- Title: 1-200 chars
- Category required
- Optional fields

### Profile Form Data

```typescript
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
```

**What this does:**
- Defines profile form structure
- All profile fields
- Social links
- Preferences

## Usage Examples

### Sign Up Form

```typescript
import { signUpSchema, type SignUpFormValue } from '@/types/forms';

const form = useForm<SignUpFormValue>({
  resolver: zodResolver(signUpSchema),
});
```

### Upload Form

```typescript
import { uploadSchema, type UploadFormValues } from '@/types/forms';

const form = useForm<UploadFormValues>({
  resolver: zodResolver(uploadSchema),
});
```

## Summary

**forms types** is the form type definitions file that:
1. ✅ Defines Zod schemas
2. ✅ Form validation
3. ✅ Type inference
4. ✅ Vietnamese messages
5. ✅ Complete form types

It's the "form types" - ensuring type safety for forms!


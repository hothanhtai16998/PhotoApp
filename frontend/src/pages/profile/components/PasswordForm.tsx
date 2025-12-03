import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import type { UseFormRegister, UseFormHandleSubmit, FieldErrors } from 'react-hook-form';
import type { ChangePasswordFormData } from '@/types/forms';

interface PasswordFormProps {
  register: UseFormRegister<ChangePasswordFormData>;
  handleSubmit: UseFormHandleSubmit<ChangePasswordFormData>;
  errors: FieldErrors<ChangePasswordFormData>;
  onSubmit: (data: ChangePasswordFormData) => void;
  isSubmitting: boolean;
  passwordError: string | null;
  passwordSuccess: boolean;
}

export const PasswordForm = ({
  register,
  handleSubmit,
  errors,
  onSubmit,
  isSubmitting,
  passwordError,
  passwordSuccess,
}: PasswordFormProps) => {
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="change-password-form">
      <h1 className="form-title">Mật khẩu hiện tại</h1>

      <div className="form-field">
        <Label htmlFor="password">Mật khẩu hiện tại</Label>
        <Input
          id="password"
          type="password"
          {...register('password')}
          autoFocus
        />
        {errors.password && (
          <p className="field-error">{errors.password.message}</p>
        )}
      </div>

      <div className="form-field">
        <Label htmlFor="newPassword">Mật khẩu mới</Label>
        <Input
          id="newPassword"
          type="password"
          {...register('newPassword')}
        />
        {errors.newPassword && (
          <p className="field-error">{errors.newPassword.message}</p>
        )}
      </div>

      <div className="form-field">
        <Label htmlFor="newPasswordMatch">Xác nhận mật khẩu</Label>
        <Input
          id="newPasswordMatch"
          type="password"
          {...register('newPasswordMatch')}
        />
        {errors.newPasswordMatch && (
          <p className="field-error">{errors.newPasswordMatch.message}</p>
        )}
      </div>

      {passwordError && (
        <div className="password-error-message">
          {passwordError}
        </div>
      )}

      {passwordSuccess && (
        <div className="password-success-message">
          Mật khẩu thay đổi thành công!
        </div>
      )}

      <div className="form-actions">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="update-btn"
        >
          {isSubmitting ? 'Đang đổi...' : 'Đổi mật khẩu'}
        </Button>
      </div>
    </form>
  );
};






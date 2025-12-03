import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { UseFormRegister, UseFormHandleSubmit, UseFormWatch, FieldErrors } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff, Check, X } from 'lucide-react';
import type { SignUpFormValue } from '@/types/forms';
import { ValidationStatus } from './ValidationStatus';
import { t } from '@/i18n';

interface SignUpFormProps {
  register: UseFormRegister<SignUpFormValue>;
  handleSubmit: UseFormHandleSubmit<SignUpFormValue>;
  watch: UseFormWatch<SignUpFormValue>;
  errors: FieldErrors<SignUpFormValue>;
  onSubmit: (data: SignUpFormValue) => Promise<void>;
  isSubmitting: boolean;
  emailStatus: {
    isValidFormat: boolean;
    isAvailable: boolean | null;
    errorMessage: string | null;
  };
  usernameStatus: {
    isValidFormat: boolean;
    isAvailable: boolean | null;
    errorMessage: string | null;
  };
}

export const SignUpForm = ({
  register,
  handleSubmit,
  watch,
  errors,
  onSubmit,
  isSubmitting,
  emailStatus,
  usernameStatus,
}: SignUpFormProps) => {
  const [showPassword, setShowPassword] = useState(false);
  const password = watch('password') || '';

  // Password validation checks
  const passwordValidation = useMemo(() => {
    return {
      minLength: password.length >= 6,
      hasLowerUpper: /[a-z]/.test(password) && /[A-Z]/.test(password),
      hasNumberOrSymbol: /[0-9]/.test(password) || /[^a-zA-Z0-9]/.test(password),
    };
  }, [password]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="signup-form">
      <div className="signup-form-header">
        <h2 className="form-subtitle">{t('auth.signInWithAccount')}</h2>
        <p className="form-switch">
          {t('auth.hasAccount')}{" "}
          <Link to="/signin" className="form-link">
            {t('auth.signIn')}
          </Link>
        </p>
      </div>

      {/* Username */}
      <div className="form-group">
        <div className="username-input-wrapper">
          <Input
            type="text"
            id="username"
            placeholder={t('auth.username')}
            {...register('username')}
            className={
              errors.username || (usernameStatus.isAvailable === false)
                ? 'error'
                : usernameStatus.isValidFormat && usernameStatus.isAvailable === true
                ? 'valid'
                : ''
            }
          />
          <ValidationStatus type="username" status={usernameStatus} error={errors.username?.message} showMessage={false} />
        </div>
        <ValidationStatus type="username" status={usernameStatus} error={errors.username?.message} showIcon={false} />
      </div>

      {/* First Name and Last Name */}
      <div className="form-group-row">
        <div className="form-group">
          <Input
            type="text"
            id="firstName"
            placeholder={t('auth.lastName')}
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
            placeholder={t('auth.firstName')}
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
            placeholder={t('auth.email')}
            {...register('email')}
            className={
              errors.email || (emailStatus.isAvailable === false)
                ? 'error'
                : emailStatus.isValidFormat && emailStatus.isAvailable === true
                ? 'valid'
                : ''
            }
          />
          <ValidationStatus type="email" status={emailStatus} error={errors.email?.message} showMessage={false} />
        </div>
        <ValidationStatus type="email" status={emailStatus} error={errors.email?.message} showIcon={false} />
      </div>

      {/* Password */}
      <div className="form-group">
        <div className="password-input-wrapper">
          <Input
            type={showPassword ? "text" : "password"}
            id="password"
            placeholder={t('auth.password')}
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
              <span className="requirement-text">{t('auth.passwordMin6')}</span>
            </div>
            <div className={`requirement-item ${passwordValidation.hasLowerUpper ? 'valid' : 'invalid'}`}>
              {passwordValidation.hasLowerUpper ? (
                <Check size={16} className="requirement-icon check-icon" />
              ) : (
                <X size={16} className="requirement-icon x-icon" />
              )}
              <span className="requirement-text">{t('auth.passwordLowerUpper')}</span>
            </div>
            <div className={`requirement-item ${passwordValidation.hasNumberOrSymbol ? 'valid' : 'invalid'}`}>
              {passwordValidation.hasNumberOrSymbol ? (
                <Check size={16} className="requirement-icon check-icon" />
              ) : (
                <X size={16} className="requirement-icon x-icon" />
              )}
              <span className="requirement-text">{t('auth.passwordNumberSymbol')}</span>
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
            placeholder={t('auth.confirmPassword')}
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
        {isSubmitting ? t('auth.creating') : t('auth.continue')}
      </Button>
    </form>
  );
};


import { CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import type { UseFormRegister, UseFormHandleSubmit, UseFormWatch } from 'react-hook-form';
import type { ProfileFormData } from '@/types/forms';

interface ProfileFormProps {
  user: any;
  avatarPreview: string | null;
  isUploadingAvatar: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  bioCharCount: number;
  register: UseFormRegister<ProfileFormData>;
  handleSubmit: UseFormHandleSubmit<ProfileFormData>;
  watch: UseFormWatch<ProfileFormData>;
  handleAvatarChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleAvatarButtonClick: () => void;
  onSubmit: (data: ProfileFormData) => void;
  isSubmitting: boolean;
}

export const ProfileForm = ({
  user,
  avatarPreview,
  isUploadingAvatar,
  fileInputRef,
  bioCharCount,
  register,
  handleSubmit,
  watch,
  handleAvatarChange,
  handleAvatarButtonClick,
  onSubmit,
  isSubmitting,
}: ProfileFormProps) => {
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="profile-form">
      <h1 className="form-title">Chỉnh sửa thông tin</h1>

      {/* Profile Image Section */}
      <div className="profile-image-section">
        <div className="profile-image-container">
          <div className="profile-image-wrapper">
            {avatarPreview ? (
              <img src={avatarPreview} alt="Preview" className="profile-image" />
            ) : user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.displayName} className="profile-image" />
            ) : (
              <div className="profile-image-placeholder">
                {user.displayName?.charAt(0).toUpperCase() || user.username?.charAt(0).toUpperCase()}
              </div>
            )}
            {isUploadingAvatar && (
              <div className="image-upload-overlay">
                <div className="upload-spinner"></div>
                <p className="upload-text">Đang tải...</p>
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="user"
            onChange={handleAvatarChange}
            style={{ display: 'none' }}
            disabled={user?.isOAuthUser}
          />
          <button
            type="button"
            className="change-image-btn"
            onClick={handleAvatarButtonClick}
            disabled={isUploadingAvatar || user?.isOAuthUser}
            style={user?.isOAuthUser ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
          >
            Đổi ảnh đại diện
          </button>
          {user?.isOAuthUser && (
            <p className="field-hint" style={{ fontSize: '0.8125rem', color: '#767676', marginTop: '8px', textAlign: 'center' }}>
              Ảnh thuộc tài khoản Google (không thể thay đổi)
            </p>
          )}
        </div>

        <div className="profile-basic-info">
          <div className="form-row">
            <div className="form-field">
              <Label htmlFor="firstName">Họ</Label>
              <Input id="firstName" {...register('firstName')} />
            </div>
            <div className="form-field">
              <Label htmlFor="lastName">Tên</Label>
              <Input id="lastName" {...register('lastName')} />
              <div className="account-badge">
                <CheckCircle2 size={16} />
                <span>Checked</span>
              </div>
            </div>
          </div>
          <div className="form-field">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              readOnly={user?.isOAuthUser}
              className={user?.isOAuthUser ? 'readonly-field' : ''}
            />
            {user?.isOAuthUser && (
              <p className="field-hint" style={{ fontSize: '0.8125rem', color: '#767676', marginTop: '4px' }}>
                Email thuộc tài khoản Google (không thể thay Đổi)
              </p>
            )}
          </div>
          <div className="form-field">
            <Label htmlFor="username">Tên đăng nhập</Label>
            <Input id="username" {...register('username')} readOnly />
            <p className="field-hint">(chỉ được nhập ký tự và chữ số)</p>
            <p className="field-url">https://photoapp.com/@{watch('username') || user.username}</p>
          </div>
        </div>
      </div>

      {/* Badge Section */}
      <div className="form-section">
        <h3 className="section-title">Badge</h3>
        <p className="empty-badge-message">Bạn chưa có huy hiệu nào :(</p>
      </div>

      {/* About Section */}
      <div className="form-section">
        <h3 className="section-title">Giới thiệu</h3>
        <div className="form-field">
          <Label htmlFor="location">Địa chỉ</Label>
          <Input id="location" {...register('location')} placeholder="e.g., New York, USA" />
        </div>
        <div className="form-field">
          <Label htmlFor="phone">Số điện thoại</Label>
          <Input id="phone" {...register('phone')} type="tel" placeholder="e.g., +1 234 567 8900" />
        </div>
        <div className="form-field">
          <Label htmlFor="personalSite">Personal site/portfolio</Label>
          <Input id="personalSite" {...register('personalSite')} placeholder="https://" />
        </div>
        <div className="form-field">
          <Label htmlFor="bio">Tiểu sử</Label>
          <textarea
            id="bio"
            {...register('bio')}
            className="bio-textarea"
            maxLength={500}
            placeholder="Tell us about yourself..."
          />
          <div className="char-counter">{bioCharCount}</div>
        </div>
      </div>

      {/* Social Section */}
      <div className="form-section">
        <h3 className="section-title">Mạng xã hội</h3>
        <div className="form-row">
          <div className="form-field">
            <Label htmlFor="instagram">Tài khoản Instagram</Label>
            <div className="input-with-prefix">
              <span className="input-prefix">@</span>
              <Input id="instagram" {...register('instagram')} placeholder="username" />
            </div>
            <p className="field-hint">So that we can feature you on @photoapp</p>
          </div>
          <div className="form-field">
            <Label htmlFor="twitter">Tài khoản X (Twitter)</Label>
            <div className="input-with-prefix">
              <span className="input-prefix">@</span>
              <Input id="twitter" {...register('twitter')} placeholder="username" />
            </div>
            <p className="field-hint">So that we can feature you on @photoapp</p>
          </div>
        </div>
      </div>

      {/* Messaging Section */}
      <div className="form-section">
        <h3 className="section-title">Tin nhắn</h3>
        <div className="checkbox-field">
          <input
            type="checkbox"
            id="showMessageButton"
            {...register('showMessageButton')}
            className="checkbox-input"
          />
          <Label htmlFor="showMessageButton" className="checkbox-label">
            Display a 'Message' button on your profile
          </Label>
        </div>
        <p className="field-hint">Tin nhắn sẽ được gửi tới email của bạn</p>
      </div>

      {/* Submit Button */}
      <div className="form-actions">
        <Button type="submit" disabled={isSubmitting} className="update-btn">
          {isSubmitting ? 'Updating...' : 'Update account'}
        </Button>
      </div>
    </form>
  );
};


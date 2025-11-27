import { CheckCircle2, Heart, FolderPlus, X } from 'lucide-react';
import type { Image } from '@/types/image';
import { Avatar } from '../Avatar';
import { DownloadSizeSelector } from './DownloadSizeSelector';
import { FollowButton } from '../FollowButton';
import type { DownloadSize } from './DownloadSizeSelector';
import { useUserProfileCard } from './hooks/useUserProfileCard';

interface ImageModalHeaderProps {
  image: Image;
  user: any;
  isMobile: boolean;
  renderAsPage: boolean;
  isFavorited: boolean;
  handleToggleFavorite: () => void;
  handleDownloadWithSize: (size: DownloadSize) => void;
  handleViewProfile: (e: React.MouseEvent) => void;
  handleOpenCollection: () => void;
  onClose: () => void;
  modalContentRef: React.RefObject<HTMLDivElement>;
  onImageSelect: (image: Image) => void;
}

export const ImageModalHeader = ({
  image,
  user,
  isMobile,
  renderAsPage,
  isFavorited,
  handleToggleFavorite,
  handleDownloadWithSize,
  handleViewProfile,
  handleOpenCollection,
  onClose,
  modalContentRef,
  onImageSelect,
}: ImageModalHeaderProps) => {
  const {
    showUserProfileCard,
    isClosingProfileCard,
    userImages,
    isLoadingUserImages,
    userInfoRef,
    userProfileCardRef,
    handleMouseEnter,
    handleMouseLeave,
    handleUserImageClick,
  } = useUserProfileCard({
    image,
    modalContentRef,
    onImageSelect,
  });

  // Desktop Header
  if (!isMobile && !renderAsPage) {
    return (
      <div className="image-modal-header">
        {/* Left: User Info */}
        <div
          className="modal-header-left clickable-user-info"
          ref={userInfoRef}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleViewProfile}
          style={{ position: 'relative', cursor: 'pointer', willChange: 'opacity' }}
          title="Xem hồ sơ"
        >
          <Avatar
            user={image.uploadedBy}
            size={40}
            className="modal-user-avatar"
            fallbackClassName="modal-user-avatar-placeholder"
          />
          <div className="modal-user-info">
            <div
              className="modal-user-name hoverable"
              style={{ cursor: 'pointer' }}
            >
              {image.uploadedBy.displayName?.trim() || image.uploadedBy.username}
              <CheckCircle2 className="verified-badge" size={16} />
            </div>
            <div className="modal-user-status">Sẵn sàng nhận việc</div>
          </div>

          {/* User Profile Card */}
          {showUserProfileCard && (
            <div
              ref={userProfileCardRef}
              className={`user-profile-card ${isClosingProfileCard ? 'closing' : ''}`}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <div className="user-profile-card-header">
                <div className="user-profile-card-avatar-section">
                  <Avatar
                    user={image.uploadedBy}
                    size={48}
                    className="user-profile-card-avatar"
                    fallbackClassName="user-profile-card-avatar-placeholder"
                  />
                  <div className="user-profile-card-name-section">
                    <div className="user-profile-card-name">
                      {image.uploadedBy.displayName?.trim() || image.uploadedBy.username}
                    </div>
                    <div className="user-profile-card-username">{image.uploadedBy.username}</div>
                  </div>
                </div>
                {user && user._id !== image.uploadedBy._id && (
                  <div className="user-profile-card-follow">
                    <FollowButton
                      userId={image.uploadedBy._id}
                      userDisplayName={image.uploadedBy.displayName || image.uploadedBy.username}
                      variant="default"
                      size="sm"
                    />
                  </div>
                )}
              </div>

              {isLoadingUserImages && userImages.length === 0 ? (
                <div className="user-profile-card-loading">
                  <div className="loading-spinner-small" />
                </div>
              ) : userImages.length > 0 ? (
                <div className="user-profile-card-images">
                  {userImages.map((userImage) => (
                    <div
                      key={userImage._id}
                      className="user-profile-card-image-item"
                      onClick={() => handleUserImageClick(userImage)}
                    >
                      <img
                        src={userImage.thumbnailUrl || userImage.smallUrl || userImage.imageUrl}
                        alt={userImage.imageTitle || 'Photo'}
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              ) : null}

              <button
                className="user-profile-card-view-btn"
                onClick={handleViewProfile}
              >
                Xem hồ sơ
              </button>
            </div>
          )}
        </div>

        {/* Right: Download Button and Close Button */}
        <div className="modal-header-right">
          <DownloadSizeSelector
            image={image}
            onDownload={handleDownloadWithSize}
          />
          <button
            className="modal-close-btn-header"
            onClick={onClose}
            title="Đóng (Esc)"
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>
      </div>
    );
  }

  // Mobile/Page Author Banner
  if (isMobile || renderAsPage) {
    return (
      <div className="image-modal-author-banner">
        <div
          className="modal-author-banner-left clickable-user-info"
          ref={userInfoRef}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleViewProfile}
          style={{ position: 'relative', cursor: 'pointer', willChange: 'opacity' }}
          title="Xem hồ sơ"
        >
          <Avatar
            user={image.uploadedBy}
            size={40}
            className="modal-user-avatar"
            fallbackClassName="modal-user-avatar-placeholder"
          />
          <div className="modal-user-info">
            <div
              className="modal-user-name hoverable"
              style={{ cursor: 'pointer' }}
            >
              {image.uploadedBy.displayName?.trim() || image.uploadedBy.username}
              <CheckCircle2 className="verified-badge" size={16} />
            </div>
            <div className="modal-user-status">Sẵn sàng nhận việc</div>
          </div>

          {/* User Profile Card */}
          {showUserProfileCard && (
            <div
              ref={userProfileCardRef}
              className={`user-profile-card ${isClosingProfileCard ? 'closing' : ''}`}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <div className="user-profile-card-header">
                <div className="user-profile-card-avatar-section">
                  <Avatar
                    user={image.uploadedBy}
                    size={48}
                    className="user-profile-card-avatar"
                    fallbackClassName="user-profile-card-avatar-placeholder"
                  />
                  <div className="user-profile-card-name-section">
                    <div className="user-profile-card-name">
                      {image.uploadedBy.displayName?.trim() || image.uploadedBy.username}
                    </div>
                    <div className="user-profile-card-username">{image.uploadedBy.username}</div>
                  </div>
                </div>
                {user && user._id !== image.uploadedBy._id && (
                  <div className="user-profile-card-follow">
                    <FollowButton
                      userId={image.uploadedBy._id}
                      userDisplayName={image.uploadedBy.displayName || image.uploadedBy.username}
                      variant="default"
                      size="sm"
                    />
                  </div>
                )}
              </div>

              {isLoadingUserImages && userImages.length === 0 ? (
                <div className="user-profile-card-loading">
                  <div className="loading-spinner-small" />
                </div>
              ) : userImages.length > 0 ? (
                <div className="user-profile-card-images">
                  {userImages.map((userImage) => (
                    <div
                      key={userImage._id}
                      className="user-profile-card-image-item"
                      onClick={() => handleUserImageClick(userImage)}
                    >
                      <img
                        src={userImage.thumbnailUrl || userImage.smallUrl || userImage.imageUrl}
                        alt={userImage.imageTitle || 'Photo'}
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              ) : null}

              <button
                className="user-profile-card-view-btn"
                onClick={handleViewProfile}
              >
                Xem hồ sơ
              </button>
            </div>
          )}
        </div>

        <div className="modal-author-banner-right">
          <button
            className="modal-action-btn"
            onClick={handleToggleFavorite}
            title={isFavorited ? 'Bỏ yêu thích' : 'Yêu thích'}
            aria-label={isFavorited ? 'Bỏ yêu thích' : 'Yêu thích'}
          >
            <Heart
              size={20}
              fill={isFavorited ? 'currentColor' : 'none'}
              className={isFavorited ? 'favorite-icon-filled' : ''}
            />
          </button>
          <button
            className="modal-action-btn"
            onClick={handleOpenCollection}
            title="Thêm vào bộ sưu tập"
            aria-label="Thêm vào bộ sưu tập"
          >
            <FolderPlus size={20} />
          </button>
          <DownloadSizeSelector
            image={image}
            onDownload={handleDownloadWithSize}
          />
        </div>
      </div>
    );
  }

  return null;
};


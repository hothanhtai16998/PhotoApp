import { CheckCircle2, Heart, FolderPlus, X } from 'lucide-react';
import type { Image } from '@/types/image';
import type { User } from '@/types/user';
import { Avatar } from '../Avatar';
import { DownloadSizeSelector, type DownloadSize } from './DownloadSizeSelector';
import { FollowButton } from '../FollowButton';
import { useUserProfileCard } from './hooks/useUserProfileCard';
import { t } from '@/i18n';

interface ImageModalHeaderProps {
  image: Image;
  user: User | null;
  isMobile: boolean;
  renderAsPage: boolean;
  isFavorited: boolean;
  handleToggleFavorite: () => void;
  handleDownloadWithSize: (size: DownloadSize) => void;
  handleViewProfile: (e: React.MouseEvent) => void;
  handleOpenCollection: () => void;
  onClose: () => void;
  modalContentRef: React.RefObject<HTMLDivElement | null>;
  onImageSelect: (image: Image) => void;
  isHeaderHidden?: boolean;
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
  isHeaderHidden = false,
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
          title={t('image.viewProfile')}
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
            <div className="modal-user-status">{t('image.availableForHire')}</div>
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
                      userDisplayName={image.uploadedBy.displayName ?? image.uploadedBy.username}
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
                        src={userImage.thumbnailUrl ?? userImage.smallUrl ?? userImage.imageUrl}
                        alt={userImage.imageTitle ?? 'Photo'}
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
                {t('image.viewProfile')}
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
            title={t('image.close')}
            aria-label={t('common.close')}
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
      <div className={`image-modal-author-banner ${isHeaderHidden ? 'header-hidden' : ''}`}>
        <div
          className="modal-author-banner-left clickable-user-info"
          ref={userInfoRef}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleViewProfile}
          style={{ position: 'relative', cursor: 'pointer', willChange: 'opacity' }}
          title={t('image.viewProfile')}
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
            <div className="modal-user-status">{t('image.availableForHire')}</div>
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
                      userDisplayName={image.uploadedBy.displayName ?? image.uploadedBy.username}
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
                        src={userImage.thumbnailUrl ?? userImage.smallUrl ?? userImage.imageUrl}
                        alt={userImage.imageTitle ?? 'Photo'}
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
                {t('image.viewProfile')}
              </button>
            </div>
          )}
        </div>

        <div className="modal-author-banner-right">
          <button
            className="modal-action-btn"
            onClick={handleToggleFavorite}
            title={isFavorited ? t('image.unfavorite') : t('image.favorite')}
            aria-label={isFavorited ? t('image.unfavorite') : t('image.favorite')}
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
            title={t('image.addToCollection')}
            aria-label={t('image.addToCollection')}
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


import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/Avatar";
import { ProfileCompletion } from "./ProfileCompletion";
import { Edit2, Star, XCircle, MapPin, Globe, Instagram, Twitter, Users, ImageIcon, Folder, Heart, Download, Eye as EyeIcon, UserPlus } from "lucide-react";
import { toast } from "sonner";
import type { PublicUser } from "@/services/userService";
import type { UserStats } from "@/services/userStatsService";

interface ProfileHeaderProps {
    displayUser: PublicUser;
    isOwnProfile: boolean;
    userStats: UserStats | null;
    displayUserId: string | undefined;
    isSwitchingProfile: boolean;
    statsUserId: string | undefined;
    photosCount: number;
    collectionsCount: number;
    followStats: { followers: number; following: number; isFollowing: boolean };
    onEditProfile: () => void;
    onEditPins: () => void;
    onUpdateAvailability: () => void;
    onTabChange: (tab: 'photos' | 'illustrations' | 'collections' | 'stats') => void;
}

export function ProfileHeader({
    displayUser,
    isOwnProfile,
    userStats,
    displayUserId,
    isSwitchingProfile,
    statsUserId,
    photosCount,
    collectionsCount,
    followStats,
    onEditProfile,
    onEditPins,
    onUpdateAvailability,
    onTabChange,
}: ProfileHeaderProps) {
    return (
        <div className="profile-header">
            <div className="profile-avatar-container">
                <Avatar
                    user={displayUser}
                    size={120}
                    className="profile-avatar"
                    fallbackClassName="profile-avatar-placeholder"
                />
            </div>
            <div className="profile-info">
                <div className="profile-name-section">
                    <h1 className="profile-name">{displayUser.displayName || displayUser.username}</h1>
                    {isOwnProfile && (
                        <div className="profile-actions">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onEditProfile}
                                className="edit-profile-btn"
                            >
                                <Edit2 size={16} />
                                Chỉnh sửa hồ sơ
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={onEditPins}
                                className="edit-pins-btn"
                            >
                                <Star size={16} />
                                Chỉnh sửa ghim
                            </Button>
                        </div>
                    )}
                </div>
                <p className="profile-description">
                    {displayUser.bio || `Tải xuống miễn phí những bức ảnh chất lượng cao đẹp mắt được tuyển chọn bởi ${displayUser.displayName || displayUser.username}.`}
                </p>

                {/* Location */}
                {displayUser.location && (
                    <div className="profile-location">
                        <MapPin size={16} />
                        <span>{displayUser.location}</span>
                    </div>
                )}

                {/* Social Links */}
                {(displayUser.website || displayUser.instagram || displayUser.twitter || displayUser.facebook) && (
                    <div className="profile-social-links">
                        {displayUser.website && (
                            <a
                                href={displayUser.website.startsWith('http') ? displayUser.website : `https://${displayUser.website}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="social-link"
                                title="Website"
                            >
                                <Globe size={18} />
                            </a>
                        )}
                        {displayUser.instagram && (
                            <a
                                href={`https://instagram.com/${displayUser.instagram.replace(/^@/, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="social-link"
                                title={`@${displayUser.instagram}`}
                            >
                                <Instagram size={18} />
                            </a>
                        )}
                        {displayUser.twitter && (
                            <a
                                href={`https://twitter.com/${displayUser.twitter.replace(/^@/, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="social-link"
                                title={`@${displayUser.twitter}`}
                            >
                                <Twitter size={18} />
                            </a>
                        )}
                        {displayUser.facebook && (
                            <a
                                href={`https://facebook.com/${displayUser.facebook}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="social-link"
                                title={displayUser.facebook}
                            >
                                <Users size={18} />
                            </a>
                        )}
                    </div>
                )}

                {/* Profile Completion - Only show for own profile and when not 100% */}
                {isOwnProfile && userStats && userStats.profileCompletion && userStats.profileCompletion.percentage < 100 && (
                    <ProfileCompletion
                        completion={userStats.profileCompletion}
                        onEditProfile={onEditProfile}
                    />
                )}

                {/* Visual Stats Cards */}
                <div className="profile-stats-grid" key={displayUserId || 'no-user'}>
                    <button
                        className="profile-stat-card"
                        onClick={() => onTabChange('photos')}
                    >
                        <div className="stat-card-icon" style={{ backgroundColor: '#e0f2fe' }}>
                            <ImageIcon size={20} color="#0369a1" />
                        </div>
                        <div className="stat-card-content">
                            <span className="stat-card-value">
                                {(isSwitchingProfile || statsUserId !== displayUserId) ? '-' : photosCount}
                            </span>
                            <span className="stat-card-label">Ảnh</span>
                        </div>
                    </button>
                    <button
                        className="profile-stat-card"
                        onClick={() => onTabChange('collections')}
                    >
                        <div className="stat-card-icon" style={{ backgroundColor: '#fef3c7' }}>
                            <Folder size={20} color="#d97706" />
                        </div>
                        <div className="stat-card-content">
                            <span className="stat-card-value">
                                {(isSwitchingProfile || statsUserId !== displayUserId) ? '-' : collectionsCount}
                            </span>
                            <span className="stat-card-label">Bộ sưu tập</span>
                        </div>
                    </button>
                    <button
                        className="profile-stat-card"
                        title="Total likes received on your images"
                    >
                        <div className="stat-card-icon" style={{ backgroundColor: '#fce7f3' }}>
                            <Heart size={20} color="#be185d" />
                        </div>
                        <div className="stat-card-content">
                            <span className="stat-card-value">
                                {(isSwitchingProfile || !userStats || statsUserId !== displayUserId) 
                                    ? '-' 
                                    : userStats.totalFavorites.toLocaleString()}
                            </span>
                            <span className="stat-card-label">Lượt thích</span>
                        </div>
                    </button>
                    <button
                        className="profile-stat-card"
                        title="Total downloads of your images"
                    >
                        <div className="stat-card-icon" style={{ backgroundColor: '#d1fae5' }}>
                            <Download size={20} color="#059669" />
                        </div>
                        <div className="stat-card-content">
                            <span className="stat-card-value">
                                {(isSwitchingProfile || !userStats || statsUserId !== displayUserId) 
                                    ? '-' 
                                    : userStats.totalDownloads.toLocaleString()}
                            </span>
                            <span className="stat-card-label">Lượt tải</span>
                        </div>
                    </button>
                    {/* Profile views - Only show for own profile, but always render the card */}
                    {isOwnProfile && (
                        <button
                            className="profile-stat-card"
                            title="Lượt xem hồ sơ"
                        >
                            <div className="stat-card-icon" style={{ backgroundColor: '#e0e7ff' }}>
                                <EyeIcon size={20} color="#4f46e5" />
                            </div>
                            <div className="stat-card-content">
                                <span className="stat-card-value">
                                    {(isSwitchingProfile || !userStats || statsUserId !== displayUserId || userStats.profileViews === 0)
                                        ? '-' 
                                        : userStats.profileViews.toLocaleString()}
                                </span>
                                <span className="stat-card-label">Lượt xem</span>
                            </div>
                        </button>
                    )}
                    <button
                        className="profile-stat-card"
                        onClick={() => {
                            toast.info('Danh sách người theo dõi sẽ sớm ra mắt');
                        }}
                    >
                        <div className="stat-card-icon" style={{ backgroundColor: '#f3e8ff' }}>
                            <Users size={20} color="#7c3aed" />
                        </div>
                        <div className="stat-card-content">
                            <span className="stat-card-value">
                                {(isSwitchingProfile || statsUserId !== displayUserId) ? '-' : followStats.followers}
                            </span>
                            <span className="stat-card-label">Người theo dõi</span>
                        </div>
                    </button>
                    <button
                        className="profile-stat-card"
                        onClick={() => {
                            toast.info('Danh sách đang theo dõi sẽ sớm ra mắt');
                        }}
                    >
                        <div className="stat-card-icon" style={{ backgroundColor: '#fef3c7' }}>
                            <UserPlus size={20} color="#d97706" />
                        </div>
                        <div className="stat-card-content">
                            <span className="stat-card-value">
                                {(isSwitchingProfile || statsUserId !== displayUserId) ? '-' : followStats.following}
                            </span>
                            <span className="stat-card-label">Đang theo dõi</span>
                        </div>
                    </button>
                </div>
                {isOwnProfile && (
                    <div className="profile-availability">
                        <XCircle size={16} />
                        <span>Không sẵn sàng nhận việc</span>
                        <button
                            className="availability-update-link"
                            onClick={onUpdateAvailability}
                        >
                            Cập nhật
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}


import { Camera, Users, Folder, BarChart3 } from "lucide-react";

type TabType = 'photos' | 'following' | 'collections' | 'stats';

interface ProfileTabsProps {
    activeTab: TabType;
    photosCount: number;
    followingCount: number;
    followersCount: number;
    collectionsCount: number;
    onTabChange: (tab: TabType) => void;
}

export function ProfileTabs({
    activeTab,
    photosCount,
    followingCount,
    followersCount,
    collectionsCount,
    onTabChange,
}: ProfileTabsProps) {
    return (
        <div className="profile-tabs">
            <button
                className={`profile-tab ${activeTab === 'photos' ? 'active' : ''}`}
                onClick={() => onTabChange('photos')}
            >
                <Camera size={18} className="tab-icon" />
                <span className="tab-label">Ảnh</span>
                <span className="tab-count">{photosCount}</span>
            </button>
            <button
                className={`profile-tab ${activeTab === 'following' ? 'active' : ''}`}
                onClick={() => onTabChange('following')}
            >
                <Users size={18} className="tab-icon" />
                <span className="tab-label">Đang theo dõi</span>
                <span className="tab-count">{followingCount + followersCount}</span>
            </button>
            <button
                className={`profile-tab ${activeTab === 'collections' ? 'active' : ''}`}
                onClick={() => onTabChange('collections')}
            >
                <Folder size={18} className="tab-icon" />
                <span className="tab-label">Bộ sưu tập</span>
                <span className="tab-count">{collectionsCount}</span>
            </button>
            <button
                className={`profile-tab ${activeTab === 'stats' ? 'active' : ''}`}
                onClick={() => onTabChange('stats')}
            >
                <BarChart3 size={18} className="tab-icon" />
                <span className="tab-label">Thống kê</span>
            </button>
        </div>
    );
}


import { Camera, Palette, Folder, BarChart3 } from "lucide-react";

type TabType = 'photos' | 'illustrations' | 'collections' | 'stats';

interface ProfileTabsProps {
    activeTab: TabType;
    photosCount: number;
    illustrationsCount: number;
    collectionsCount: number;
    onTabChange: (tab: TabType) => void;
}

export function ProfileTabs({
    activeTab,
    photosCount,
    illustrationsCount,
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
                className={`profile-tab ${activeTab === 'illustrations' ? 'active' : ''}`}
                onClick={() => onTabChange('illustrations')}
            >
                <Palette size={18} className="tab-icon" />
                <span className="tab-label">Minh họa</span>
                <span className="tab-count">{illustrationsCount}</span>
            </button>
            <button
                className={`profile-tab ${activeTab === 'collections' ? 'active' : ''}`}
                onClick={() => onTabChange('collections')}
            >
                <Folder size={18} className="tab-icon" />
                <span className="tab-label">Collections</span>
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


import { Check, X, User, FileText, Phone, Image as ImageIcon, Folder } from 'lucide-react';
import type { ProfileCompletion as ProfileCompletionData } from '@/services/userStatsService';
import './ProfileCompletion.css';

interface ProfileCompletionProps {
  completion: ProfileCompletionData;
  onEditProfile?: () => void;
}

export const ProfileCompletion = ({ completion, onEditProfile }: ProfileCompletionProps) => {
  const { percentage, criteria } = completion;

  const criteriaList = [
    {
      key: 'hasAvatar' as keyof typeof criteria,
      label: 'Ảnh đại diện',
      icon: User,
      action: 'Thêm ảnh đại diện',
    },
    {
      key: 'hasBio' as keyof typeof criteria,
      label: 'Tiểu sử',
      icon: FileText,
      action: 'Thêm tiểu sử',
    },
    {
      key: 'hasPhone' as keyof typeof criteria,
      label: 'Số điện thoại',
      icon: Phone,
      action: 'Thêm số điện thoại',
    },
    {
      key: 'hasImages' as keyof typeof criteria,
      label: 'Tải lên ít nhất 1 ảnh',
      icon: ImageIcon,
      action: 'Tải ảnh lên',
    },
    {
      key: 'hasCollections' as keyof typeof criteria,
      label: 'Tạo ít nhất 1 bộ sưu tập',
      icon: Folder,
      action: 'Tạo bộ sưu tập',
    },
  ];

  const getProgressColor = () => {
    if (percentage >= 80) return '#10b981'; // green
    if (percentage >= 60) return '#3b82f6'; // blue
    if (percentage >= 40) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };

  return (
    <div className="profile-completion">
      <div className="profile-completion-header">
        <h3 className="profile-completion-title">Hoàn thiện hồ sơ</h3>
        <div className="profile-completion-percentage">
          <span className="percentage-value" style={{ color: getProgressColor() }}>
            {percentage}%
          </span>
        </div>
      </div>

      <div className="profile-completion-progress">
        <div className="progress-bar-container">
          <div
            className="progress-bar-fill"
            style={{
              width: `${percentage}%`,
              backgroundColor: getProgressColor(),
            }}
          />
        </div>
      </div>

      <div className="profile-completion-checklist">
        {criteriaList.map((item) => {
          const isCompleted = criteria[item.key];
          const Icon = item.icon;

          return (
            <div
              key={item.key}
              className={`completion-item ${isCompleted ? 'completed' : 'incomplete'}`}
            >
              <div className="completion-item-icon">
                {isCompleted ? (
                  <Check size={18} className="check-icon" />
                ) : (
                  <X size={18} className="x-icon" />
                )}
              </div>
              <div className="completion-item-content">
                <div className="completion-item-label">
                  <Icon size={16} />
                  <span>{item.label}</span>
                </div>
                {!isCompleted && onEditProfile && (
                  <button
                    className="completion-item-action"
                    onClick={onEditProfile}
                  >
                    {item.action}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {percentage < 100 && (
        <div className="profile-completion-footer">
          <p className="completion-message">
            Hoàn thiện hồ sơ của bạn để có thêm lượt xem và tương tác!
          </p>
        </div>
      )}
    </div>
  );
};


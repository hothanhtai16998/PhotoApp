import { useState, useEffect } from 'react';
import { adminService } from '@/services/adminService';
import { toast } from 'sonner';
import { BarChart2, Users, Images, TrendingUp, Calendar, UserPlus, Ban, ImagePlus, CheckCircle, XCircle, Flag, Clock } from 'lucide-react';

interface AnalyticsData {
    period: {
        days: number;
        startDate: string;
        endDate: string;
    };
    users: {
        total: number;
        new: number;
        banned: number;
    };
    images: {
        total: number;
        new: number;
        moderated: number;
        pendingModeration: number;
        approved: number;
        rejected: number;
        flagged: number;
    };
    categories: Array<{
        _id: string;
        name: string;
        count: number;
    }>;
    dailyUploads: Array<{
        _id: string;
        count: number;
    }>;
    topUploaders: Array<{
        userId: string;
        username: string;
        displayName: string;
        uploadCount: number;
    }>;
}

export function AdminAnalytics() {
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [days, setDays] = useState(30);

    const loadAnalytics = async () => {
        try {
            setLoading(true);
            const data = await adminService.getAnalytics(days);
            setAnalytics(data);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Lỗi khi tải dữ liệu phân tích');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAnalytics();
    }, [days]);

    if (loading) {
        return <div className="admin-loading">Đang tải dữ liệu phân tích...</div>;
    }

    if (!analytics) {
        return <div className="admin-loading">Không có dữ liệu</div>;
    }

    return (
        <div className="admin-analytics">
            <div className="admin-analytics-header">
                <h1 className="admin-title">Phân tích</h1>
                <div className="admin-analytics-controls">
                    <label>
                        Khoảng thời gian:
                        <select
                            value={days}
                            onChange={(e) => setDays(Number(e.target.value))}
                            className="admin-select"
                        >
                            <option value={7}>7 ngày</option>
                            <option value={30}>30 ngày</option>
                            <option value={90}>90 ngày</option>
                            <option value={365}>1 năm</option>
                        </select>
                    </label>
                </div>
            </div>

            {/* User Stats */}
            <div className="admin-section">
                <h2 className="admin-section-title">
                    <Users size={20} />
                    Thống kê người dùng
                </h2>
                <div className="admin-stats-grid">
                    <div className="admin-stat-card admin-stat-card-blue">
                        <div className="admin-stat-icon">
                            <Users size={24} />
                        </div>
                        <div className="admin-stat-content">
                            <div className="admin-stat-value">{analytics.users.total}</div>
                            <div className="admin-stat-label">Tổng số người dùng</div>
                        </div>
                    </div>
                    <div className="admin-stat-card admin-stat-card-green">
                        <div className="admin-stat-icon">
                            <UserPlus size={24} />
                        </div>
                        <div className="admin-stat-content">
                            <div className="admin-stat-value">{analytics.users.new}</div>
                            <div className="admin-stat-label">Người dùng mới ({days} ngày)</div>
                        </div>
                    </div>
                    <div className="admin-stat-card admin-stat-card-red">
                        <div className="admin-stat-icon">
                            <Ban size={24} />
                        </div>
                        <div className="admin-stat-content">
                            <div className="admin-stat-value">{analytics.users.banned}</div>
                            <div className="admin-stat-label">Người dùng bị cấm</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Image Stats */}
            <div className="admin-section">
                <h2 className="admin-section-title">
                    <Images size={20} />
                    Thống kê ảnh
                </h2>
                <div className="admin-stats-grid">
                    <div className="admin-stat-card admin-stat-card-purple">
                        <div className="admin-stat-icon">
                            <Images size={24} />
                        </div>
                        <div className="admin-stat-content">
                            <div className="admin-stat-value">{analytics.images.total}</div>
                            <div className="admin-stat-label">Tổng số ảnh</div>
                        </div>
                    </div>
                    <div className="admin-stat-card admin-stat-card-cyan">
                        <div className="admin-stat-icon">
                            <ImagePlus size={24} />
                        </div>
                        <div className="admin-stat-content">
                            <div className="admin-stat-value">{analytics.images.new}</div>
                            <div className="admin-stat-label">Ảnh mới ({days} ngày)</div>
                        </div>
                    </div>
                    <div className="admin-stat-card admin-stat-card-yellow">
                        <div className="admin-stat-icon">
                            <Clock size={24} />
                        </div>
                        <div className="admin-stat-content">
                            <div className="admin-stat-value">{analytics.images.pendingModeration}</div>
                            <div className="admin-stat-label">Chờ duyệt</div>
                        </div>
                    </div>
                    <div className="admin-stat-card admin-stat-card-green">
                        <div className="admin-stat-icon">
                            <CheckCircle size={24} />
                        </div>
                        <div className="admin-stat-content">
                            <div className="admin-stat-value">{analytics.images.approved}</div>
                            <div className="admin-stat-label">Đã phê duyệt</div>
                        </div>
                    </div>
                    <div className="admin-stat-card admin-stat-card-red">
                        <div className="admin-stat-icon">
                            <XCircle size={24} />
                        </div>
                        <div className="admin-stat-content">
                            <div className="admin-stat-value">{analytics.images.rejected}</div>
                            <div className="admin-stat-label">Đã từ chối</div>
                        </div>
                    </div>
                    <div className="admin-stat-card admin-stat-card-indigo">
                        <div className="admin-stat-icon">
                            <Flag size={24} />
                        </div>
                        <div className="admin-stat-content">
                            <div className="admin-stat-value">{analytics.images.flagged}</div>
                            <div className="admin-stat-label">Đã đánh dấu</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Category Distribution */}
            <div className="admin-section">
                <h2 className="admin-section-title">
                    <TrendingUp size={20} />
                    Phân bố theo danh mục
                </h2>
                <div className="admin-category-chart">
                    {analytics.categories.map((cat, index) => {
                        const maxCount = analytics.categories[0]?.count || 1;
                        const percentage = (cat.count / maxCount) * 100;
                        const colors = [
                            'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                            'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                            'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                            'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                            'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
                        ];
                        const color = colors[index % colors.length];
                        return (
                            <div key={cat._id} className="admin-category-bar-item">
                                <div className="admin-category-bar-header">
                                    <span className="admin-category-bar-name">{cat.name || 'Unknown'}</span>
                                    <span className="admin-category-bar-count">{cat.count} ảnh</span>
                                </div>
                                <div className="admin-category-bar-container">
                                    <div
                                        className="admin-category-bar-fill"
                                        style={{
                                            width: `${percentage}%`,
                                            background: color,
                                        }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Daily Uploads */}
            <div className="admin-section">
                <h2 className="admin-section-title">
                    <Calendar size={20} />
                    Lượt tải lên hàng ngày ({days} ngày gần nhất)
                </h2>
                <div className="admin-daily-uploads-chart">
                    {(() => {
                        const maxCount = Math.max(...analytics.dailyUploads.map(d => d.count), 1);
                        return analytics.dailyUploads.map((day) => {
                            const height = (day.count / maxCount) * 100;
                            const date = new Date(day._id);
                            const dayName = date.toLocaleDateString('vi-VN', { weekday: 'short' });
                            const dayNumber = date.getDate();
                            return (
                                <div key={day._id} className="admin-daily-upload-bar">
                                    <div
                                        className="admin-daily-upload-bar-fill"
                                        style={{ height: `${Math.max(height, 5)}%` }}
                                        title={`${day._id}: ${day.count} ảnh`}
                                    />
                                    <div className="admin-daily-upload-bar-label">
                                        <span className="admin-daily-upload-day">{dayNumber}</span>
                                        <span className="admin-daily-upload-count">{day.count}</span>
                                    </div>
                                </div>
                            );
                        });
                    })()}
                </div>
            </div>

            {/* Top Uploaders */}
            <div className="admin-section">
                <h2 className="admin-section-title">
                    <BarChart2 size={20} />
                    Top người tải lên ({days} ngày gần nhất)
                </h2>
                <div className="admin-top-uploaders">
                    {analytics.topUploaders.map((uploader, index) => {
                        const maxCount = analytics.topUploaders[0]?.uploadCount || 1;
                        const percentage = (uploader.uploadCount / maxCount) * 100;
                        const medalColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
                        const medalColor = medalColors[index] || '#6B7280';
                        return (
                            <div key={uploader.userId} className="admin-top-uploader-item">
                                <div className="admin-top-uploader-rank">
                                    {index < 3 ? (
                                        <span className="admin-top-uploader-medal" style={{ color: medalColor }}>
                                            {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                                        </span>
                                    ) : (
                                        <span className="admin-top-uploader-number">#{index + 1}</span>
                                    )}
                                </div>
                                <div className="admin-top-uploader-info">
                                    <div className="admin-top-uploader-name">
                                        <strong>{uploader.username}</strong>
                                        {uploader.displayName && (
                                            <span className="admin-top-uploader-display-name">{uploader.displayName}</span>
                                        )}
                                    </div>
                                    <div className="admin-top-uploader-bar-container">
                                        <div
                                            className="admin-top-uploader-bar-fill"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                                <div className="admin-top-uploader-count">{uploader.uploadCount} ảnh</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}


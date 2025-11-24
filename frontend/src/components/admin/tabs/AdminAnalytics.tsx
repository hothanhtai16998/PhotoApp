import { useState, useEffect, useRef, useMemo } from 'react';
import { adminService } from '@/services/adminService';
import { toast } from 'sonner';
import { BarChart2, Users, Images, TrendingUp, Calendar, UserPlus, Ban, ImagePlus, CheckCircle, XCircle, Flag, Clock, ArrowUp, ArrowDown, MoreVertical, Activity } from 'lucide-react';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

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
    dailyUsers: Array<{
        _id: string;
        count: number;
    }>;
    dailyPending: Array<{
        _id: string;
        count: number;
    }>;
    dailyApproved: Array<{
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

interface RealtimeData {
    usersOnline: number;
    viewsPerSecond: Array<{ second: number; count: number }>;
    mostActivePages: Array<{ path: string; userCount: number }>;
}

type MetricTab = 'users' | 'images' | 'pending' | 'approved';

export function AdminAnalytics() {
    const [loading, setLoading] = useState(true);
    const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
    const [realtimeData, setRealtimeData] = useState<RealtimeData | null>(null);
    const [days, setDays] = useState(30);
    const [activeTab, setActiveTab] = useState<MetricTab>('users');
    const realtimeIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

    const loadRealtimeData = async () => {
        try {
            const data = await adminService.getRealtimeAnalytics();
            setRealtimeData(data);
        } catch (error: any) {
            // Silently fail for realtime data to avoid spamming errors
            console.error('Failed to load realtime data:', error);
        }
    };

    useEffect(() => {
        loadAnalytics();
    }, [days]);

    // Load realtime data on mount and set up polling
    useEffect(() => {
        loadRealtimeData();
        
        // Poll every 5 seconds for real-time updates
        realtimeIntervalRef.current = setInterval(() => {
            loadRealtimeData();
        }, 5000);

        return () => {
            if (realtimeIntervalRef.current) {
                clearInterval(realtimeIntervalRef.current);
            }
        };
    }, []);

    // Calculate percentage changes (mock for now, can be enhanced with historical data)
    const calculatePercentage = (current: number, previous: number = current * 0.8) => {
        if (previous === 0) return 0;
        return ((current - previous) / previous) * 100;
    };

    // Prepare chart data based on active tab - MUST be called before early returns (Rules of Hooks)
    const chartData = useMemo(() => {
        if (!analytics) return [];
        
        let dataSource: Array<{ _id: string; count: number }> = [];
        
        switch (activeTab) {
            case 'users':
                dataSource = analytics.dailyUsers || [];
                break;
            case 'images':
                dataSource = analytics.dailyUploads || [];
                break;
            case 'pending':
                dataSource = analytics.dailyPending || [];
                break;
            case 'approved':
                dataSource = analytics.dailyApproved || [];
                break;
        }

        // Fill in missing dates and format for chart
        // Include today, so we go from (days-1) days ago to today (inclusive)
        // Use UTC dates to match backend MongoDB $dateToString format (which uses UTC)
        const now = new Date();
        const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        
        const dataMap = new Map(dataSource.map(item => [item._id, item.count]));
        const chartDataArray = [];
        
        // Generate dates from (days-1) days ago to today (inclusive) in UTC
        // This ensures today is always included and matches backend date format
        for (let i = 0; i < days; i++) {
            const dateUTC = new Date(todayUTC);
            dateUTC.setUTCDate(todayUTC.getUTCDate() - (days - 1 - i)); // Start from (days-1) days ago, end at today
            const dateStr = dateUTC.toISOString().split('T')[0]; // YYYY-MM-DD in UTC (matches backend)
            
            // Convert UTC date to local date for display label
            const localDate = new Date(dateUTC.getTime());
            chartDataArray.push({
                date: dateStr,
                dateLabel: localDate.toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' }),
                value: dataMap.get(dateStr) || 0,
            });
        }

        return chartDataArray;
    }, [activeTab, analytics, days]);

    // Calculate percentages - safe to call even if analytics is null
    const userPercentage = analytics ? calculatePercentage(analytics.users.total) : 0;
    const imagePercentage = analytics ? calculatePercentage(analytics.images.total) : 0;
    const pendingPercentage = analytics ? calculatePercentage(analytics.images.pendingModeration) : 0;
    const approvedPercentage = analytics ? calculatePercentage(analytics.images.approved) : 0;

    if (loading) {
        return <div className="admin-loading">Đang tải dữ liệu phân tích...</div>;
    }

    if (!analytics) {
        return <div className="admin-loading">Không có dữ liệu</div>;
    }

    return (
        <div className="admin-analytics-falcon">
            {/* Top Metric Tabs */}
            <div className="falcon-metric-tabs">
                <div 
                    className={`falcon-metric-tab ${activeTab === 'users' ? 'active' : ''}`}
                    onClick={() => setActiveTab('users')}
                >
                    <div className="falcon-metric-label">Người dùng</div>
                    <div className="falcon-metric-value">{analytics.users.total.toLocaleString()}</div>
                    <div className={`falcon-metric-change ${userPercentage >= 0 ? 'positive' : 'negative'}`}>
                        {userPercentage >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                        {Math.abs(userPercentage).toFixed(1)}%
                    </div>
                </div>
                <div 
                    className={`falcon-metric-tab ${activeTab === 'images' ? 'active' : ''}`}
                    onClick={() => setActiveTab('images')}
                >
                    <div className="falcon-metric-label">Ảnh</div>
                    <div className="falcon-metric-value">{analytics.images.total.toLocaleString()}</div>
                    <div className={`falcon-metric-change ${imagePercentage >= 0 ? 'positive' : 'negative'}`}>
                        {imagePercentage >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                        {Math.abs(imagePercentage).toFixed(1)}%
                    </div>
                </div>
                <div 
                    className={`falcon-metric-tab ${activeTab === 'pending' ? 'active' : ''}`}
                    onClick={() => setActiveTab('pending')}
                >
                    <div className="falcon-metric-label">Chờ duyệt</div>
                    <div className="falcon-metric-value">{analytics.images.pendingModeration.toLocaleString()}</div>
                    <div className={`falcon-metric-change ${pendingPercentage >= 0 ? 'positive' : 'negative'}`}>
                        {pendingPercentage >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                        {Math.abs(pendingPercentage).toFixed(1)}%
                    </div>
                </div>
                <div 
                    className={`falcon-metric-tab ${activeTab === 'approved' ? 'active' : ''}`}
                    onClick={() => setActiveTab('approved')}
                >
                    <div className="falcon-metric-label">Đã phê duyệt</div>
                    <div className="falcon-metric-value">{analytics.images.approved.toLocaleString()}</div>
                    <div className={`falcon-metric-change ${approvedPercentage >= 0 ? 'positive' : 'negative'}`}>
                        {approvedPercentage >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                        {Math.abs(approvedPercentage).toFixed(1)}%
                    </div>
                </div>
            </div>

            {/* Main Trend Chart */}
            <div className="falcon-card falcon-main-chart">
                <div className="falcon-card-header">
                    <div className="falcon-chart-header-left">
                        <select
                            value={days}
                            onChange={(e) => setDays(Number(e.target.value))}
                            className="falcon-select-small"
                        >
                            <option value={7}>Last 7 days</option>
                            <option value={30}>Last Month</option>
                            <option value={90}>Last 90 days</option>
                            <option value={365}>Last Year</option>
                        </select>
                    </div>
                    <div className="falcon-chart-header-right">
                        <a href="#" className="falcon-link-button" onClick={(e) => e.preventDefault()}>
                            Visitors overview →
                        </a>
                    </div>
                </div>
                <div className="falcon-card-body">
                    <ResponsiveContainer width="100%" height={400}>
                        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#667eea" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#667eea" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" />
                            <XAxis 
                                dataKey="dateLabel" 
                                stroke="#6c757d"
                                tick={{ fill: '#6c757d', fontSize: 12 }}
                            />
                            <YAxis 
                                stroke="#6c757d"
                                tick={{ fill: '#6c757d', fontSize: 12 }}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                    border: '1px solid #e9ecef',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                                }}
                                labelStyle={{ color: '#212529', fontWeight: 600 }}
                            />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke="#667eea"
                                strokeWidth={2}
                                fillOpacity={1}
                                fill="url(#colorValue)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Users Online Right Now Widget */}
            {realtimeData && (
                <div className="falcon-card falcon-realtime-widget">
                    <div className="falcon-card-header">
                        <h3 className="falcon-card-title">Users Online Right Now</h3>
                    </div>
                    <div className="falcon-card-body">
                        <div className="falcon-users-online-value">{realtimeData.usersOnline}</div>
                        
                        <div className="falcon-views-per-second">
                            <div className="falcon-views-label">Pages views / second</div>
                            <div className="falcon-views-chart">
                                {realtimeData.viewsPerSecond.map((item, index) => {
                                    const maxCount = Math.max(...realtimeData.viewsPerSecond.map(v => v.count), 1);
                                    const height = (item.count / maxCount) * 100;
                                    return (
                                        <div key={index} className="falcon-views-bar" style={{ height: `${Math.max(height, 10)}%` }} />
                                    );
                                })}
                            </div>
                        </div>

                        <div className="falcon-most-active-pages">
                            <div className="falcon-pages-header">
                                <span>Most Active Pages</span>
                                <span>User Count</span>
                            </div>
                            <div className="falcon-pages-list">
                                {realtimeData.mostActivePages.map((page, index) => (
                                    <div key={index} className="falcon-page-item">
                                        <span className="falcon-page-path">{page.path}</span>
                                        <span className="falcon-page-count">{page.userCount}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="falcon-realtime-link">
                            <a href="#" onClick={(e) => { e.preventDefault(); loadRealtimeData(); }}>
                                Real-time Data →
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content Grid */}
            <div className="falcon-analytics-grid">
                {/* Left Column */}
                <div className="falcon-analytics-left">
                    {/* Users Overview Card */}
                    <div className="falcon-card">
                        <div className="falcon-card-header">
                            <h3 className="falcon-card-title">Tổng quan người dùng</h3>
                            <button className="falcon-card-action">
                                <MoreVertical size={16} />
                            </button>
                        </div>
                        <div className="falcon-card-body">
                            <div className="falcon-stats-row">
                                <div className="falcon-stat-item">
                                    <div className="falcon-stat-label">Tổng người dùng</div>
                                    <div className="falcon-stat-value">{analytics.users.total.toLocaleString()}</div>
                                </div>
                                <div className="falcon-stat-item">
                                    <div className="falcon-stat-label">Người dùng mới ({days} ngày)</div>
                                    <div className="falcon-stat-value">{analytics.users.new.toLocaleString()}</div>
                                </div>
                                <div className="falcon-stat-item">
                                    <div className="falcon-stat-label">Người dùng bị cấm</div>
                                    <div className="falcon-stat-value">{analytics.users.banned.toLocaleString()}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Images Overview Card */}
                    <div className="falcon-card">
                        <div className="falcon-card-header">
                            <h3 className="falcon-card-title">Tổng quan ảnh</h3>
                            <button className="falcon-card-action">
                                <MoreVertical size={16} />
                            </button>
                        </div>
                        <div className="falcon-card-body">
                            <div className="falcon-stats-row">
                                <div className="falcon-stat-item">
                                    <div className="falcon-stat-label">Tổng ảnh</div>
                                    <div className="falcon-stat-value">{analytics.images.total.toLocaleString()}</div>
                                </div>
                                <div className="falcon-stat-item">
                                    <div className="falcon-stat-label">Ảnh mới ({days} ngày)</div>
                                    <div className="falcon-stat-value">{analytics.images.new.toLocaleString()}</div>
                                </div>
                                <div className="falcon-stat-item">
                                    <div className="falcon-stat-label">Chờ duyệt</div>
                                    <div className="falcon-stat-value">{analytics.images.pendingModeration.toLocaleString()}</div>
                                </div>
                                <div className="falcon-stat-item">
                                    <div className="falcon-stat-label">Đã phê duyệt</div>
                                    <div className="falcon-stat-value">{analytics.images.approved.toLocaleString()}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Daily Uploads Chart */}
                    <div className="falcon-card">
                        <div className="falcon-card-header">
                            <h3 className="falcon-card-title">Lượt tải lên hàng ngày</h3>
                            <select className="falcon-select-small">
                                <option>Last 7 days</option>
                                <option>Last Month</option>
                                <option>Last Year</option>
                            </select>
                        </div>
                        <div className="falcon-card-body">
                            <div className="falcon-chart-container">
                                <div className="falcon-bar-chart">
                                    {analytics.dailyUploads.map((day) => {
                                        const maxCount = Math.max(...analytics.dailyUploads.map(d => d.count), 1);
                                        const height = (day.count / maxCount) * 100;
                                        return (
                                            <div key={day._id} className="falcon-bar-item">
                                                <div className="falcon-bar" style={{ height: `${Math.max(height, 5)}%` }} />
                                                <div className="falcon-bar-label">{new Date(day._id).getDate()}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="falcon-analytics-right">
                    {/* Category Distribution */}
                    <div className="falcon-card">
                        <div className="falcon-card-header">
                            <h3 className="falcon-card-title">Phân bố theo danh mục</h3>
                            <button className="falcon-card-action">
                                <MoreVertical size={16} />
                            </button>
                        </div>
                        <div className="falcon-card-body">
                            <div className="falcon-table-container">
                                <table className="falcon-table">
                                    <thead>
                                        <tr>
                                            <th>Danh mục</th>
                                            <th>Số lượng</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {analytics.categories.map((cat) => (
                                            <tr key={cat._id}>
                                                <td>{cat.name || 'Unknown'}</td>
                                                <td>{cat.count.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* Top Uploaders */}
                    <div className="falcon-card">
                        <div className="falcon-card-header">
                            <h3 className="falcon-card-title">Top người tải lên</h3>
                            <button className="falcon-card-action">
                                <MoreVertical size={16} />
                            </button>
                        </div>
                        <div className="falcon-card-body">
                            <div className="falcon-table-container">
                                <table className="falcon-table">
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            <th>Tên người dùng</th>
                                            <th>Số lượng</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {analytics.topUploaders.map((uploader, index) => (
                                            <tr key={uploader.userId}>
                                                <td>{index + 1}</td>
                                                <td>{uploader.username}</td>
                                                <td>{uploader.uploadCount.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
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


import { useState, useEffect, useRef, useMemo } from 'react';
import { adminService } from '@/services/adminService';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/utils';
import { BarChart2, Calendar, ArrowUp, ArrowDown, MoreVertical } from 'lucide-react';
import { AreaChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart } from 'recharts';
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from '@/components/ui/chart';
import type { AnalyticsData } from '@/types/admin';

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
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Lỗi khi tải dữ liệu phân tích'));
        } finally {
            setLoading(false);
        }
    };

    const loadRealtimeData = async () => {
        try {
            const data = await adminService.getRealtimeAnalytics();
            setRealtimeData(data);
        } catch (error: unknown) {
            // Silently fail for realtime data to avoid spamming errors
            void error;
            console.error('Failed to load realtime data:', error);
        }
    };

    useEffect(() => {
        loadAnalytics();
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
        let comparisonSource: Array<{ _id: string; count: number }> = [];
        
        switch (activeTab) {
            case 'users':
                dataSource = analytics.dailyUsers || [];
                comparisonSource = analytics.dailyUsersComparison || [];
                break;
            case 'images':
                dataSource = analytics.dailyUploads || [];
                comparisonSource = analytics.dailyUploadsComparison || [];
                break;
            case 'pending':
                dataSource = analytics.dailyPending || [];
                comparisonSource = analytics.dailyPendingComparison || [];
                break;
            case 'approved':
                dataSource = analytics.dailyApproved || [];
                comparisonSource = analytics.dailyApprovedComparison || [];
                break;
        }

        // Fill in missing dates and format for chart
        // Include today, so we go from (days-1) days ago to today (inclusive)
        // Use Vietnam timezone (Asia/Ho_Chi_Minh) to match backend MongoDB $dateToString format
        const now = new Date();
        
        // Helper function to get date string in Vietnam timezone (YYYY-MM-DD)
        // This matches MongoDB's $dateToString with timezone: 'Asia/Ho_Chi_Minh'
        const getVietnamDateString = (date: Date): string => {
            // Use Intl.DateTimeFormat to get the date in Vietnam timezone
            const formatter = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'Asia/Ho_Chi_Minh',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
            // Format returns YYYY-MM-DD directly
            return formatter.format(date);
        };
        
        // Helper function to get date N days ago (in local time, will be converted to Vietnam timezone)
        const getDateNDaysAgo = (n: number): Date => {
            const date = new Date(now);
            date.setDate(date.getDate() - n);
            return date;
        };
        
        const dataMap = new Map(dataSource.map(item => [item._id, item.count]));
        const comparisonMap = new Map(comparisonSource.map(item => [item._id, item.count]));
        const chartDataArray = [];
        
        // Generate dates from (days-1) days ago to today (inclusive) in Vietnam timezone
        // This ensures today is always included and matches backend date format
        for (let i = 0; i < days; i++) {
            const daysAgo = days - 1 - i; // 0 = today, (days-1) = oldest date
            const date = getDateNDaysAgo(daysAgo);
            const dateStr = getVietnamDateString(date); // YYYY-MM-DD in Vietnam timezone (matches backend)
            
            // Get comparison date (same day, previous month - month-over-month comparison)
            const comparisonDate = new Date(date);
            comparisonDate.setMonth(comparisonDate.getMonth() - 1); // Go back one month
            const comparisonDateStr = getVietnamDateString(comparisonDate);
            
            // Use the date for display label (in local timezone for user)
            const localDate = date;
            const currentValue = dataMap.get(dateStr) || 0;
            // For month-over-month comparison, try to find the same date in previous month from current data
            // If not found in current data, try comparison map (which has previous period data)
            const comparisonValue = dataMap.get(comparisonDateStr) || comparisonMap.get(comparisonDateStr) || 0;
            
            // Calculate percentage change
            const percentageChange = comparisonValue > 0 
                ? ((currentValue - comparisonValue) / comparisonValue) * 100 
                : (currentValue > 0 ? 100 : 0);
            
            chartDataArray.push({
                date: dateStr,
                dateLabel: localDate.toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' }),
                value: currentValue,
                comparison: comparisonValue,
                percentageChange: percentageChange,
            });
        }

        // Find first non-zero data point and slice from there
        const firstDataIndex = chartDataArray.findIndex(d => d.value > 0);
        return firstDataIndex >= 0 ? chartDataArray.slice(firstDataIndex) : chartDataArray;
    }, [activeTab, analytics, days]);

    // Calculate percentages - safe to call even if analytics is null
    const userPercentage = analytics ? calculatePercentage(analytics.users.total) : 0;
    const imagePercentage = analytics ? calculatePercentage(analytics.images.total) : 0;
    const pendingPercentage = analytics ? calculatePercentage(analytics.images.pendingModeration) : 0;
    const approvedPercentage = analytics ? calculatePercentage(analytics.images.approved) : 0;

    // Format chart data for the selected metric tab with profile page logic
    const formattedChartData = useMemo(() => {
        if (!chartData || chartData.length === 0) return { data: [], domain: ['auto', 'auto'] };

        // Find first non-zero data point
        const firstDataIndex = chartData.findIndex(d => d.value > 0);
        const filteredData = firstDataIndex >= 0 ? chartData.slice(firstDataIndex) : chartData;

        // Calculate Y-axis domain - use absolute max scaling like Unsplash
        // Charts with different max values will have proportionally different heights
        const calculateDomain = (data: Array<{ value: number }>) => {
            if (data.length === 0) return ['auto', 'auto'];
            const values = data.map(d => d.value);
            const maxValue = Math.max(...values);

            if (maxValue === 0) return ['auto', 'auto'];

            // Use absolute max scaling - always scale from 0 to max value
            // This ensures charts with different max values show proportionally different heights
            const padding = Math.max(1, Math.ceil(maxValue * 0.1));
            return [0, maxValue + padding];
        };

        const domain = calculateDomain(filteredData);

        return { data: filteredData, domain };
    }, [chartData]);

    // Chart configuration
    const chartConfig = {
        value: {
            label: activeTab === 'users' ? 'Người dùng' : activeTab === 'images' ? 'Ảnh' : activeTab === 'pending' ? 'Chờ duyệt' : 'Đã phê duyệt',
            color: '#667eea',
        },
    };

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

            {/* Chart and Realtime Widget Side by Side */}
            <div className="falcon-chart-realtime-container">
                {/* Main Trend Chart - 2/3 width */}
                <div className="falcon-card falcon-main-chart">
                    <div className="falcon-card-header">
                        <div className="falcon-chart-header-left">
                            {/* Metric Label and Value */}
                            <div style={{ marginBottom: '24px' }}>
                                <div style={{ fontSize: '0.875rem', color: '#767676', textTransform: 'uppercase', marginBottom: '4px' }}>
                                    {activeTab === 'users' ? 'NGƯỜI DÙNG' : activeTab === 'images' ? 'ẢNH' : activeTab === 'pending' ? 'CHỜ DUYỆT' : 'ĐÃ PHÊ DUYỆT'}
                                </div>
                                <div style={{ fontSize: '36px', fontWeight: 700, color: '#111' }}>
                                    {activeTab === 'users' 
                                        ? analytics.users.total.toLocaleString() 
                                        : activeTab === 'images' 
                                        ? analytics.images.total.toLocaleString()
                                        : activeTab === 'pending'
                                        ? analytics.images.pendingModeration.toLocaleString()
                                        : analytics.images.approved.toLocaleString()}
                                </div>
                            </div>
                            <select
                                value={days}
                                onChange={(e) => setDays(Number(e.target.value))}
                                className="falcon-select-small"
                            >
                            <option value={7}>7 ngày qua</option>
                            <option value={30}>Tháng trước</option>
                            <option value={90}>90 ngày qua</option>
                            <option value={365}>Năm trước</option>
                            </select>
                        </div>
                    </div>
                    <div className="falcon-card-body">
                        <div className="insights-chart-container" style={{ height: '400px', position: 'relative' }}>
                            <ChartContainer config={chartConfig} className="h-full w-full">
                                <AreaChart data={formattedChartData.data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="fillValue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor="#e0e7ff" stopOpacity={0.8} />
                                            <stop offset="100%" stopColor="#fbfdfc" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke="#667eea"
                                        strokeWidth={2}
                                        fill="url(#fillValue)"
                                        dot={{ r: 2.5, fill: '#111' }}
                                        activeDot={{ r: 4, fill: '#111', stroke: '#111', strokeWidth: 1 }}
                                    />
                                    <XAxis
                                        dataKey="dateLabel"
                                        tick={{ fill: '#767676', fontSize: 11 }}
                                        axisLine={false}
                                        tickLine={false}
                                        interval="preserveStartEnd"
                                        height={20}
                                    />
                                    <YAxis
                                        hide
                                        domain={formattedChartData.domain}
                                    />
                                    <CartesianGrid vertical={false} horizontal={false} />
                                    <ChartTooltip
                                        cursor={false}
                                        content={<ChartTooltipContent indicator="dot" />}
                                    />
                                </AreaChart>
                            </ChartContainer>
                        </div>
                    </div>
                </div>

                {/* Users Online Right Now Widget - 1/3 width */}
                {realtimeData && (
                    <div className="falcon-card falcon-realtime-widget">
                    <div className="falcon-card-header">
                        <h3 className="falcon-card-title">Người dùng đang trực tuyến</h3>
                    </div>
                    <div className="falcon-card-body">
                        <div className="falcon-users-online-value">{realtimeData.usersOnline}</div>
                        
                        <div className="falcon-views-per-second">
                            <div className="falcon-views-label">Lượt xem trang / giây</div>
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
                                <span>Trang hoạt động nhiều nhất</span>
                                <span>Số người dùng</span>
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
                                Dữ liệu thời gian thực →
                            </a>
                        </div>
                    </div>
                </div>
                )}
            </div>

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
                                <option>7 ngày qua</option>
                                <option>Tháng trước</option>
                                <option>Năm trước</option>
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
                    {/* Category Distribution - Line Chart */}
                    <div className="falcon-card">
                        <div className="falcon-card-header">
                            <h3 className="falcon-card-title">Phân bố theo danh mục</h3>
                            <button className="falcon-card-action">
                                <MoreVertical size={16} />
                            </button>
                        </div>
                        <div className="falcon-card-body">
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart
                                    data={analytics.categories.map(cat => ({
                                        name: cat.name || 'Không xác định',
                                        count: cat.count,
                                        _id: cat._id
                                    }))}
                                    margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e9ecef" strokeOpacity={0.5} />
                                    <XAxis 
                                        dataKey="name" 
                                        stroke="#6c757d"
                                        tick={{ fill: '#6c757d', fontSize: 11 }}
                                        angle={-45}
                                        textAnchor="end"
                                        height={80}
                                    />
                                    <YAxis 
                                        stroke="#6c757d"
                                        tick={{ fill: '#6c757d', fontSize: 11 }}
                                    />
                                    <Tooltip
                                        content={({ active, payload }) => {
                                            if (active && payload?.length && payload[0]) {
                                                const data = payload[0].payload;
                                                return (
                                                    <div style={{
                                                        backgroundColor: 'rgba(255, 255, 255, 0.98)',
                                                        border: '1px solid #e9ecef',
                                                        borderRadius: '8px',
                                                        padding: '10px',
                                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                                                    }}>
                                                        <div style={{ fontWeight: 600, marginBottom: '6px', color: '#212529' }}>
                                                            {data.name}
                                                        </div>
                                                        <div style={{ color: '#667eea', fontWeight: 700, fontSize: '16px' }}>
                                                            {data.count.toLocaleString()} ảnh
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="count" 
                                        stroke="#667eea" 
                                        strokeWidth={3}
                                        dot={{ fill: '#667eea', r: 5, strokeWidth: 2, stroke: '#fff' }}
                                        activeDot={{ r: 7, fill: '#667eea', stroke: '#fff', strokeWidth: 2 }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
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
                                        {analytics.topUploaders?.map((uploader, index) => (
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
                    {analytics.topUploaders?.map((uploader, index) => {
                        const maxCount = analytics.topUploaders?.[0]?.uploadCount || 1;
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


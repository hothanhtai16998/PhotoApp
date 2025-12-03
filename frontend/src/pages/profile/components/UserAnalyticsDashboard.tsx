import { useState, useEffect, useMemo, useRef } from 'react';
import { analyticsService, type UserAnalytics } from '@/services/analyticsService';
import { Skeleton } from '@/components/ui/skeleton';
import { Eye, Download, ChevronDown, Award, Target } from 'lucide-react';
import { toast } from 'sonner';
import { uiConfig } from '@/config/uiConfig';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Area,
  AreaChart,
} from 'recharts';
import './UserAnalyticsDashboard.css';

export const UserAnalyticsDashboard = () => {
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<number>(uiConfig.analytics.dayOptions[1]); // Default to 30 days
  const [periodDropdownOpen, setPeriodDropdownOpen] = useState(false);
  const periodDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (periodDropdownRef.current && !periodDropdownRef.current.contains(event.target as Node)) {
        setPeriodDropdownOpen(false);
      }
    };

    if (periodDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [periodDropdownOpen]);

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        const data = await analyticsService.getUserAnalytics(days);
        setAnalytics(data);
      } catch (error) {
        console.error('Failed to load analytics:', error);
        toast.error('Không thể tải dữ liệu phân tích');
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [days]);

  // Calculate max values for charts
  const { maxViews, maxDownloads } = useMemo(() => {
    if (!analytics) return { maxViews: 0, maxDownloads: 0 };
    
    const maxViewsValue = Math.max(...analytics.viewsOverTime.map(d => d.value), 1);
    const maxDownloadsValue = Math.max(...analytics.downloadsOverTime.map(d => d.value), 1);
    
    return {
      maxViews: maxViewsValue,
      maxDownloads: maxDownloadsValue,
    };
  }, [analytics]);

  // Get period label
  const periodLabel = days === 7 ? '7 ngày qua' : days === 30 ? '30 ngày qua' : days === 365 ? 'Năm ngoái' : `${days} ngày`;

  // Format number with dots (European format like "2.090")
  const formatNumber = (num: number): string => {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  // Format chart data for Recharts (with date labels)
  const formatChartData = useMemo(() => {
    if (!analytics) return { viewsData: [], downloadsData: [], viewsDomain: [0, 0], downloadsDomain: [0, 0] };
    
    const viewsData = analytics.viewsOverTime.map((item) => ({
      date: item.date,
      dateLabel: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: item.value,
      views: item.value,
    }));
    
    const downloadsData = analytics.downloadsOverTime.map((item) => ({
      date: item.date,
      dateLabel: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      value: item.value,
      downloads: item.value,
    }));
    
    // Calculate Y-axis domain based on data range (adaptive like Unsplash)
    const calculateDomain = (data: Array<{ value: number }>) => {
      if (data.length === 0) return ['auto', 'auto'];
      const values = data.map(d => d.value);
      const minValue = Math.min(...values);
      const maxValue = Math.max(...values);
      
      // If all values are 0, use auto domain
      if (maxValue === 0) return ['auto', 'auto'];
      
      // If min is 0, start from 0. Otherwise, let it auto-scale from data min
      // This makes the line "float" when all values are non-zero
      if (minValue === 0) {
        // Has zeros - include 0 in domain
        const padding = maxValue * 0.1;
        return [0, Math.round(maxValue + padding)];
      } else {
        // All values are non-zero - let it auto-scale (line will float)
        // Use dataMin with padding below, but ensure it doesn't go negative
        const range = maxValue - minValue;
        const padding = range > 0 ? range * 0.15 : maxValue * 0.15;
        const domainMin = Math.max(0, Math.round(minValue - padding));
        const domainMax = Math.round(maxValue + padding);
        return [domainMin, domainMax];
      }
    };
    
    const viewsDomain = calculateDomain(viewsData);
    const downloadsDomain = calculateDomain(downloadsData);
    
    return { viewsData, downloadsData, viewsDomain, downloadsDomain };
  }, [analytics]);

  // Chart configuration
  const viewsChartConfig = {
    views: {
      label: 'Lượt xem',
      color: '#b1e3c5',
    },
  };

  const downloadsChartConfig = {
    downloads: {
      label: 'Lượt tải',
      color: '#b1e3c5',
    },
  };

  if (loading) {
    return (
      <div className="analytics-dashboard">
        <div className="insights-header">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="insights-main-grid">
          <Skeleton className="h-96 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="analytics-dashboard">
        <div className="analytics-empty">
          <p>Không có dữ liệu phân tích</p>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-dashboard">
      {/* Insights Header */}
      <div className="insights-header">
        <h2 className="insights-title">Thống kê</h2>
        <div className="insights-period-dropdown" ref={periodDropdownRef}>
          <button 
            className="insights-period-button"
            onClick={() => setPeriodDropdownOpen(!periodDropdownOpen)}
          >
            {periodLabel}
            <ChevronDown size={16} className={periodDropdownOpen ? 'rotate-180' : ''} />
          </button>
          {periodDropdownOpen && (
            <div className="insights-period-menu">
              {uiConfig.analytics.dayOptions.map((optionDays) => (
                <button
                  key={optionDays}
                  className={`insights-period-option ${days === optionDays ? 'active' : ''}`}
                  onClick={() => {
                    setDays(optionDays);
                    setPeriodDropdownOpen(false);
                  }}
                >
                  {optionDays === 7 ? '7 ngày qua' : 
                   optionDays === 30 ? '30 ngày qua' : 
                   optionDays === 365 ? 'Năm ngoái' : 
                   `${optionDays} ngày`}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Insights Grid - Two Large Cards */}
      <div className="insights-main-grid">
        {/* Views Card */}
        <div className="insights-card">
          <div className="insights-card-header">
            <div className="insights-metric-label">LƯỢT XEM</div>
            <div className="insights-metric-value">{formatNumber(analytics.summary.totalViews)}</div>
          </div>
          
          {/* Line Chart */}
          <div className="insights-chart-container">
            <ChartContainer config={viewsChartConfig} className="h-[116px] w-full">
              <AreaChart data={formatChartData.viewsData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ddf3ef" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#fbfdfc" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#b1e3c5"
                  strokeWidth={2}
                  fill="url(#fillViews)"
                  dot={{ r: 2.5, fill: '#111' }}
                  activeDot={{ r: 3, fill: '#111' }}
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
                  domain={formatChartData.viewsDomain}
                />
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              </AreaChart>
            </ChartContainer>
          </div>

          {/* Most Viewed On */}
          <div className="insights-most-section">
            <div className="insights-most-header">
              <span>Được xem nhiều nhất trên</span>
              <button className="insights-most-toggle">
                <ChevronDown size={16} />
              </button>
            </div>
            <div className="insights-platform">
              <span className="insights-platform-name">PhotoApp</span>
            </div>
            {analytics.mostPopularImages.length > 0 && (
              <div className="insights-thumbnails">
                {analytics.mostPopularImages.slice(0, 3).map((image) => (
                  <div key={image._id} className="insights-thumbnail" title={image.imageTitle}>
                    {image.thumbnailUrl ? (
                      <img 
                        src={image.thumbnailUrl} 
                        alt={image.imageTitle || ''}
                        className="insights-thumbnail-image"
                      />
                    ) : (
                      <div className="insights-thumbnail-placeholder">
                        <Eye size={16} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Downloads Card */}
        <div className="insights-card">
          <div className="insights-card-header">
            <div className="insights-metric-label">LƯỢT TẢI</div>
            <div className="insights-metric-value">{formatNumber(analytics.summary.totalDownloads)}</div>
          </div>
          
          {/* Line Chart */}
          <div className="insights-chart-container">
            <ChartContainer config={downloadsChartConfig} className="h-[116px] w-full">
              <AreaChart data={formatChartData.downloadsData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillDownloads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ddf3ef" stopOpacity={0.8} />
                    <stop offset="100%" stopColor="#fbfdfc" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#b1e3c5"
                  strokeWidth={2}
                  fill="url(#fillDownloads)"
                  dot={{ r: 2.5, fill: '#111' }}
                  activeDot={{ r: 3, fill: '#111' }}
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
                  domain={formatChartData.downloadsDomain}
                />
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              </AreaChart>
            </ChartContainer>
          </div>

          {/* Most Downloaded On */}
          <div className="insights-most-section">
            <div className="insights-most-header">
              <span>Được tải nhiều nhất trên</span>
              <button className="insights-most-toggle">
                <ChevronDown size={16} />
              </button>
            </div>
            {analytics.summary.totalDownloads > 0 ? (
              <>
                <div className="insights-platform">
                  <span className="insights-platform-name">PhotoApp</span>
                </div>
                {analytics.mostPopularImages.filter(img => img.downloads > 0).slice(0, 3).length > 0 && (
                  <div className="insights-thumbnails">
                    {analytics.mostPopularImages.filter(img => img.downloads > 0).slice(0, 3).map((image) => (
                      <div key={image._id} className="insights-thumbnail" title={image.imageTitle}>
                        {image.thumbnailUrl ? (
                          <img 
                            src={image.thumbnailUrl} 
                            alt={image.imageTitle || ''}
                            className="insights-thumbnail-image"
                          />
                        ) : (
                          <div className="insights-thumbnail-placeholder">
                            <Download size={16} />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="insights-empty-state">Chưa có dữ liệu để báo cáo.</div>
            )}
          </div>
        </div>
      </div>

      {/* Secondary Sections Grid */}
      <div className="insights-secondary-grid">
        {/* Uses Section */}
        <div className="insights-section-card">
          <div className="insights-section-header">
            <h3 className="insights-section-title">Sử dụng</h3>
            <button className="insights-section-button">Hiển thị nổi bật</button>
          </div>
          <div className="insights-uses-content">
            {/* Uses chart/visualization would go here */}
            <div className="insights-empty-state">Nothing to report so far.</div>
          </div>
          <div className="insights-section-footer">
            <span className="insights-section-note">Việc sử dụng ảnh hiện chỉ giới hạn ở một số trang web nhất định.</span>
          </div>
        </div>

        {/* Milestones Section */}
        <div className="insights-section-card">
          <div className="insights-section-header">
            <h3 className="insights-section-title">Cột mốc của bạn</h3>
          </div>
          <div className="insights-milestones">
            <div className="milestone-item">
              <Award size={20} className="milestone-icon" />
              <div className="milestone-content">
                <h4 className="milestone-title">Lần tải lên đầu tiên</h4>
                <div className="milestone-date">Đã tải lên {new Date(analytics.mostPopularImages[0]?.createdAt || Date.now()).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}</div>
              </div>
            </div>
            <div className="milestone-item milestone-upcoming">
              <Target size={20} className="milestone-icon" />
              <div className="milestone-content">
                <h4 className="milestone-title">Ảnh nổi bật</h4>
                <div className="milestone-description">Đạt 5 ảnh nổi bật trên trang chủ</div>
              </div>
            </div>
            <div className="milestone-item milestone-upcoming">
              <Eye size={20} className="milestone-icon" />
              <div className="milestone-content">
                <h4 className="milestone-title">Lượt xem</h4>
                <div className="milestone-description">Đạt 100k lượt xem</div>
              </div>
            </div>
            <div className="milestone-item milestone-upcoming">
              <Download size={20} className="milestone-icon" />
              <div className="milestone-content">
                <h4 className="milestone-title">Lượt tải</h4>
                <div className="milestone-description">Đạt 500k lượt tải</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Your Images Section */}
      <div className="insights-images-section">
        <div className="insights-images-header">
          <h3 className="insights-section-title">Ảnh của bạn</h3>
          <button className="insights-sort-button">
            Sắp xếp theo lượt xem
            <ChevronDown size={16} />
          </button>
        </div>
        {analytics.mostPopularImages.length > 0 ? (
          <div className="insights-images-list">
            {analytics.mostPopularImages.map((image, index) => (
              <div key={image._id} className="insights-image-item">
                <div className="insights-image-thumbnail">
                  <div className="insights-image-rank">#{index + 1}</div>
                  {image.thumbnailUrl || image.smallUrl || image.imageUrl ? (
                    <img 
                      src={image.thumbnailUrl || image.smallUrl || image.imageUrl} 
                      alt={image.imageTitle || ''}
                      className="insights-image-thumbnail-img"
                    />
                  ) : (
                    <div className="insights-image-placeholder">
                      <Eye size={20} />
                    </div>
                  )}
                </div>
                <div className="insights-image-info">
                  <div className="insights-image-meta">
                    <div className="insights-image-badge">Đã xuất bản</div>
                    <time className="insights-image-date">
                      {new Date(image.createdAt).toLocaleDateString('vi-VN', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </time>
                  </div>
                  <div className="insights-image-stats">
                    <div className="insights-image-stat">
                      <Eye size={14} />
                      <span>{formatNumber(image.views)}</span>
                    </div>
                    <div className="insights-image-stat">
                      <Download size={14} />
                      <span>{formatNumber(image.downloads)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="insights-empty-state">Chưa có ảnh nào.</div>
        )}
      </div>
    </div>
  );
};
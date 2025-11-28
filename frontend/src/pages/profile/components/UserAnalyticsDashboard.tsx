import { useState, useEffect, useMemo } from 'react';
import { analyticsService, type UserAnalytics } from '@/services/analyticsService';
import { Skeleton } from '@/components/ui/skeleton';
import { Eye, Download, Image as ImageIcon, TrendingUp, MapPin, Folder } from 'lucide-react';
import { toast } from 'sonner';
import { uiConfig } from '@/config/uiConfig';
import './UserAnalyticsDashboard.css';

export const UserAnalyticsDashboard = () => {
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

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

  if (loading) {
    return (
      <div className="analytics-dashboard">
        <div className="analytics-header">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="analytics-grid">
          {Array.from({ length: uiConfig.skeleton.analyticsCardCount }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
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
      {/* Header */}
      <div className="analytics-header">
        <h2 className="analytics-title">Phân tích & Thống kê</h2>
        <select
          className="analytics-period-select"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        >
          <option value={7}>7 ngày</option>
          <option value={30}>30 ngày</option>
          <option value={90}>90 ngày</option>
          <option value={180}>180 ngày</option>
          <option value={365}>365 ngày</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="analytics-summary-grid">
        <div className="analytics-summary-card">
          <div className="summary-card-icon" style={{ backgroundColor: '#e0f2fe' }}>
            <ImageIcon size={24} color="#0369a1" />
          </div>
          <div className="summary-card-content">
            <div className="summary-card-label">Tổng ảnh</div>
            <div className="summary-card-value">{analytics.summary.totalImages.toLocaleString()}</div>
          </div>
        </div>

        <div className="analytics-summary-card">
          <div className="summary-card-icon" style={{ backgroundColor: '#fef3c7' }}>
            <Eye size={24} color="#d97706" />
          </div>
          <div className="summary-card-content">
            <div className="summary-card-label">Tổng lượt xem</div>
            <div className="summary-card-value">{analytics.summary.totalViews.toLocaleString()}</div>
            <div className="summary-card-subtext">
              Trung bình: {analytics.summary.avgViewsPerImage.toLocaleString()}/ảnh
            </div>
          </div>
        </div>

        <div className="analytics-summary-card">
          <div className="summary-card-icon" style={{ backgroundColor: '#d1fae5' }}>
            <Download size={24} color="#059669" />
          </div>
          <div className="summary-card-content">
            <div className="summary-card-label">Tổng lượt tải</div>
            <div className="summary-card-value">{analytics.summary.totalDownloads.toLocaleString()}</div>
            <div className="summary-card-subtext">
              Trung bình: {analytics.summary.avgDownloadsPerImage.toLocaleString()}/ảnh
            </div>
          </div>
        </div>

        <div className="analytics-summary-card">
          <div className="summary-card-icon" style={{ backgroundColor: '#fce7f3' }}>
            <TrendingUp size={24} color="#be185d" />
          </div>
          <div className="summary-card-content">
            <div className="summary-card-label">Tương tác</div>
            <div className="summary-card-value">
              {(analytics.summary.totalViews + analytics.summary.totalDownloads).toLocaleString()}
            </div>
            <div className="summary-card-subtext">Tổng lượt xem + tải</div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="analytics-charts-section">
        {/* Views/Downloads Over Time */}
        <div className="analytics-chart-card">
          <h3 className="chart-title">Lượt xem & Tải xuống theo thời gian</h3>
          <div className="chart-container">
            <div className="time-series-chart">
              {analytics.viewsOverTime.map((data, i) => {
                const height = maxViews > 0 ? (data.value / maxViews) * 100 : 0;
                const downloadHeight = maxDownloads > 0 
                  ? (analytics.downloadsOverTime[i]?.value || 0) / maxDownloads * 100 
                  : 0;
                
                return (
                  <div key={i} className="chart-bar-group">
                    <div className="chart-bar-wrapper">
                      <div
                        className="chart-bar chart-bar-views"
                        style={{ height: `${Math.max(height, 2)}%` }}
                        title={`${data.date}: ${data.value} lượt xem`}
                      />
                      <div
                        className="chart-bar chart-bar-downloads"
                        style={{ height: `${Math.max(downloadHeight, 2)}%` }}
                        title={`${data.date}: ${analytics.downloadsOverTime[i]?.value || 0} lượt tải`}
                      />
                    </div>
                    {i % Math.ceil(analytics.viewsOverTime.length / 10) === 0 && (
                      <div className="chart-date-label">
                        {new Date(data.date).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="chart-legend">
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#3b82f6' }} />
                <span>Lượt xem</span>
              </div>
              <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#10b981' }} />
                <span>Lượt tải</span>
              </div>
            </div>
          </div>
        </div>

        {/* Most Popular Images */}
        <div className="analytics-chart-card">
          <h3 className="chart-title">Ảnh phổ biến nhất</h3>
          <div className="popular-images-list">
            {analytics.mostPopularImages.length > 0 ? (
              analytics.mostPopularImages.map((image, index) => (
                <div key={image._id} className="popular-image-item">
                  <div className="popular-image-rank">#{index + 1}</div>
                  <div className="popular-image-content">
                    <div className="popular-image-title">{image.imageTitle || 'Untitled'}</div>
                    <div className="popular-image-stats">
                      <span className="stat-item">
                        <Eye size={14} />
                        {image.views.toLocaleString()}
                      </span>
                      <span className="stat-item">
                        <Download size={14} />
                        {image.downloads.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="empty-state">Chưa có dữ liệu</p>
            )}
          </div>
        </div>

        {/* Geographic Distribution */}
        <div className="analytics-chart-card">
          <h3 className="chart-title">Phân bố địa lý</h3>
          <div className="geographic-list">
            {analytics.geographicDistribution.length > 0 ? (
              analytics.geographicDistribution.map((geo, index) => (
                <div key={index} className="geographic-item">
                  <div className="geographic-header">
                    <MapPin size={16} />
                    <span className="geographic-location">{geo.location}</span>
                  </div>
                  <div className="geographic-stats">
                    <span>{geo.imageCount} ảnh</span>
                    <span>{geo.totalViews.toLocaleString()} lượt xem</span>
                    <span>{geo.totalDownloads.toLocaleString()} lượt tải</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="empty-state">Chưa có dữ liệu địa lý</p>
            )}
          </div>
        </div>

        {/* Best Performing Categories */}
        <div className="analytics-chart-card">
          <h3 className="chart-title">Danh mục hoạt động tốt nhất</h3>
          <div className="categories-list">
            {analytics.bestPerformingCategories.length > 0 ? (
              analytics.bestPerformingCategories.map((category, index) => (
                <div key={index} className="category-item">
                  <div className="category-header">
                    <Folder size={16} />
                    <span className="category-name">{category.category}</span>
                  </div>
                  <div className="category-stats">
                    <span>{category.imageCount} ảnh</span>
                    <span>{category.totalViews.toLocaleString()} lượt xem</span>
                    <span>TB: {category.avgViews.toLocaleString()}/ảnh</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="empty-state">Chưa có dữ liệu danh mục</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};






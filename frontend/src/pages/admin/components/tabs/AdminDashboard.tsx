import { adminService, type DashboardStats } from '@/services/adminService';
import { useFormattedDate } from '@/hooks/useFormattedDate';
import { usePermissions } from '@/hooks/usePermissions';
import { useState } from 'react';
import { Download, Users, Image as ImageIcon, Tag, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { t } from '@/i18n';

interface AdminDashboardProps {
    stats: DashboardStats | null;
    loading: boolean;
}

function DateCell({ date }: { date: string }) {
    const formattedDate = useFormattedDate(date, { format: 'short' });
    return <td>{formattedDate || date}</td>;
}

export function AdminDashboard({ stats, loading }: AdminDashboardProps) {
    const { hasPermission, isSuperAdmin } = usePermissions();
    const [isExporting, setIsExporting] = useState(false);
    const navigate = useNavigate();

    const handleExportData = async () => {
        if (!isSuperAdmin() && !hasPermission('exportData')) {
            toast.error('Bạn không có quyền xuất dữ liệu');
            return;
        }

        setIsExporting(true);
        try {
            const blob = await adminService.exportData();
            
            // Create download link
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `photoapp-export-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            toast.success('Đã xuất dữ liệu thành công');
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Lỗi khi xuất dữ liệu');
        } finally {
            setIsExporting(false);
        }
    };

    if (loading) {
        return (
            <div className="admin-dashboard">
                <div className="admin-dashboard-skeleton">
                    <Skeleton className="h-48 w-full mb-6" />
                    <div className="admin-stats-grid">
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-32 w-full" />
                        <Skeleton className="h-32 w-full" />
                    </div>
                    <Skeleton className="h-64 w-full mt-6" />
                    <Skeleton className="h-64 w-full mt-6" />
                </div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="admin-dashboard">
                <div className="admin-empty-state">
                    <p>{t('admin.noData')}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-dashboard">
            <div className="admin-dashboard-hero" style={{ position: 'relative' }}>
                <h1 className="admin-dashboard-title">
                    <span>📊</span>
                    Dashboard
                </h1>
                <p className="admin-dashboard-subtitle">Tổng quan về nền tảng của bạn</p>
                {(isSuperAdmin() || hasPermission('exportData')) && (
                    <Button
                        onClick={handleExportData}
                        disabled={isExporting}
                        variant="outline"
                        style={{ 
                            position: 'absolute',
                            top: '20px',
                            right: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px'
                        }}
                    >
                        <Download size={16} />
                        {isExporting ? 'Đang xuất...' : 'Xuất dữ liệu'}
                    </Button>
                )}
            </div>

            {/* Quick Actions */}
            <div className="admin-quick-actions">
                <h3 className="admin-quick-actions-title">{t('admin.quickActions')}</h3>
                <div className="admin-quick-actions-grid">
                    {(isSuperAdmin() || hasPermission('viewUsers')) && (
                        <button
                            className="admin-quick-action-btn"
                            onClick={() => {
                                // Use window.location to trigger tab change
                                window.history.pushState({}, '', '/admin');
                                window.dispatchEvent(new PopStateEvent('popstate'));
                                setTimeout(() => {
                                    const event = new CustomEvent('adminTabChange', { detail: 'users' });
                                    window.dispatchEvent(event);
                                }, 100);
                            }}
                            title={t('admin.manageUsers')}
                        >
                            <Users size={20} />
                            <span>{t('admin.manageUsers')}</span>
                        </button>
                    )}
                    {(isSuperAdmin() || hasPermission('viewImages')) && (
                        <button
                            className="admin-quick-action-btn"
                            onClick={() => {
                                const event = new CustomEvent('adminTabChange', { detail: 'images' });
                                window.dispatchEvent(event);
                            }}
                            title={t('admin.manageImages')}
                        >
                            <ImageIcon size={20} />
                            <span>{t('admin.manageImages')}</span>
                        </button>
                    )}
                    {(isSuperAdmin() || hasPermission('viewCategories')) && (
                        <button
                            className="admin-quick-action-btn"
                            onClick={() => {
                                const event = new CustomEvent('adminTabChange', { detail: 'categories' });
                                window.dispatchEvent(event);
                            }}
                            title={t('admin.manageCategories')}
                        >
                            <Tag size={20} />
                            <span>{t('admin.manageCategories')}</span>
                        </button>
                    )}
                    {(isSuperAdmin() || hasPermission('viewAnalytics')) && (
                        <button
                            className="admin-quick-action-btn"
                            onClick={() => {
                                const event = new CustomEvent('adminTabChange', { detail: 'analytics' });
                                window.dispatchEvent(event);
                            }}
                            title={t('admin.analytics')}
                        >
                            <Search size={20} />
                            <span>{t('admin.analytics')}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Stats Cards */}
            <div className="admin-stats-grid">
                <div className="admin-stat-card admin-stat-card-blue">
                    <div className="admin-stat-icon">
                        <span>👥</span>
                    </div>
                    <div className="admin-stat-content">
                        <div className="admin-stat-value">{stats.stats.totalUsers}</div>
                        <div className="admin-stat-label">Tổng số lượng người dùng</div>
                    </div>
                </div>
                <div className="admin-stat-card admin-stat-card-purple">
                    <div className="admin-stat-icon">
                        <span>🖼️</span>
                    </div>
                    <div className="admin-stat-content">
                        <div className="admin-stat-value">{stats.stats.totalImages}</div>
                        <div className="admin-stat-label">Tổng số lượng ảnh</div>
                    </div>
                </div>
                <div className="admin-stat-card admin-stat-card-cyan">
                    <div className="admin-stat-icon">
                        <span>📁</span>
                    </div>
                    <div className="admin-stat-content">
                        <div className="admin-stat-value">{stats.stats.categoryStats.length}</div>
                        <div className="admin-stat-label">Danh mục</div>
                    </div>
                </div>
            </div>

            {/* Category Stats */}
            <div className="admin-section">
                <h2 className="admin-section-title">Top Categories</h2>
                <div className="admin-category-list">
                    {stats.stats.categoryStats.map((cat) => (
                        <div key={cat._id} className="admin-category-item">
                            <span className="admin-category-name">{cat._id}</span>
                            <span className="admin-category-count">{cat.count} images</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Recent Users */}
            <div className="admin-section">
                <h2 className="admin-section-title">Người dùng được tạo gần đây</h2>
                <div className="admin-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Tên tài khoản</th>
                                <th>Email</th>
                                <th>Họ và tên</th>
                                <th>Quyền Admin</th>
                                <th>Ngày tham gia</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.recentUsers.map((u) => (
                                <tr key={u._id}>
                                    <td>{u.username}</td>
                                    <td>{u.email}</td>
                                    <td>{u.displayName}</td>
                                    <td>
                                        {u.isSuperAdmin ? (
                                            <span className="admin-status-badge super-admin">Super Admin</span>
                                        ) : u.isAdmin ? (
                                            <span className="admin-status-badge admin">Admin</span>
                                        ) : (
                                            <span className="admin-status-badge none">No</span>
                                        )}
                                    </td>
                                    <DateCell date={u.createdAt} />
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Recent Images */}
            <div className="admin-section">
                <h2 className="admin-section-title">Ảnh được thêm gần đây</h2>
                <div className="admin-table">
                    <table>
                        <thead>
                            <tr>
                                <th>Tiêu đề</th>
                                <th>Danh mục</th>
                                <th>Người đăng</th>
                                <th>Ngày đăng</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats.recentImages.map((img) => (
                                <tr key={img._id}>
                                    <td>{img.imageTitle}</td>
                                    <td>
                                        {typeof img.imageCategory === 'string'
                                            ? img.imageCategory
                                            : img.imageCategory?.name || 'Không xác định'}
                                    </td>
                                    <td>{img.uploadedBy?.displayName || img.uploadedBy?.username}</td>
                                    <DateCell date={img.createdAt} />
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}


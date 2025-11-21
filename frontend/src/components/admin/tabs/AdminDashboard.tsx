import type { DashboardStats } from '@/services/adminService';
import { useFormattedDate } from '@/hooks/useFormattedDate';

interface AdminDashboardProps {
    stats: DashboardStats | null;
    loading: boolean;
}

function DateCell({ date }: { date: string }) {
    const formattedDate = useFormattedDate(date, { format: 'short' });
    return <td>{formattedDate || date}</td>;
}

export function AdminDashboard({ stats, loading }: AdminDashboardProps) {
    if (loading) {
        return <div className="admin-loading">Đang tải...</div>;
    }

    if (!stats) {
        return <div className="admin-loading">Không có dữ liệu</div>;
    }

    return (
        <div className="admin-dashboard">
            <h1 className="admin-title">Dashboard</h1>

            {/* Stats Cards */}
            <div className="admin-stats-grid">
                <div className="admin-stat-card">
                    <div className="admin-stat-value">{stats.stats.totalUsers}</div>
                    <div className="admin-stat-label">Tổng số lượng người dùngn</div>
                </div>
                <div className="admin-stat-card">
                    <div className="admin-stat-value">{stats.stats.totalImages}</div>
                    <div className="admin-stat-label">Tổng số lượng ảnh</div>
                </div>
                <div className="admin-stat-card">
                    <div className="admin-stat-value">{stats.stats.categoryStats.length}</div>
                    <div className="admin-stat-label">Danh mục</div>
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
                                            : img.imageCategory?.name || 'Unknown'}
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


import { useState, useEffect } from 'react';
import { adminService } from '@/services/adminService';
import { toast } from 'sonner';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Trash2, Search } from 'lucide-react';

export function AdminFavorites() {
    const { hasPermission, isSuperAdmin } = usePermissions();
    const [favorites, setFavorites] = useState<unknown[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (!isSuperAdmin() && !hasPermission('manageFavorites')) {
            toast.error('Bạn không có quyền quản lý yêu thích');
            return;
        }
        loadFavorites(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

    const loadFavorites = async (page = 1) => {
        try {
            setLoading(true);
            const data = await adminService.getAllFavorites({ page, limit: 20, search });
            setFavorites(data.favorites);
            setPagination(data.pagination);
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Lỗi khi tải danh sách yêu thích');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadFavorites(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const handleDeleteFavorite = async (userId: string, imageId: string) => {
        if (!confirm('Bạn có chắc muốn xóa yêu thích này?')) {
            return;
        }

        try {
            await adminService.deleteFavorite(userId, imageId);
            toast.success('Đã xóa yêu thích thành công');
            loadFavorites(pagination.page);
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Lỗi khi xóa yêu thích');
        }
    };

    if (loading) {
        return <div className="admin-loading">Đang tải...</div>;
    }

    return (
        <div className="admin-favorites">
            <div className="admin-header">
                <h1 className="admin-title">Quản lý yêu thích</h1>
            </div>

            <div className="admin-search">
                <div className="admin-search-input-wrapper">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Tìm kiếm yêu thích..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="admin-search-input"
                    />
                </div>
            </div>

            <div className="admin-table">
                <table>
                    <thead>
                        <tr>
                            <th>Người dùng</th>
                            <th>Ảnh</th>
                            <th>Ngày thêm</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                            {favorites.length === 0 ? (
                                <tr>
                                    <td colSpan={4} style={{ textAlign: 'center', padding: '40px' }}>
                                        Chưa có dữ liệu yêu thích
                                    </td>
                                </tr>
                            ) : (
                                favorites.map((fav) => (
                                    <tr key={fav._id}>
                                        <td>{fav.user?.displayName || fav.user?.username || fav.user?.email}</td>
                                        <td>{fav.image?.imageTitle || 'N/A'}</td>
                                        <td>{new Date(fav.createdAt).toLocaleDateString('vi-VN')}</td>
                                    <td>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handleDeleteFavorite(fav.user._id, fav.image._id)}
                                        >
                                            <Trash2 size={16} />
                                        </Button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}


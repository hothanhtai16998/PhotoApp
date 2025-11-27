import { useState, useEffect } from 'react';
import { adminService } from '@/services/adminService';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Trash2, FolderDot } from 'lucide-react';

interface Collection {
    _id: string;
    name: string;
    description?: string;
    createdBy: {
        _id: string;
        username: string;
        displayName: string;
    };
    images: string[];
    isPublic: boolean;
    views: number;
    createdAt: string;
    updatedAt: string;
}

export function AdminCollections() {
    const [loading, setLoading] = useState(true);
    const [collections, setCollections] = useState<Collection[]>([]);
    const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 20 });
    const [search, setSearch] = useState('');

    const loadCollections = async (page: number = 1) => {
        try {
            setLoading(true);
            const data = await adminService.getAllCollections({
                page,
                limit: 20,
                search: search.trim() || undefined,
            });
            setCollections((data.collections as Collection[]) || []);
            setPagination(data.pagination);
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Lỗi khi tải danh sách bộ sưu tập'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCollections(1);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const handleDelete = async (collectionId: string, name: string) => {
        if (!confirm(`Bạn có chắc chắn muốn xóa bộ sưu tập "${name}"?`)) {
            return;
        }

        try {
            await adminService.deleteCollection(collectionId);
            toast.success('Xóa bộ sưu tập thành công');
            loadCollections(pagination.page);
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Lỗi khi xóa bộ sưu tập'));
        }
    };

    const handleTogglePublic = async (collection: Collection) => {
        try {
            await adminService.updateCollection(collection._id, {
                isPublic: !collection.isPublic,
            });
            toast.success(`Bộ sưu tập đã được ${!collection.isPublic ? 'công khai' : 'ẩn'}`);
            loadCollections(pagination.page);
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Lỗi khi cập nhật bộ sưu tập'));
        }
    };

    if (loading && collections.length === 0) {
        return <div className="admin-loading">Đang tải danh sách bộ sưu tập...</div>;
    }

    return (
        <div className="admin-collections">
            <div className="admin-header">
                <h1 className="admin-title">
                    <FolderDot size={24} />
                    Bộ sưu tập
                </h1>
                <div className="admin-search">
                    <Search size={18} />
                    <Input
                        type="text"
                        placeholder="Tìm kiếm bộ sưu tập..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                loadCollections(1);
                            }
                        }}
                    />
                </div>
            </div>

            {collections.length === 0 ? (
                <div className="admin-empty">Không có bộ sưu tập nào</div>
            ) : (
                <>
                    <div className="admin-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Tên bộ sưu tập</th>
                                    <th>Mô tả</th>
                                    <th>Người tạo</th>
                                    <th>Số ảnh</th>
                                    <th>Lượt xem</th>
                                    <th>Trạng thái</th>
                                    <th>Ngày tạo</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {collections.map((collection) => (
                                    <tr key={collection._id}>
                                        <td>{collection.name}</td>
                                        <td>{collection.description || '-'}</td>
                                        <td>
                                            {collection.createdBy?.displayName || collection.createdBy?.username || '-'}
                                        </td>
                                        <td>{collection.images?.length || 0}</td>
                                        <td>{collection.views || 0}</td>
                                        <td>
                                            <span
                                                className={`admin-status-badge ${collection.isPublic ? 'active' : 'banned'}`}
                                            >
                                                {collection.isPublic ? 'Công khai' : 'Riêng tư'}
                                            </span>
                                        </td>
                                        <td>{new Date(collection.createdAt).toLocaleDateString('vi-VN')}</td>
                                        <td>
                                            <div className="admin-actions">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleTogglePublic(collection)}
                                                    title={collection.isPublic ? 'Ẩn bộ sưu tập' : 'Công khai bộ sưu tập'}
                                                >
                                                    {collection.isPublic ? 'Ẩn' : 'Hiện'}
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleDelete(collection._id, collection.name)}
                                                    title="Xóa bộ sưu tập"
                                                >
                                                    <Trash2 size={16} />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {pagination.pages > 1 && (
                        <div className="admin-pagination">
                            <Button
                                variant="outline"
                                onClick={() => loadCollections(pagination.page - 1)}
                                disabled={pagination.page === 1}
                            >
                                Trước
                            </Button>
                            <span>
                                Trang {pagination.page} / {pagination.pages} (Tổng: {pagination.total})
                            </span>
                            <Button
                                variant="outline"
                                onClick={() => loadCollections(pagination.page + 1)}
                                disabled={pagination.page === pagination.pages}
                            >
                                Sau
                            </Button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}


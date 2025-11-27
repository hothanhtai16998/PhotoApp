import { useState, useEffect } from 'react';
import { adminService } from '@/services/adminService';
import { toast } from 'sonner';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Search } from 'lucide-react';

export function AdminModeration() {
    const { hasPermission, isSuperAdmin } = usePermissions();
    interface PendingContentItem {
        _id: string;
        title?: string;
        content?: string;
        uploadedBy?: { displayName?: string; username?: string };
        status?: string;
        createdAt: string;
    }
    const [pendingContent, setPendingContent] = useState<PendingContentItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (!isSuperAdmin() && !hasPermission('moderateContent')) {
            toast.error('Bạn không có quyền kiểm duyệt nội dung');
            return;
        }
        loadPendingContent();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadPendingContent = async () => {
        try {
            setLoading(true);
            const data = await adminService.getPendingContent();
            setPendingContent((data.content as PendingContentItem[]) || []);
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Lỗi khi tải nội dung chờ duyệt');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (contentId: string) => {
        try {
            await adminService.approveContent(contentId);
            toast.success('Đã duyệt nội dung thành công');
            loadPendingContent();
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Lỗi khi duyệt nội dung');
        }
    };

    const handleReject = async (contentId: string) => {
        const reason = prompt('Lý do từ chối (tùy chọn):');
        try {
            await adminService.rejectContent(contentId, reason || undefined);
            toast.success('Đã từ chối nội dung');
            loadPendingContent();
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Lỗi khi từ chối nội dung');
        }
    };

    if (loading) {
        return <div className="admin-loading">Đang tải...</div>;
    }

    return (
        <div className="admin-moderation">
            <div className="admin-header">
                <h1 className="admin-title">Kiểm duyệt nội dung</h1>
            </div>

            <div className="admin-search">
                <div className="admin-search-input-wrapper">
                    <Search size={20} />
                    <input
                        type="text"
                        placeholder="Tìm kiếm nội dung..."
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
                            <th>Nội dung</th>
                            <th>Người đăng</th>
                            <th>Trạng thái</th>
                            <th>Ngày đăng</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pendingContent.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={{ textAlign: 'center', padding: '40px' }}>
                                    Không có nội dung chờ duyệt
                                </td>
                            </tr>
                        ) : (
                            pendingContent.map((item) => (
                                <tr key={item._id}>
                                    <td>{item.title || item.content}</td>
                                    <td>{item.uploadedBy?.displayName || item.uploadedBy?.username}</td>
                                    <td>
                                        <span className={`admin-status-badge ${item.status || 'pending'}`}>
                                            {item.status || 'Chờ duyệt'}
                                        </span>
                                    </td>
                                    <td>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</td>
                                    <td>
                                        <div className="admin-actions">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleApprove(item._id)}
                                            >
                                                <CheckCircle size={16} />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleReject(item._id)}
                                            >
                                                <XCircle size={16} />
                                            </Button>
                                        </div>
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


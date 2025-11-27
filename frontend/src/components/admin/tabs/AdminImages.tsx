import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Trash2, CheckCircle, XCircle, Flag } from 'lucide-react';
import { adminService } from '@/services/adminService';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/utils';
import type { AdminImage } from '@/services/adminService';
import { PermissionButton } from '../PermissionButton';

interface AdminImagesProps {
    images: AdminImage[];
    pagination: { page: number; pages: number; total: number };
    search: string;
    onSearchChange: (value: string) => void;
    onSearch: () => void;
    onPageChange: (page: number) => void;
    onDelete: (imageId: string, imageTitle: string) => void;
    onImageUpdated?: () => void;
}

export function AdminImages({
    images,
    pagination,
    search,
    onSearchChange,
    onSearch,
    onPageChange,
    onDelete,
    onImageUpdated,
}: AdminImagesProps) {
    const handleModerate = async (imageId: string, status: 'approved' | 'rejected' | 'flagged') => {
        const notes = prompt('Nhập ghi chú kiểm duyệt (tùy chọn):');
        if (notes === null && status !== 'approved') return; // User cancelled (except for approve which doesn't need notes)
        
        try {
            await adminService.moderateImage(imageId, status, notes || undefined);
            toast.success(`Đã ${status === 'approved' ? 'phê duyệt' : status === 'rejected' ? 'từ chối' : 'đánh dấu'} ảnh`);
            onImageUpdated?.();
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Lỗi khi kiểm duyệt ảnh'));
        }
    };
    return (
        <div className="admin-images">
            <div className="admin-header">
                <h1 className="admin-title">Quản lý hình ảnh</h1>
                <div className="admin-search">
                    <Search size={20} />
                    <Input
                        placeholder="Nhập tên ảnh..."
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                onSearch();
                            }
                        }}
                    />
                    <Button onClick={onSearch}>Tìm</Button>
                </div>
            </div>

            <div className="admin-images-grid">
                {images.map((img) => (
                    <div key={img._id} className="admin-image-card">
                        <img src={img.imageUrl} alt={img.imageTitle} />
                        <div className="admin-image-info">
                            <h3>{img.imageTitle}</h3>
                            <p>Danh mục: {typeof img.imageCategory === 'string'
                                ? img.imageCategory
                                : img.imageCategory?.name || 'Không xác định'}</p>
                            <p>Người đăng: {img.uploadedBy.displayName || img.uploadedBy.username}</p>
                            <p>Ngày đăng: {img.createdAt}</p>
                            {img.moderationStatus && (
                                <p className="moderation-status">
                                    Trạng thái: <span className={`moderation-badge ${img.moderationStatus}`}>
                                        {img.moderationStatus === 'approved' ? 'Đã phê duyệt' : 
                                         img.moderationStatus === 'rejected' ? 'Đã từ chối' : 
                                         img.moderationStatus === 'flagged' ? 'Đã đánh dấu' : 'Chờ duyệt'}
                                    </span>
                                </p>
                            )}
                            <div className="admin-image-actions">
                                <PermissionButton
                                    permission="moderateImages"
                                    action="Phê duyệt hình ảnh"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleModerate(img._id, 'approved')}
                                >
                                    <CheckCircle size={16} /> Phê duyệt
                                </PermissionButton>
                                <PermissionButton
                                    permission="moderateImages"
                                    action="Từ chối hình ảnh"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleModerate(img._id, 'rejected')}
                                >
                                    <XCircle size={16} /> Từ chối
                                </PermissionButton>
                                <PermissionButton
                                    permission="moderateImages"
                                    action="Đánh dấu hình ảnh"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleModerate(img._id, 'flagged')}
                                >
                                    <Flag size={16} /> Đánh dấu
                                </PermissionButton>
                                <PermissionButton
                                    permission="deleteImages"
                                    action="Xóa hình ảnh"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onDelete(img._id, img.imageTitle)}
                                >
                                    <Trash2 size={16} /> Xoá
                                </PermissionButton>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {pagination.pages > 1 && (
                <div className="admin-pagination">
                    <Button
                        disabled={pagination.page === 1}
                        onClick={() => onPageChange(pagination.page - 1)}
                    >
                        Quay lại
                    </Button>
                    <span>
                        Trang {pagination.page} trên {pagination.pages}
                    </span>
                    <Button
                        disabled={pagination.page === pagination.pages}
                        onClick={() => onPageChange(pagination.page + 1)}
                    >
                        Tiếp theo
                    </Button>
                </div>
            )}
        </div>
    );
}


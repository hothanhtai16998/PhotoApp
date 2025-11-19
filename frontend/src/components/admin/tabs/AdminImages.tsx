import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Trash2 } from 'lucide-react';
import type { AdminImage } from '@/services/adminService';

interface AdminImagesProps {
    images: AdminImage[];
    pagination: { page: number; pages: number; total: number };
    search: string;
    onSearchChange: (value: string) => void;
    onSearch: () => void;
    onPageChange: (page: number) => void;
    onDelete: (imageId: string, imageTitle: string) => void;
}

export function AdminImages({
    images,
    pagination,
    search,
    onSearchChange,
    onSearch,
    onPageChange,
    onDelete,
}: AdminImagesProps) {
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
                                : img.imageCategory?.name || 'Unknown'}</p>
                            <p>Người đăng: {img.uploadedBy.displayName || img.uploadedBy.username}</p>
                            <p>Ngày đăng: {img.createdAt}</p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onDelete(img._id, img.imageTitle)}
                            >
                                <Trash2 size={16} /> Xoá
                            </Button>
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


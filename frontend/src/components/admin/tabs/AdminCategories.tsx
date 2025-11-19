import { Button } from '@/components/ui/button';
import { Edit2, Trash2 } from 'lucide-react';
import { CreateCategoryModal, EditCategoryModal } from '../modals';
import type { Category } from '@/services/categoryService';

interface AdminCategoriesProps {
    categories: Category[];
    creatingCategory: boolean;
    editingCategory: Category | null;
    onCreateClick: () => void;
    onEdit: (category: Category) => void;
    onDelete: (categoryId: string, categoryName: string) => void;
    onCloseCreate: () => void;
    onCloseEdit: () => void;
    onSaveCreate: (data: { name: string; description?: string }) => Promise<void>;
    onSaveEdit: (categoryId: string, updates: { name?: string; description?: string; isActive?: boolean }) => Promise<void>;
}

export function AdminCategories({
    categories,
    creatingCategory,
    editingCategory,
    onCreateClick,
    onEdit,
    onDelete,
    onCloseCreate,
    onCloseEdit,
    onSaveCreate,
    onSaveEdit,
}: AdminCategoriesProps) {
    return (
        <div className="admin-categories">
            <div className="admin-header">
                <h1 className="admin-title">Quản lý danh mục</h1>
                <Button onClick={onCreateClick}>
                    + Thêm danh mục
                </Button>
            </div>

            <div className="admin-table">
                <table>
                    <thead>
                        <tr>
                            <th>Tên</th>
                            <th>Mô tả</th>
                            <th>Số lượng ảnh hiện tại</th>
                            <th>Trạng thái</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {categories.map((cat) => (
                            <tr key={cat._id}>
                                <td><strong>{cat.name}</strong></td>
                                <td>{cat.description || '-'}</td>
                                <td>{cat.imageCount || 0}</td>
                                <td>
                                    <span className={`admin-status-badge ${cat.isActive ? 'admin' : 'none'}`}>
                                        {cat.isActive ? 'Đang kích hoạt' : 'Inactive'}
                                    </span>
                                </td>
                                <td>
                                    <div className="admin-actions">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => onEdit(cat)}
                                        >
                                            <Edit2 size={16} />
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => onDelete(cat._id, cat.name)}
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

            {categories.length === 0 && (
                <div className="admin-empty-state">
                    <p>Không tìm thấy danh mục. Vui lòng tạo mới.</p>
                </div>
            )}

            {creatingCategory && (
                <CreateCategoryModal
                    onClose={onCloseCreate}
                    onSave={onSaveCreate}
                />
            )}

            {editingCategory && (
                <EditCategoryModal
                    category={editingCategory}
                    onClose={onCloseEdit}
                    onSave={onSaveEdit}
                />
            )}
        </div>
    );
}


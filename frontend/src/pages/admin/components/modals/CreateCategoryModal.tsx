import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface CreateCategoryModalProps {
    onClose: () => void;
    onSave: (data: { name: string; description?: string }) => Promise<boolean>;
}

export function CreateCategoryModal({ onClose, onSave }: CreateCategoryModalProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error('Không thể thiếu tên danh mục');
            return;
        }
        await onSave({ name: name.trim(), description: description.trim() || undefined });
    };

    return (
        <div className="admin-modal-overlay" onClick={onClose}>
            <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                <div className="admin-modal-header">
                    <h2>Thêm danh mục mới</h2>
                    <button onClick={onClose}>×</button>
                </div>
                <form onSubmit={handleSubmit} className="admin-modal-form">
                    <div className="admin-form-group">
                        <label>Tên danh mục</label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            placeholder="Chân dung, phong cảnh, sự kiện,..."
                        />
                    </div>
                    <div className="admin-form-group">
                        <label>Mô tả</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            placeholder="Thêm mô tả cho danh mục (có thể bỏ trống)"
                        />
                    </div>
                    <div className="admin-modal-actions">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Huỷ
                        </Button>
                        <Button type="submit">Tạo</Button>
                    </div>
                </form>
            </div>
        </div>
    );
}


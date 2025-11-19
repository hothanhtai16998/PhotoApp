import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { User, AdminRolePermissions } from '@/services/adminService';

interface CreateRoleModalProps {
    users: User[];
    onClose: () => void;
    onSave: (data: { userId: string; role: 'super_admin' | 'admin' | 'moderator'; permissions: AdminRolePermissions }) => Promise<void>;
}

export function CreateRoleModal({ users, onClose, onSave }: CreateRoleModalProps) {
    const [selectedUserId, setSelectedUserId] = useState('');
    const [role, setRole] = useState<'super_admin' | 'admin' | 'moderator'>('admin');
    const [permissions, setPermissions] = useState({
        manageUsers: false,
        deleteUsers: false,
        manageImages: false,
        deleteImages: false,
        manageCategories: false,
        manageAdmins: false,
        viewDashboard: true,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUserId) {
            toast.error('Vui lòng chọn tài khoản để tạo quyền admin.');
            return;
        }
        await onSave({ userId: selectedUserId, role, permissions });
    };

    return (
        <div className="admin-modal-overlay" onClick={onClose}>
            <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                <div className="admin-modal-header">
                    <h2>Thêm quyền admin</h2>
                    <button onClick={onClose}>×</button>
                </div>
                <form onSubmit={handleSubmit} className="admin-modal-form">
                    <div className="admin-form-group">
                        <label>Chọn tài khoản</label>
                        <select
                            value={selectedUserId}
                            onChange={(e) => setSelectedUserId(e.target.value)}
                            required
                            className="admin-select"
                        >
                            <option value="">Vui lòng chọn tải khoản...</option>
                            {users.filter(u => !u.isAdmin && !u.isSuperAdmin).map((u) => (
                                <option key={u._id} value={u._id}>
                                    {u.displayName} ({u.username})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="admin-form-group">
                        <label>Vai trò</label>
                        <select
                            value={role}
                            onChange={(e) => {
                                const value = e.target.value as 'super_admin' | 'admin' | 'moderator';
                                if (value === 'super_admin' || value === 'admin' || value === 'moderator') {
                                    setRole(value);
                                }
                            }}
                            className="admin-select"
                        >
                            <option value="admin">Admin</option>
                            <option value="moderator">Mod</option>
                            <option value="super_admin">Super Admin</option>
                        </select>
                    </div>

                    <div className="admin-form-group">
                        <label>Quyền hạn</label>
                        <div className="admin-permissions-checkboxes">
                            {Object.entries(permissions).map(([key, value]) => (
                                <label key={key} className="admin-checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={value as boolean}
                                        onChange={(e) => setPermissions({ ...permissions, [key]: e.target.checked })}
                                        disabled={key === 'viewDashboard'}
                                    />
                                    <span>{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="admin-modal-actions">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Huỷ
                        </Button>
                        <Button type="submit">Thêm</Button>
                    </div>
                </form>
            </div>
        </div>
    );
}


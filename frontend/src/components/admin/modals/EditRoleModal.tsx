import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { AdminRole, AdminRolePermissions } from '@/services/adminService';
import { PERMISSION_GROUPS, getAllPermissionKeys } from '@/utils/permissionGroups';

interface EditRoleModalProps {
    role: AdminRole;
    onClose: () => void;
    onSave: (userId: string, updates: { role?: 'super_admin' | 'admin' | 'moderator'; permissions?: AdminRolePermissions }) => Promise<void>;
}

export function EditRoleModal({ role, onClose, onSave }: EditRoleModalProps) {
    // Get all available permissions
    const allPermissions = getAllPermissionKeys();

    const [selectedRole, setSelectedRole] = useState<'super_admin' | 'admin' | 'moderator'>(role.role);
    // Merge existing permissions with all available permissions to show all checkboxes
    const [permissions, setPermissions] = useState<AdminRolePermissions>({
        ...allPermissions,
        ...(role.permissions || {}),
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Extract userId - it can be either a string or a User object
        const userId = typeof role.userId === 'string' ? role.userId : role.userId._id;
        await onSave(userId, { role: selectedRole, permissions });
    };

    return (
        <div className="admin-modal-overlay" onClick={onClose}>
            <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
                <div className="admin-modal-header">
                    <h2>Sửa quyền admin</h2>
                    <button onClick={onClose}>×</button>
                </div>
                <form onSubmit={handleSubmit} className="admin-modal-form">
                    <div className="admin-form-group">
                        <label>Tài khoản admin</label>
                        <Input
                            value={
                                typeof role.userId === 'string'
                                    ? ''
                                    : (role.userId?.displayName || role.userId?.username || '')
                            }
                            disabled
                        />
                    </div>

                    <div className="admin-form-group">
                        <label>Vai trò</label>
                        <select
                            value={selectedRole}
                            onChange={(e) => {
                                const value = e.target.value as 'super_admin' | 'admin' | 'moderator';
                                if (value === 'super_admin' || value === 'admin' || value === 'moderator') {
                                    setSelectedRole(value);
                                }
                            }}
                            className="admin-select"
                        >
                            <option value="admin">Admin</option>
                            <option value="moderator">Moderator</option>
                            <option value="super_admin">Super Admin</option>
                        </select>
                    </div>

                    <div className="admin-form-group">
                        <label>Quyền hạn</label>
                        <div className="admin-permissions-container">
                            {PERMISSION_GROUPS.map((group, groupIndex) => (
                                <div key={groupIndex} className="admin-permission-group">
                                    <h4 className="admin-permission-group-title">{group.label}</h4>
                                    <div className="admin-permissions-checkboxes">
                                        {group.permissions.map((perm) => {
                                            const permissionKey = perm.key as keyof AdminRolePermissions;
                                            return (
                                                <label key={perm.key} className="admin-checkbox-label">
                                                    <input
                                                        type="checkbox"
                                                        checked={permissions[permissionKey] || false}
                                                        onChange={(e) => setPermissions({ ...permissions, [permissionKey]: e.target.checked })}
                                                        disabled={perm.key === 'viewDashboard'}
                                                    />
                                                    <span>{perm.label}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="admin-modal-actions">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Huỷ
                        </Button>
                        <Button type="submit">Lưu</Button>
                    </div>
                </form>
            </div>
        </div>
    );
}


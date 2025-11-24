import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import type { User, AdminRolePermissions } from '@/services/adminService';
import { PERMISSION_GROUPS, getAllPermissionKeys } from '@/utils/permissionGroups';
import { getInheritedPermissions, isPermissionInherited, getInheritedFromRole } from '@/utils/roleInheritance';

interface CreateRoleModalProps {
    users: User[];
    onClose: () => void;
    onSave: (data: { userId: string; role: 'super_admin' | 'admin' | 'moderator'; permissions: AdminRolePermissions }) => Promise<void>;
}

export function CreateRoleModal({ users, onClose, onSave }: CreateRoleModalProps) {
    const [selectedUserId, setSelectedUserId] = useState('');
    const [role, setRole] = useState<'super_admin' | 'admin' | 'moderator'>('admin');
    const [permissions, setPermissions] = useState<AdminRolePermissions>(getAllPermissionKeys());

    // Apply inheritance when role changes
    useEffect(() => {
        const inheritedPerms = getInheritedPermissions(role);
        setPermissions(prev => {
            const updated = { ...prev };
            // Set all inherited permissions to true
            inheritedPerms.forEach(perm => {
                updated[perm as keyof AdminRolePermissions] = true;
            });
            return updated;
        });
    }, [role]); // Only run when role changes

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
                        {role !== 'moderator' && (
                            <p className="admin-form-help" style={{ marginBottom: '12px', color: '#059669' }}>
                                <strong>Lưu ý:</strong> Quyền từ vai trò thấp hơn sẽ tự động được kế thừa và không thể bỏ chọn.
                            </p>
                        )}
                        <div className="admin-permissions-container">
                            {PERMISSION_GROUPS.map((group, groupIndex) => (
                                <div key={groupIndex} className="admin-permission-group">
                                    <h4 className="admin-permission-group-title">{group.label}</h4>
                                    <div className="admin-permissions-checkboxes">
                                        {group.permissions.map((perm) => {
                                            const permissionKey = perm.key as keyof AdminRolePermissions;
                                            const isInherited = isPermissionInherited(role, perm.key);
                                            const inheritedFrom = getInheritedFromRole(role, perm.key);
                                            const isChecked = permissions[permissionKey] || false;
                                            
                                            return (
                                                <label 
                                                    key={perm.key} 
                                                    className={`admin-checkbox-label ${isInherited ? 'inherited-permission' : ''}`}
                                                    title={isInherited ? `Kế thừa từ vai trò: ${inheritedFrom === 'moderator' ? 'Moderator' : 'Admin'}` : undefined}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={(e) => {
                                                            if (!isInherited) {
                                                                setPermissions({ ...permissions, [permissionKey]: e.target.checked });
                                                            }
                                                        }}
                                                        disabled={perm.key === 'viewDashboard' || isInherited}
                                                    />
                                                    <span>
                                                        {perm.label}
                                                        {isInherited && (
                                                            <span className="inherited-badge" title={`Kế thừa từ ${inheritedFrom === 'moderator' ? 'Moderator' : 'Admin'}`}>
                                                                (Kế thừa)
                                                            </span>
                                                        )}
                                                    </span>
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
                        <Button type="submit">Thêm</Button>
                    </div>
                </form>
            </div>
        </div>
    );
}


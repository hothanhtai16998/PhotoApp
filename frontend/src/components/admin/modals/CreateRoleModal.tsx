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
    onSave: (data: { 
        userId: string; 
        role: 'super_admin' | 'admin' | 'moderator'; 
        permissions: AdminRolePermissions;
        expiresAt?: string | null;
        active?: boolean;
        allowedIPs?: string[];
    }) => Promise<void>;
}

export function CreateRoleModal({ users, onClose, onSave }: CreateRoleModalProps) {
    const [selectedUserId, setSelectedUserId] = useState('');
    const [role, setRole] = useState<'super_admin' | 'admin' | 'moderator'>('admin');
    const [permissions, setPermissions] = useState<AdminRolePermissions>(getAllPermissionKeys());
    const [expiresAt, setExpiresAt] = useState<string>('');
    const [active, setActive] = useState<boolean>(true);
    const [allowedIPs, setAllowedIPs] = useState<string>('');

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
        
        // Parse allowedIPs from comma-separated string
        const parsedIPs = allowedIPs
            .split(',')
            .map(ip => ip.trim())
            .filter(ip => ip.length > 0);
        
        await onSave({ 
            userId: selectedUserId, 
            role, 
            permissions,
            expiresAt: expiresAt || null,
            active,
            allowedIPs: parsedIPs.length > 0 ? parsedIPs : undefined,
        });
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
                        <label>Thiết lập bảo mật (Tùy chọn)</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.875rem' }}>
                                    Ngày hết hạn
                                </label>
                                <Input
                                    type="datetime-local"
                                    value={expiresAt}
                                    onChange={(e) => setExpiresAt(e.target.value)}
                                    placeholder="Không có hạn"
                                />
                                <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '4px' }}>
                                    Để trống nếu không muốn đặt hạn
                                </p>
                            </div>
                            
                            <div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={active}
                                        onChange={(e) => setActive(e.target.checked)}
                                    />
                                    <span>Kích hoạt quyền (Bỏ chọn để tạm tắt)</span>
                                </label>
                            </div>
                            
                            <div>
                                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.875rem' }}>
                                    Giới hạn IP (Tùy chọn)
                                </label>
                                <Input
                                    type="text"
                                    value={allowedIPs}
                                    onChange={(e) => setAllowedIPs(e.target.value)}
                                    placeholder="192.168.1.100, 10.0.0.0/24 (phân cách bằng dấu phẩy)"
                                />
                                <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '4px' }}>
                                    Để trống để cho phép tất cả IP. Hỗ trợ IPv4, IPv6 và CIDR (ví dụ: 192.168.1.100, 10.0.0.0/24)
                                </p>
                            </div>
                        </div>
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


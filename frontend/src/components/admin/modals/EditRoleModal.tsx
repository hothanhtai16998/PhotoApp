import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { AdminRole, AdminRolePermissions } from '@/services/adminService';
import { PERMISSION_GROUPS, getAllPermissionKeys } from '@/utils/permissionGroups';
import { getInheritedPermissions, isPermissionInherited, getInheritedFromRole } from '@/utils/roleInheritance';

interface EditRoleModalProps {
    role: AdminRole;
    onClose: () => void;
    onSave: (userId: string, updates: { 
        role?: 'super_admin' | 'admin' | 'moderator'; 
        permissions?: AdminRolePermissions;
        expiresAt?: string | null;
        active?: boolean;
        allowedIPs?: string[];
    }) => Promise<void>;
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
    
    // Format expiresAt for datetime-local input (YYYY-MM-DDTHH:mm)
    const formatDateForInput = (dateString: string | null | undefined): string => {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        // Convert to local datetime string for input
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };
    
    const [expiresAt, setExpiresAt] = useState<string>(formatDateForInput(role.expiresAt));
    const [active, setActive] = useState<boolean>(role.active !== undefined ? role.active : true);
    const [allowedIPs, setAllowedIPs] = useState<string>((role.allowedIPs || []).join(', '));

    // Apply inheritance when role changes
    useEffect(() => {
        const inheritedPerms = getInheritedPermissions(selectedRole);
        setPermissions(prev => {
            const updated = { ...prev };
            // Set all inherited permissions to true
            inheritedPerms.forEach(perm => {
                updated[perm as keyof AdminRolePermissions] = true;
            });
            return updated;
        });
    }, [selectedRole]); // Only run when role changes

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Extract userId - it can be either a string or a User object
        const userId = typeof role.userId === 'string' ? role.userId : role.userId._id;
        
        // Parse allowedIPs from comma-separated string
        const parsedIPs = allowedIPs
            .split(',')
            .map(ip => ip.trim())
            .filter(ip => ip.length > 0);
        
        await onSave(userId, { 
            role: selectedRole, 
            permissions,
            expiresAt: expiresAt || null,
            active,
            allowedIPs: parsedIPs.length > 0 ? parsedIPs : [],
        });
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
                        <label>Thiết lập bảo mật</label>
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
                                    Giới hạn IP
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
                        {selectedRole !== 'moderator' && (
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
                                            const isInherited = isPermissionInherited(selectedRole, perm.key);
                                            const inheritedFrom = getInheritedFromRole(selectedRole, perm.key);
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
                        <Button type="submit">Lưu</Button>
                    </div>
                </form>
            </div>
        </div>
    );
}


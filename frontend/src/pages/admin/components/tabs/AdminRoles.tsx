import { Button } from '@/components/ui/button';
import { Edit2, Trash2 } from 'lucide-react';
import { CreateRoleModal, EditRoleModal } from '../modals';
import type { User, AdminRole, AdminRolePermissions } from '@/services/adminService';
import type { User as AuthUser } from '@/types/user';

interface AdminRolesProps {
    roles: AdminRole[];
    users: User[];
    currentUser: AuthUser | null;
    creatingRole: boolean;
    editingRole: AdminRole | null;
    onCreateClick: () => void;
    onEdit: (role: AdminRole) => void;
    onDelete: (userId: string, username: string) => void;
    onCloseCreate: () => void;
    onCloseEdit: () => void;
    onSaveCreate: (data: { 
        userId: string; 
        role: 'super_admin' | 'admin' | 'moderator'; 
        permissions: AdminRolePermissions;
        expiresAt?: string | null;
        active?: boolean;
        allowedIPs?: string[];
    }) => Promise<void>;
    onSaveEdit: (userId: string, updates: { 
        role?: 'super_admin' | 'admin' | 'moderator'; 
        permissions?: AdminRolePermissions;
        expiresAt?: string | null;
        active?: boolean;
        allowedIPs?: string[];
    }) => Promise<boolean>;
}

export function AdminRoles({
    roles,
    users,
    currentUser,
    creatingRole,
    editingRole,
    onCreateClick,
    onEdit,
    onDelete,
    onCloseCreate,
    onCloseEdit,
    onSaveCreate,
    onSaveEdit,
}: AdminRolesProps) {
    return (
        <div className="admin-roles">
            <div className="admin-header">
                <h1 className="admin-title">Quyền quản trị Admin</h1>
                <Button onClick={onCreateClick}>
                    + Thêm quyền Admin
                </Button>
            </div>

            <div className="admin-table">
                <table>
                    <thead>
                        <tr>
                            <th>Tên tài khoản</th>
                            <th>Vai trò</th>
                            <th>Trạng thái</th>
                            <th>Quyền hạn</th>
                            <th>Người cấp</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {roles.map((role) => {
                            const userId = typeof role.userId === 'string' ? role.userId : role.userId?._id;
                            const username = typeof role.userId === 'string' ? '' : role.userId?.username || '';
                            return (
                                <tr key={role._id}>
                                    <td>
                                        <div>
                                            <strong>{typeof role.userId === 'string' ? '' : (role.userId?.displayName || role.userId?.username)}</strong>
                                            <br />
                                            <small>{typeof role.userId === 'string' ? '' : role.userId?.email}</small>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`admin-role-badge ${role.role}`}>
                                            {role.role === 'super_admin' ? 'Super Admin' : role.role === 'admin' ? 'Admin' : 'Moderator'}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            {role.active === false && (
                                                <span className="admin-status-badge" style={{ background: '#fee2e2', color: '#991b1b' }}>
                                                    Tạm tắt
                                                </span>
                                            )}
                                            {role.expiresAt && new Date(role.expiresAt) < new Date() && (
                                                <span className="admin-status-badge" style={{ background: '#fef3c7', color: '#92400e' }}>
                                                    Đã hết hạn
                                                </span>
                                            )}
                                            {role.expiresAt && new Date(role.expiresAt) >= new Date() && (
                                                <span className="admin-status-badge" style={{ background: '#dbeafe', color: '#1e40af' }}>
                                                    Hết hạn: {new Date(role.expiresAt).toLocaleDateString('vi-VN')}
                                                </span>
                                            )}
                                            {role.allowedIPs && role.allowedIPs.length > 0 && (
                                                <span className="admin-status-badge" style={{ background: '#e0e7ff', color: '#3730a3' }}>
                                                    IP: {role.allowedIPs.length} giới hạn
                                                </span>
                                            )}
                                            {(!role.expiresAt && role.active !== false && (!role.allowedIPs || role.allowedIPs.length === 0)) && (
                                                <span className="admin-status-badge" style={{ background: '#d1fae5', color: '#065f46' }}>
                                                    Hoạt động
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="admin-permissions-list">
                                            {Object.entries(role.permissions || {}).map(([key, value]) =>
                                                value ? (
                                                    <span key={key} className="admin-permission-tag">
                                                        {key}
                                                    </span>
                                                ) : null
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        {role.grantedBy?.displayName || role.grantedBy?.username || 'System'}
                                    </td>
                                    <td>
                                        <div className="admin-actions">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => onEdit(role)}
                                            >
                                                <Edit2 size={16} />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => onDelete(userId || '', username)}
                                                disabled={userId === currentUser?._id}
                                            >
                                                <Trash2 size={16} />
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {roles.length === 0 && (
                <div className="admin-empty-state">
                    <p>Chưa có quyền admin. Vui lòng tạo mới</p>
                </div>
            )}

            {creatingRole && (
                <CreateRoleModal
                    users={users}
                    onClose={onCloseCreate}
                    onSave={onSaveCreate}
                />
            )}

            {editingRole && (
                <EditRoleModal
                    role={editingRole}
                    onClose={onCloseEdit}
                    onSave={onSaveEdit}
                />
            )}
        </div>
    );
}


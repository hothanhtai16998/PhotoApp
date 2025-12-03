import { Button } from '@/components/ui/button';
import { Edit2, Trash2 } from 'lucide-react';
import { CreateRoleModal, EditRoleModal } from '../modals';
import type { User, AdminRole, AdminRolePermissions } from '@/services/adminService';
import type { User as AuthUser } from '@/types/user';
import { t } from '@/i18n';

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
                <h1 className="admin-title">{t('admin.manageRoles')}</h1>
                <Button onClick={onCreateClick}>
                    {t('admin.addRole')}
                </Button>
            </div>

            <div className="admin-table">
                <table>
                    <thead>
                        <tr>
                            <th>{t('admin.username')}</th>
                            <th>{t('admin.role')}</th>
                            <th>{t('admin.status')}</th>
                            <th>{t('admin.permissionsLabel')}</th>
                            <th>{t('admin.grantedBy')}</th>
                            <th>{t('admin.actions')}</th>
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
                                            {role.role === 'super_admin' ? t('admin.superAdmin') : role.role === 'admin' ? t('admin.adminRoleLabel') : t('admin.moderator')}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            {role.active === false && (
                                                <span className="admin-status-badge" style={{ background: '#fee2e2', color: '#991b1b' }}>
                                                    {t('admin.suspended')}
                                                </span>
                                            )}
                                            {role.expiresAt && new Date(role.expiresAt) < new Date() && (
                                                <span className="admin-status-badge" style={{ background: '#fef3c7', color: '#92400e' }}>
                                                    {t('admin.expired')}
                                                </span>
                                            )}
                                            {role.expiresAt && new Date(role.expiresAt) >= new Date() && (
                                                <span className="admin-status-badge" style={{ background: '#dbeafe', color: '#1e40af' }}>
                                                    {t('admin.expiresAt', { date: new Date(role.expiresAt).toLocaleDateString() })}
                                                </span>
                                            )}
                                            {role.allowedIPs && role.allowedIPs.length > 0 && (
                                                <span className="admin-status-badge" style={{ background: '#e0e7ff', color: '#3730a3' }}>
                                                    {t('admin.ipLimited', { count: role.allowedIPs.length })}
                                                </span>
                                            )}
                                            {(!role.expiresAt && role.active !== false && (!role.allowedIPs || role.allowedIPs.length === 0)) && (
                                                <span className="admin-status-badge" style={{ background: '#d1fae5', color: '#065f46' }}>
                                                    {t('admin.activeStatus2')}
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
                                        {role.grantedBy?.displayName || role.grantedBy?.username || t('admin.system')}
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
                    <p>{t('admin.noRoles')}</p>
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


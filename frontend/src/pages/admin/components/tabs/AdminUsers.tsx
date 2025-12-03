import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Edit2, Trash2, Ban, Unlock, Users } from 'lucide-react';
import { UserEditModal } from '../modals';
import { adminService, type User } from '@/services/adminService';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/utils';
import type { User as AuthUser } from '@/types/user';
import { PermissionButton } from '../PermissionButton';
import { AdminBreadcrumbs } from '@/components/admin/AdminBreadcrumbs';
import { AdminEmptyState } from '@/components/admin/AdminEmptyState';
import { t } from '@/i18n';

interface AdminUsersProps {
    users: User[];
    pagination: { page: number; pages: number; total: number };
    search: string;
    currentUser: AuthUser | null;
    onSearchChange: (value: string) => void;
    onSearch: () => void;
    onPageChange: (page: number) => void;
    onEdit: (user: User) => void;
    onDelete: (userId: string, username: string) => void;
    editingUser: User | null;
    onCloseEdit: () => void;
    onSaveEdit: (userId: string, updates: Partial<User>) => Promise<void>;
    onUserUpdated?: () => void;
}

export function AdminUsers({
    users,
    pagination,
    search,
    currentUser,
    onSearchChange,
    onSearch,
    onPageChange,
    onEdit,
    onDelete,
    editingUser,
    onCloseEdit,
    onSaveEdit,
    onUserUpdated,
}: AdminUsersProps) {
    const handleBan = async (user: User) => {
        const reason = prompt(t('admin.banReason'));
        if (reason === null) return; // User cancelled
        
        try {
            await adminService.banUser(user._id, reason || undefined);
            toast.success(t('admin.banSuccess', { username: user.username }));
            onUserUpdated?.();
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, t('admin.banFailed')));
        }
    };

    const handleUnban = async (user: User) => {
        if (!confirm(t('admin.unbanConfirm', { username: user.username }))) return;
        
        try {
            await adminService.unbanUser(user._id);
            toast.success(t('admin.unbanSuccess', { username: user.username }));
            onUserUpdated?.();
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, t('admin.unbanFailed')));
        }
    };
    return (
        <div className="admin-users">
            <AdminBreadcrumbs items={[{ label: t('admin.manageUsers') }]} />
            <div className="admin-header">
                <h1 className="admin-title">{t('admin.manageUsers')}</h1>
                <div className="admin-search">
                    <Search size={20} />
                    <Input
                        placeholder={t('admin.searchUsername')}
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                onSearch();
                            }
                        }}
                    />
                    <Button onClick={onSearch}>{t('admin.search')}</Button>
                </div>
            </div>

            <div className="admin-table">
                <table>
                    <thead>
                        <tr>
                            <th>{t('admin.username')}</th>
                            <th>{t('admin.email')}</th>
                            <th>{t('admin.fullName')}</th>
                            <th>{t('admin.adminRole')}</th>
                            <th>{t('admin.status')}</th>
                            <th>{t('admin.photos')}</th>
                            <th>{t('admin.actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((u) => (
                            <tr key={u._id}>
                                <td>{u.username}</td>
                                <td>{u.email}</td>
                                <td>{u.displayName}</td>
                                <td>
                                    <div className="admin-status-display">
                                        {u.isSuperAdmin ? (
                                            <span className="admin-status-badge super-admin" title="Super Admin">
                                                Super Admin
                                            </span>
                                        ) : u.isAdmin ? (
                                            <span className="admin-status-badge admin" title="Admin">
                                                Admin
                                            </span>
                                        ) : (
                                            <span className="admin-status-badge none" title={t('admin.regularUser')}>
                                                {t('admin.no')}
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td>
                                    {u.isBanned ? (
                                        <span className="admin-status-badge banned" title={u.banReason || t('admin.banned')}>
                                            {t('admin.banned')}
                                        </span>
                                    ) : (
                                        <span className="admin-status-badge active">{t('admin.active')}</span>
                                    )}
                                </td>
                                <td>{u.imageCount || 0}</td>
                                <td>
                                    <div className="admin-actions">
                                        <PermissionButton
                                            permission="editUsers"
                                            action={t('admin.editUser')}
                                            variant="outline"
                                            size="sm"
                                            onClick={() => onEdit(u)}
                                            disabled={u.isSuperAdmin && !currentUser?.isSuperAdmin}
                                        >
                                            <Edit2 size={16} />
                                        </PermissionButton>
                                        {u.isBanned ? (
                                            <PermissionButton
                                                permission="unbanUsers"
                                                action={t('admin.unbanUser')}
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleUnban(u)}
                                                disabled={u._id === currentUser?._id || (u.isSuperAdmin && !currentUser?.isSuperAdmin)}
                                            >
                                                <Unlock size={16} />
                                            </PermissionButton>
                                        ) : (
                                            <PermissionButton
                                                permission="banUsers"
                                                action={t('admin.banUser')}
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleBan(u)}
                                                disabled={u._id === currentUser?._id || (u.isSuperAdmin && !currentUser?.isSuperAdmin)}
                                            >
                                                <Ban size={16} />
                                            </PermissionButton>
                                        )}
                                        <PermissionButton
                                            permission="deleteUsers"
                                            action={t('admin.deleteUser')}
                                            variant="outline"
                                            size="sm"
                                            onClick={() => onDelete(u._id, u.username)}
                                            disabled={u._id === currentUser?._id || (u.isSuperAdmin && !currentUser?.isSuperAdmin)}
                                        >
                                            <Trash2 size={16} />
                                        </PermissionButton>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {users.length === 0 && (
                <AdminEmptyState
                    icon={Users}
                    title={t('admin.noUsers')}
                    description={search ? t('admin.noUsersFound') : t('admin.noUsersDescription')}
                />
            )}

            {pagination.pages > 1 && (
                <div className="admin-pagination">
                    <Button
                        disabled={pagination.page === 1}
                        onClick={() => onPageChange(pagination.page - 1)}
                    >
                        {t('admin.previous')}
                    </Button>
                    <span>
                        {t('admin.pageOf', { current: pagination.page, total: pagination.pages })}
                    </span>
                    <Button
                        disabled={pagination.page === pagination.pages}
                        onClick={() => onPageChange(pagination.page + 1)}
                    >
                        {t('admin.next')}
                    </Button>
                </div>
            )}

            {editingUser && (
                <UserEditModal
                    user={editingUser}
                    onClose={onCloseEdit}
                    onSave={onSaveEdit}
                />
            )}
        </div>
    );
}


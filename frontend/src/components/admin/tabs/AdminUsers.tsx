import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Edit2, Trash2, Ban, Unlock } from 'lucide-react';
import { UserEditModal } from '../modals';
import { adminService } from '@/services/adminService';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/utils';
import type { User } from '@/services/adminService';
import type { User as AuthUser } from '@/types/user';
import { PermissionButton } from '../PermissionButton';

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
        const reason = prompt('Nhập lý do cấm (tùy chọn):');
        if (reason === null) return; // User cancelled
        
        try {
            await adminService.banUser(user._id, reason || undefined);
            toast.success(`Đã cấm người dùng ${user.username}`);
            onUserUpdated?.();
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Lỗi khi cấm người dùng'));
        }
    };

    const handleUnban = async (user: User) => {
        if (!confirm(`Bạn có chắc chắn muốn bỏ cấm người dùng ${user.username}?`)) return;
        
        try {
            await adminService.unbanUser(user._id);
            toast.success(`Đã bỏ cấm người dùng ${user.username}`);
            onUserUpdated?.();
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, 'Lỗi khi bỏ cấm người dùng'));
        }
    };
    return (
        <div className="admin-users">
            <div className="admin-header">
                <h1 className="admin-title">Quản lý người dùng</h1>
                <div className="admin-search">
                    <Search size={20} />
                    <Input
                        placeholder="Nhập tên tài khoản..."
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                onSearch();
                            }
                        }}
                    />
                    <Button onClick={onSearch}>Tìm</Button>
                </div>
            </div>

            <div className="admin-table">
                <table>
                    <thead>
                        <tr>
                            <th>Tên tài khoản</th>
                            <th>Email</th>
                            <th>Họ và tên</th>
                            <th>Quyền Admin</th>
                            <th>Trạng thái</th>
                            <th>Ảnh</th>
                            <th>Actions</th>
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
                                            <span className="admin-status-badge none" title="Regular User">
                                                No
                                            </span>
                                        )}
                                    </div>
                                </td>
                                <td>
                                    {u.isBanned ? (
                                        <span className="admin-status-badge banned" title={u.banReason || 'Bị cấm'}>
                                            Bị cấm
                                        </span>
                                    ) : (
                                        <span className="admin-status-badge active">Hoạt động</span>
                                    )}
                                </td>
                                <td>{u.imageCount || 0}</td>
                                <td>
                                    <div className="admin-actions">
                                        <PermissionButton
                                            permission="editUsers"
                                            action="Chỉnh sửa người dùng"
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
                                                action="Bỏ cấm người dùng"
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
                                                action="Cấm người dùng"
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
                                            action="Xóa người dùng"
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

            {pagination.pages > 1 && (
                <div className="admin-pagination">
                    <Button
                        disabled={pagination.page === 1}
                        onClick={() => onPageChange(pagination.page - 1)}
                    >
                        Quay lại
                    </Button>
                    <span>
                        Trang {pagination.page} trên {pagination.pages}
                    </span>
                    <Button
                        disabled={pagination.page === pagination.pages}
                        onClick={() => onPageChange(pagination.page + 1)}
                    >
                        Tiếp theo
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


import { usePermissions } from '@/hooks/usePermissions';
import { PermissionBadge, RoleBadge } from './PermissionBadge';
import { useUserStore } from '@/stores/useUserStore';

/**
 * Permission matrix view showing all permissions and user's access
 */
export function PermissionMatrix() {
    const { permissions, isSuperAdmin } = usePermissions();
    const user = useUserStore((state) => state.user);

    // All available permissions grouped by category
    const permissionGroups = [
        {
            label: 'Quản lý người dùng',
            permissions: ['viewUsers', 'editUsers', 'deleteUsers', 'banUsers', 'unbanUsers'] as const,
        },
        {
            label: 'Quản lý hình ảnh',
            permissions: ['viewImages', 'editImages', 'deleteImages', 'moderateImages'] as const,
        },
        {
            label: 'Quản lý danh mục',
            permissions: ['viewCategories', 'createCategories', 'editCategories', 'deleteCategories'] as const,
        },
        {
            label: 'Quản lý Admin',
            permissions: ['viewAdmins', 'createAdmins', 'editAdmins', 'deleteAdmins'] as const,
        },
        {
            label: 'Dashboard & Phân tích',
            permissions: ['viewDashboard', 'viewAnalytics'] as const,
        },
        {
            label: 'Bộ sưu tập',
            permissions: ['viewCollections', 'manageCollections'] as const,
        },
        {
            label: 'Yêu thích',
            permissions: ['manageFavorites'] as const,
        },
        {
            label: 'Kiểm duyệt nội dung',
            permissions: ['moderateContent'] as const,
        },
        {
            label: 'Hệ thống & Nhật ký',
            permissions: ['viewLogs', 'exportData', 'manageSettings'] as const,
        },
    ];

    const permissionLabels: Record<string, string> = {
        viewUsers: 'Xem người dùng',
        editUsers: 'Chỉnh sửa người dùng',
        deleteUsers: 'Xóa người dùng',
        banUsers: 'Cấm người dùng',
        unbanUsers: 'Bỏ cấm người dùng',
        viewImages: 'Xem hình ảnh',
        editImages: 'Chỉnh sửa hình ảnh',
        deleteImages: 'Xóa hình ảnh',
        moderateImages: 'Kiểm duyệt hình ảnh',
        viewCategories: 'Xem danh mục',
        createCategories: 'Tạo danh mục',
        editCategories: 'Chỉnh sửa danh mục',
        deleteCategories: 'Xóa danh mục',
        viewAdmins: 'Xem admin',
        createAdmins: 'Tạo admin',
        editAdmins: 'Chỉnh sửa admin',
        deleteAdmins: 'Xóa admin',
        viewDashboard: 'Xem bảng điều khiển',
        viewAnalytics: 'Xem phân tích',
        viewCollections: 'Xem bộ sưu tập',
        manageCollections: 'Quản lý bộ sưu tập',
        manageFavorites: 'Quản lý yêu thích',
        moderateContent: 'Kiểm duyệt nội dung',
        viewLogs: 'Xem nhật ký',
        exportData: 'Xuất dữ liệu',
        manageSettings: 'Quản lý cài đặt',
    };

    return (
        <div className="permission-matrix">
            <div className="permission-matrix-header">
                <h2>Ma trận quyền hạn</h2>
                <div className="permission-matrix-user-info">
                    <p>
                        <strong>Vai trò:</strong>{' '}
                        {user?.isSuperAdmin ? (
                            <RoleBadge role="super_admin" />
                        ) : user?.isAdmin ? (
                            <RoleBadge role="admin" />
                        ) : (
                            <span>Người dùng thường</span>
                        )}
                    </p>
                    {isSuperAdmin() && (
                        <p className="super-admin-note">
                            <strong>Lưu ý:</strong> Super Admin có tất cả quyền hạn
                        </p>
                    )}
                </div>
            </div>

            <div className="permission-matrix-grid">
                {permissionGroups.map((group) => (
                    <div key={group.label} className="permission-group">
                        <h3 className="permission-group-title">{group.label}</h3>
                        <div className="permission-list">
                            {group.permissions.map((permission) => {
                                const hasPerm = isSuperAdmin() || permissions?.[permission] === true;
                                return (
                                    <div
                                        key={permission}
                                        className={`permission-item ${hasPerm ? 'has-permission' : 'no-permission'}`}
                                    >
                                        <PermissionBadge permission={permission} />
                                        <span className="permission-label">
                                            {permissionLabels[permission] || permission}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            <div className="permission-matrix-legend">
                <div className="legend-item">
                    <span className="legend-badge has-permission"></span>
                    <span>Có quyền</span>
                </div>
                <div className="legend-item">
                    <span className="legend-badge no-permission"></span>
                    <span>Không có quyền</span>
                </div>
            </div>
        </div>
    );
}


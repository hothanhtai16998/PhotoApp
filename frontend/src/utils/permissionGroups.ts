import type { AdminRolePermissions } from '@/services/adminService';

/**
 * Permission groups for better organization in UI
 */
export const PERMISSION_GROUPS = [
    {
        label: 'Quản lý người dùng',
        permissions: [
            { key: 'viewUsers', label: 'Xem người dùng' },
            { key: 'editUsers', label: 'Chỉnh sửa người dùng' },
            { key: 'deleteUsers', label: 'Xóa người dùng' },
            { key: 'banUsers', label: 'Cấm người dùng' },
            { key: 'unbanUsers', label: 'Bỏ cấm người dùng' },
        ],
    },
    {
        label: 'Quản lý ảnh',
        permissions: [
            { key: 'viewImages', label: 'Xem ảnh' },
            { key: 'editImages', label: 'Chỉnh sửa ảnh' },
            { key: 'deleteImages', label: 'Xóa ảnh' },
            { key: 'moderateImages', label: 'Kiểm duyệt ảnh' },
        ],
    },
    {
        label: 'Quản lý danh mục',
        permissions: [
            { key: 'viewCategories', label: 'Xem danh mục' },
            { key: 'createCategories', label: 'Tạo danh mục' },
            { key: 'editCategories', label: 'Chỉnh sửa danh mục' },
            { key: 'deleteCategories', label: 'Xóa danh mục' },
        ],
    },
    {
        label: 'Quản lý admin',
        permissions: [
            { key: 'viewAdmins', label: 'Xem admin' },
            { key: 'createAdmins', label: 'Tạo admin' },
            { key: 'editAdmins', label: 'Chỉnh sửa admin' },
            { key: 'deleteAdmins', label: 'Xóa admin' },
        ],
    },
    {
        label: 'Bảng điều khiển & Phân tích',
        permissions: [
            { key: 'viewDashboard', label: 'Xem bảng điều khiển' },
            { key: 'viewAnalytics', label: 'Xem phân tích' },
        ],
    },
    {
        label: 'Bộ sưu tập',
        permissions: [
            { key: 'viewCollections', label: 'Xem bộ sưu tập' },
            { key: 'manageCollections', label: 'Quản lý bộ sưu tập' },
        ],
    },
    {
        label: 'Yêu thích',
        permissions: [
            { key: 'manageFavorites', label: 'Quản lý yêu thích' },
        ],
    },
    {
        label: 'Kiểm duyệt nội dung',
        permissions: [
            { key: 'moderateContent', label: 'Kiểm duyệt nội dung' },
        ],
    },
    {
        label: 'Hệ thống',
        permissions: [
            { key: 'viewLogs', label: 'Xem nhật ký' },
            { key: 'exportData', label: 'Xuất dữ liệu' },
            { key: 'manageSettings', label: 'Quản lý cài đặt' },
        ],
    },
] as const;

/**
 * Get all permission keys as a flat object for default state
 */
export const getAllPermissionKeys = (): AdminRolePermissions => {
    const allPermissions: AdminRolePermissions = {};
    
    PERMISSION_GROUPS.forEach(group => {
        group.permissions.forEach(perm => {
            allPermissions[perm.key as keyof AdminRolePermissions] = perm.key === 'viewDashboard' ? true : false;
        });
    });
    
    return allPermissions;
};


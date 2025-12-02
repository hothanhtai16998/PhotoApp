import { useState, useEffect, useRef, lazy, Suspense, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '@/stores/useUserStore';
import { usePermissions } from '@/hooks/usePermissions';
import type { AdminRolePermissions } from '@/services/adminService';
import type { User as AuthUser } from '@/types/user';
import Header from '@/components/Header';
import {
    LayoutDashboard,
    Users,
    Images,
    Shield,
    UserCog,
    Tag,
    BarChart2,
    FolderDot,
    Heart,
    ShieldCheck,
    FileText,
    Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import {
    useAdminDashboard,
    useAdminUsers,
    useAdminImages,
    useAdminCategories,
    useAdminRoles,
} from './hooks';
import './AdminPage.css';

// Lazy load admin tab components to reduce initial bundle size
const AdminDashboard = lazy(() => import('./components/tabs/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const AdminAnalytics = lazy(() => import('./components/tabs/AdminAnalytics').then(m => ({ default: m.AdminAnalytics })));
const AdminUsersTab = lazy(() => import('./components/tabs/AdminUsers').then(m => ({ default: m.AdminUsers })));
const AdminImagesTab = lazy(() => import('./components/tabs/AdminImages').then(m => ({ default: m.AdminImages })));
const AdminCategoriesTab = lazy(() => import('./components/tabs/AdminCategories').then(m => ({ default: m.AdminCategories })));
const AdminCollections = lazy(() => import('./components/tabs/AdminCollections').then(m => ({ default: m.AdminCollections })));
const AdminRolesTab = lazy(() => import('./components/tabs/AdminRoles').then(m => ({ default: m.AdminRoles })));
const AdminFavorites = lazy(() => import('./components/tabs/AdminFavorites').then(m => ({ default: m.AdminFavorites })));
const AdminModeration = lazy(() => import('./components/tabs/AdminModeration').then(m => ({ default: m.AdminModeration })));
const AdminLogs = lazy(() => import('./components/tabs/AdminLogs').then(m => ({ default: m.AdminLogs })));
const AdminSettings = lazy(() => import('./components/tabs/AdminSettings').then(m => ({ default: m.AdminSettings })));
const PermissionMatrix = lazy(() => import('./components/PermissionMatrix').then(m => ({ default: m.PermissionMatrix })));

// Loading fallback for admin tabs
const AdminTabLoader = () => (
    <div className="flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-64 w-full max-w-4xl" />
        </div>
    </div>
);

type TabType = 'dashboard' | 'analytics' | 'users' | 'images' | 'categories' | 'collections' | 'roles' | 'permissions' | 'favorites' | 'moderation' | 'logs' | 'settings';

function AdminPage() {
    const { user, fetchMe } = useUserStore();
    const navigate = useNavigate();
    const { hasPermission, isSuperAdmin } = usePermissions();
    const [activeTab, setActiveTab] = useState<TabType>('dashboard');

    // Use custom hooks for each domain
    const dashboard = useAdminDashboard();
    const usersAdmin = useAdminUsers();
    const imagesAdmin = useAdminImages();
    const categoriesAdmin = useAdminCategories();
    const rolesAdmin = useAdminRoles();

    // Check admin access on mount
    useEffect(() => {
        let isMounted = true;

        const checkAdmin = async () => {
            let currentUser = useUserStore.getState().user;

            if (!currentUser || (!currentUser.permissions && currentUser.isAdmin === undefined)) {
                try {
                    await fetchMe();
                    await new Promise(resolve => setTimeout(resolve, 100));
                    if (!isMounted) return;
                    currentUser = useUserStore.getState().user;
                } catch (error) {
                    if (!isMounted) return;
                    currentUser = useUserStore.getState().user;
                    if (!currentUser) {
                        console.error('AdminPage - Error fetching user:', error);
                        toast.error('Vui lòng đăng nhập lại.');
                        navigate('/signin');
                        return;
                    }
                }
            }

            if (!isMounted) return;

            if (!currentUser) {
                toast.error('Vui lòng đăng nhập lại.');
                navigate('/signin');
                return;
            }

            const hasAdminAccess = currentUser.isAdmin === true ||
                currentUser.isSuperAdmin === true ||
                (currentUser.permissions && Object.keys(currentUser.permissions).length > 0);

            if (!hasAdminAccess) {
                toast.error('Cần quyền Admin để truy cập trang này.');
                navigate('/');
                return;
            }
        };

        checkAdmin();

        return () => {
            isMounted = false;
        };
    }, [fetchMe, navigate]);

    // Store stable references to load functions to avoid infinite loops
    // This pattern is recommended when you want to call functions on mount/dependency change
    // without re-running when the function references change
    const loadFunctionsRef = useRef({
        loadDashboardStats: dashboard.loadDashboardStats,
        loadUsers: usersAdmin.loadUsers,
        loadImages: imagesAdmin.loadImages,
        loadCategories: categoriesAdmin.loadCategories,
        loadAdminRoles: rolesAdmin.loadAdminRoles,
        getUsersLength: () => usersAdmin.users.length,
    });

    // Keep refs in sync with latest functions
    useEffect(() => {
        loadFunctionsRef.current = {
            loadDashboardStats: dashboard.loadDashboardStats,
            loadUsers: usersAdmin.loadUsers,
            loadImages: imagesAdmin.loadImages,
            loadCategories: categoriesAdmin.loadCategories,
            loadAdminRoles: rolesAdmin.loadAdminRoles,
            getUsersLength: () => usersAdmin.users.length,
        };
    });

    // Load data when tab changes
    useEffect(() => {
        const fns = loadFunctionsRef.current;
        switch (activeTab) {
            case 'dashboard':
                fns.loadDashboardStats();
                break;
            case 'users':
                fns.loadUsers();
                break;
            case 'images':
                fns.loadImages();
                break;
            case 'categories':
                fns.loadCategories();
                break;
            case 'roles':
                fns.loadAdminRoles(fns.loadUsers, fns.getUsersLength());
                break;
        }
    }, [activeTab]);

    // Handler wrappers to refresh dashboard when needed
    const handleDeleteUser = useCallback(async (userId: string, username: string) => {
        const success = await usersAdmin.deleteUser(userId, username);
        if (success && activeTab === 'dashboard') {
            dashboard.loadDashboardStats();
        }
    }, [usersAdmin, activeTab, dashboard]);

    const handleUpdateUser = useCallback(async (userId: string, updates: Partial<AuthUser>) => {
        const success = await usersAdmin.updateUser(userId, updates);
        if (success && activeTab === 'dashboard') {
            dashboard.loadDashboardStats();
        }
    }, [usersAdmin, activeTab, dashboard]);

    const handleDeleteImage = useCallback(async (imageId: string, imageTitle: string) => {
        const success = await imagesAdmin.deleteImage(imageId, imageTitle);
        if (success && activeTab === 'dashboard') {
            dashboard.loadDashboardStats();
        }
    }, [imagesAdmin, activeTab, dashboard]);

    const handleCreateRole = useCallback(async (data: {
        userId: string;
        role: 'super_admin' | 'admin' | 'moderator';
        permissions: AdminRolePermissions;
        expiresAt?: string | null;
        active?: boolean;
        allowedIPs?: string[];
    }) => {
        await rolesAdmin.createRole(data, usersAdmin.loadUsers, usersAdmin.pagination.page);
    }, [rolesAdmin, usersAdmin]);

    const handleDeleteRole = useCallback(async (userId: string, username: string) => {
        await rolesAdmin.deleteRole(userId, username, usersAdmin.loadUsers, usersAdmin.pagination.page);
    }, [rolesAdmin, usersAdmin]);

    return (
        <>
            <Header />
            <div className="admin-page">
                <div className="admin-container">
                    {/* Sidebar */}
                    <div className="admin-sidebar">
                        <div className="admin-sidebar-header">
                            <Shield size={24} />
                            <h2>Trang quản lý</h2>
                        </div>
                        <nav className="admin-nav">
                            {(isSuperAdmin() || hasPermission('viewDashboard')) && (
                                <button
                                    className={`admin-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('dashboard')}
                                >
                                    <LayoutDashboard size={20} />
                                    Dashboard
                                </button>
                            )}
                            {(isSuperAdmin() || hasPermission('viewAnalytics')) && (
                                <button
                                    className={`admin-nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('analytics')}
                                >
                                    <BarChart2 size={20} />
                                    Phân tích
                                </button>
                            )}
                            {(isSuperAdmin() || hasPermission('viewUsers')) && (
                                <button
                                    className={`admin-nav-item ${activeTab === 'users' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('users')}
                                >
                                    <Users size={20} />
                                    Người dùng
                                </button>
                            )}
                            {(isSuperAdmin() || hasPermission('viewImages')) && (
                                <button
                                    className={`admin-nav-item ${activeTab === 'images' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('images')}
                                >
                                    <Images size={20} />
                                    Ảnh
                                </button>
                            )}
                            {(isSuperAdmin() || hasPermission('viewCategories')) && (
                                <button
                                    className={`admin-nav-item ${activeTab === 'categories' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('categories')}
                                >
                                    <Tag size={20} />
                                    Danh mục ảnh
                                </button>
                            )}
                            {(isSuperAdmin() || hasPermission('viewCollections')) && (
                                <button
                                    className={`admin-nav-item ${activeTab === 'collections' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('collections')}
                                >
                                    <FolderDot size={20} />
                                    Bộ sưu tập
                                </button>
                            )}
                            {isSuperAdmin() && (
                                <button
                                    className={`admin-nav-item ${activeTab === 'roles' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('roles')}
                                >
                                    <UserCog size={20} />
                                    Quyền quản trị
                                </button>
                            )}
                            {(isSuperAdmin() || hasPermission('viewAdmins')) && (
                                <button
                                    className={`admin-nav-item ${activeTab === 'permissions' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('permissions')}
                                >
                                    <ShieldCheck size={20} />
                                    Ma trận quyền hạn
                                </button>
                            )}
                            {(isSuperAdmin() || hasPermission('manageFavorites')) && (
                                <button
                                    className={`admin-nav-item ${activeTab === 'favorites' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('favorites')}
                                >
                                    <Heart size={20} />
                                    Quản lý yêu thích
                                </button>
                            )}
                            {(isSuperAdmin() || hasPermission('moderateContent')) && (
                                <button
                                    className={`admin-nav-item ${activeTab === 'moderation' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('moderation')}
                                >
                                    <ShieldCheck size={20} />
                                    Kiểm duyệt nội dung
                                </button>
                            )}
                            {(isSuperAdmin() || hasPermission('viewLogs')) && (
                                <button
                                    className={`admin-nav-item ${activeTab === 'logs' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('logs')}
                                >
                                    <FileText size={20} />
                                    Nhật ký hệ thống
                                </button>
                            )}
                            {(isSuperAdmin() || hasPermission('manageSettings')) && (
                                <button
                                    className={`admin-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('settings')}
                                >
                                    <Settings size={20} />
                                    Cài đặt
                                </button>
                            )}
                        </nav>
                    </div>

                    {/* Main Content */}
                    <div className="admin-content">
                        <Suspense fallback={<AdminTabLoader />}>
                            {activeTab === 'dashboard' && (
                                <AdminDashboard
                                    stats={dashboard.stats}
                                    loading={dashboard.loading}
                                />
                            )}
                            {activeTab === 'analytics' && (
                                <AdminAnalytics />
                            )}
                            {activeTab === 'users' && (
                                <AdminUsersTab
                                    users={usersAdmin.users}
                                    pagination={usersAdmin.pagination}
                                    search={usersAdmin.search}
                                    currentUser={user as AuthUser | null}
                                    onSearchChange={usersAdmin.setSearch}
                                    onSearch={() => usersAdmin.loadUsers(1)}
                                    onPageChange={usersAdmin.loadUsers}
                                    onEdit={usersAdmin.setEditingUser}
                                    onDelete={handleDeleteUser}
                                    editingUser={usersAdmin.editingUser}
                                    onCloseEdit={() => usersAdmin.setEditingUser(null)}
                                    onSaveEdit={handleUpdateUser}
                                />
                            )}
                            {activeTab === 'images' && (
                                <AdminImagesTab
                                    images={imagesAdmin.images}
                                    pagination={imagesAdmin.pagination}
                                    search={imagesAdmin.search}
                                    onSearchChange={imagesAdmin.setSearch}
                                    onSearch={() => imagesAdmin.loadImages(1)}
                                    onPageChange={imagesAdmin.loadImages}
                                    onDelete={handleDeleteImage}
                                    onImageUpdated={() => imagesAdmin.loadImages(imagesAdmin.pagination.page)}
                                />
                            )}
                            {activeTab === 'categories' && (
                                <AdminCategoriesTab
                                    categories={categoriesAdmin.categories}
                                    creatingCategory={categoriesAdmin.creatingCategory}
                                    editingCategory={categoriesAdmin.editingCategory}
                                    onCreateClick={() => categoriesAdmin.setCreatingCategory(true)}
                                    onEdit={categoriesAdmin.setEditingCategory}
                                    onDelete={categoriesAdmin.deleteCategory}
                                    onCloseCreate={() => categoriesAdmin.setCreatingCategory(false)}
                                    onCloseEdit={() => categoriesAdmin.setEditingCategory(null)}
                                    onSaveCreate={categoriesAdmin.createCategory}
                                    onSaveEdit={categoriesAdmin.updateCategory}
                                />
                            )}
                            {activeTab === 'collections' && (
                                <AdminCollections />
                            )}
                            {activeTab === 'roles' && isSuperAdmin() && (
                                <AdminRolesTab
                                    roles={rolesAdmin.adminRoles}
                                    users={usersAdmin.users}
                                    currentUser={user as AuthUser | null}
                                    creatingRole={rolesAdmin.creatingRole}
                                    editingRole={rolesAdmin.editingRole}
                                    onCreateClick={() => rolesAdmin.setCreatingRole(true)}
                                    onEdit={rolesAdmin.setEditingRole}
                                    onDelete={handleDeleteRole}
                                    onCloseCreate={() => rolesAdmin.setCreatingRole(false)}
                                    onCloseEdit={() => rolesAdmin.setEditingRole(null)}
                                    onSaveCreate={handleCreateRole}
                                    onSaveEdit={rolesAdmin.updateRole}
                                />
                            )}
                            {activeTab === 'permissions' && (isSuperAdmin() || hasPermission('viewAdmins')) && (
                                <PermissionMatrix />
                            )}
                            {activeTab === 'favorites' && (isSuperAdmin() || hasPermission('manageFavorites')) && (
                                <AdminFavorites />
                            )}
                            {activeTab === 'moderation' && (isSuperAdmin() || hasPermission('moderateContent')) && (
                                <AdminModeration />
                            )}
                            {activeTab === 'logs' && (isSuperAdmin() || hasPermission('viewLogs')) && (
                                <AdminLogs />
                            )}
                            {activeTab === 'settings' && (isSuperAdmin() || hasPermission('manageSettings')) && (
                                <AdminSettings />
                            )}
                        </Suspense>
                    </div>
                </div>
            </div>
        </>
    );
}

export default AdminPage;

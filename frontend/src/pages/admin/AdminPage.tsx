import { useState, useEffect, useRef, lazy, Suspense, useCallback } from 'react';
import { useUserStore } from '@/stores/useUserStore';
import { usePermissions } from '@/hooks/usePermissions';
import { useIsMobile } from '@/hooks/useIsMobile';
import { ChevronLeft, ChevronRight, Menu, X } from 'lucide-react';
import { QuickStatsWidget } from '@/components/admin/QuickStatsWidget';
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
    <div className="admin-tab-loader">
        <Skeleton className="h-6 w-48 mb-4" />
        <Skeleton className="h-12 w-full mb-6" />
        <div className="admin-loader-grid">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-64 w-full mt-6" />
    </div>
);

type TabType = 'dashboard' | 'analytics' | 'users' | 'images' | 'categories' | 'collections' | 'roles' | 'permissions' | 'favorites' | 'moderation' | 'logs' | 'settings';

function AdminPage() {
    // AdminRoute handles authentication and admin permission checks
    // So user is guaranteed to exist and have admin access here
    const { user } = useUserStore();
    const { hasPermission, isSuperAdmin } = usePermissions();
    const isMobile = useIsMobile();
    const [activeTab, setActiveTab] = useState<TabType>('dashboard');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Listen for tab change events from quick actions
    useEffect(() => {
        const handleTabChange = (e: Event) => {
            const customEvent = e as CustomEvent<TabType>;
            if (customEvent.detail) {
                setActiveTab(customEvent.detail);
            }
        };
        window.addEventListener('adminTabChange', handleTabChange as EventListener);
        return () => window.removeEventListener('adminTabChange', handleTabChange as EventListener);
    }, []);

    // Use custom hooks for each domain
    const dashboard = useAdminDashboard();
    const usersAdmin = useAdminUsers();
    const imagesAdmin = useAdminImages();
    const categoriesAdmin = useAdminCategories();
    const rolesAdmin = useAdminRoles();

    // AdminRoute already handles authentication and admin permission checks
    // No need for duplicate checks here

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
                    {/* Mobile Menu Button */}
                    {isMobile && (
                        <button
                            className="admin-mobile-menu-btn"
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            aria-label="Toggle menu"
                        >
                            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    )}

                    {/* Mobile Menu Overlay */}
                    {isMobile && mobileMenuOpen && (
                        <div 
                            className="admin-mobile-overlay"
                            onClick={() => setMobileMenuOpen(false)}
                        />
                    )}

                    {/* Sidebar */}
                    <div className={`admin-sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${isMobile ? (mobileMenuOpen ? 'mobile-open' : 'mobile-closed') : ''}`}>
                        <div className="admin-sidebar-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                                {!sidebarCollapsed && <Shield size={24} />}
                                {!sidebarCollapsed && <h2>Trang quản lý</h2>}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {!isMobile && (
                                    <button
                                        className="admin-sidebar-toggle"
                                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                                        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                                        title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                                    >
                                        {sidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                                    </button>
                                )}
                                {isMobile && (
                                    <button
                                        className="admin-sidebar-close"
                                        onClick={() => setMobileMenuOpen(false)}
                                        aria-label="Close menu"
                                    >
                                        <X size={20} />
                                    </button>
                                )}
                            </div>
                        </div>
                        <nav className="admin-nav">
                            {(isSuperAdmin() || hasPermission('viewDashboard')) && (
                                <button
                                    className={`admin-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                                    onClick={() => {
                                        setActiveTab('dashboard');
                                        if (isMobile) setMobileMenuOpen(false);
                                    }}
                                    title="Dashboard"
                                >
                                    <LayoutDashboard size={20} className="admin-nav-icon" />
                                    {!sidebarCollapsed && <span>Dashboard</span>}
                                </button>
                            )}
                            {(isSuperAdmin() || hasPermission('viewAnalytics')) && (
                                <button
                                    className={`admin-nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
                                    onClick={() => {
                                        setActiveTab('analytics');
                                        if (isMobile) setMobileMenuOpen(false);
                                    }}
                                    title="Phân tích"
                                >
                                    <BarChart2 size={20} className="admin-nav-icon" />
                                    {!sidebarCollapsed && <span>Phân tích</span>}
                                </button>
                            )}
                            {(isSuperAdmin() || hasPermission('viewUsers')) && (
                                <button
                                    className={`admin-nav-item ${activeTab === 'users' ? 'active' : ''}`}
                                    onClick={() => {
                                        setActiveTab('users');
                                        if (isMobile) setMobileMenuOpen(false);
                                    }}
                                    title="Người dùng"
                                >
                                    <Users size={20} className="admin-nav-icon" />
                                    {!sidebarCollapsed && <span>Người dùng</span>}
                                </button>
                            )}
                            {(isSuperAdmin() || hasPermission('viewImages')) && (
                                <button
                                    className={`admin-nav-item ${activeTab === 'images' ? 'active' : ''}`}
                                    onClick={() => {
                                        setActiveTab('images');
                                        if (isMobile) setMobileMenuOpen(false);
                                    }}
                                    title="Ảnh"
                                >
                                    <Images size={20} className="admin-nav-icon" />
                                    {!sidebarCollapsed && <span>Ảnh</span>}
                                </button>
                            )}
                            {(isSuperAdmin() || hasPermission('viewCategories')) && (
                                <button
                                    className={`admin-nav-item ${activeTab === 'categories' ? 'active' : ''}`}
                                    onClick={() => {
                                        setActiveTab('categories');
                                        if (isMobile) setMobileMenuOpen(false);
                                    }}
                                    title="Danh mục ảnh"
                                >
                                    <Tag size={20} className="admin-nav-icon" />
                                    {!sidebarCollapsed && <span>Danh mục ảnh</span>}
                                </button>
                            )}
                            {(isSuperAdmin() || hasPermission('viewCollections')) && (
                                <button
                                    className={`admin-nav-item ${activeTab === 'collections' ? 'active' : ''}`}
                                    onClick={() => {
                                        setActiveTab('collections');
                                        if (isMobile) setMobileMenuOpen(false);
                                    }}
                                    title="Bộ sưu tập"
                                >
                                    <FolderDot size={20} className="admin-nav-icon" />
                                    {!sidebarCollapsed && <span>Bộ sưu tập</span>}
                                </button>
                            )}
                            {isSuperAdmin() && (
                                <button
                                    className={`admin-nav-item ${activeTab === 'roles' ? 'active' : ''}`}
                                    onClick={() => {
                                        setActiveTab('roles');
                                        if (isMobile) setMobileMenuOpen(false);
                                    }}
                                    title="Quyền quản trị"
                                >
                                    <UserCog size={20} className="admin-nav-icon" />
                                    {!sidebarCollapsed && <span>Quyền quản trị</span>}
                                </button>
                            )}
                            {(isSuperAdmin() || hasPermission('viewAdmins')) && (
                                <button
                                    className={`admin-nav-item ${activeTab === 'permissions' ? 'active' : ''}`}
                                    onClick={() => {
                                        setActiveTab('permissions');
                                        if (isMobile) setMobileMenuOpen(false);
                                    }}
                                    title="Ma trận quyền hạn"
                                >
                                    <ShieldCheck size={20} className="admin-nav-icon" />
                                    {!sidebarCollapsed && <span>Ma trận quyền hạn</span>}
                                </button>
                            )}
                            {(isSuperAdmin() || hasPermission('manageFavorites')) && (
                                <button
                                    className={`admin-nav-item ${activeTab === 'favorites' ? 'active' : ''}`}
                                    onClick={() => {
                                        setActiveTab('favorites');
                                        if (isMobile) setMobileMenuOpen(false);
                                    }}
                                    title="Quản lý yêu thích"
                                >
                                    <Heart size={20} className="admin-nav-icon" />
                                    {!sidebarCollapsed && <span>Quản lý yêu thích</span>}
                                </button>
                            )}
                            {(isSuperAdmin() || hasPermission('moderateContent')) && (
                                <button
                                    className={`admin-nav-item ${activeTab === 'moderation' ? 'active' : ''}`}
                                    onClick={() => {
                                        setActiveTab('moderation');
                                        if (isMobile) setMobileMenuOpen(false);
                                    }}
                                    title="Kiểm duyệt nội dung"
                                >
                                    <ShieldCheck size={20} className="admin-nav-icon" />
                                    {!sidebarCollapsed && <span>Kiểm duyệt nội dung</span>}
                                </button>
                            )}
                            {(isSuperAdmin() || hasPermission('viewLogs')) && (
                                <button
                                    className={`admin-nav-item ${activeTab === 'logs' ? 'active' : ''}`}
                                    onClick={() => {
                                        setActiveTab('logs');
                                        if (isMobile) setMobileMenuOpen(false);
                                    }}
                                    title="Nhật ký hệ thống"
                                >
                                    <FileText size={20} className="admin-nav-icon" />
                                    {!sidebarCollapsed && <span>Nhật ký hệ thống</span>}
                                </button>
                            )}
                            {(isSuperAdmin() || hasPermission('manageSettings')) && (
                                <button
                                    className={`admin-nav-item ${activeTab === 'settings' ? 'active' : ''}`}
                                    onClick={() => {
                                        setActiveTab('settings');
                                        if (isMobile) setMobileMenuOpen(false);
                                    }}
                                    title="Cài đặt"
                                >
                                    <Settings size={20} className="admin-nav-icon" />
                                    {!sidebarCollapsed && <span>Cài đặt</span>}
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
            <QuickStatsWidget stats={dashboard.stats} loading={dashboard.loading} />
        </>
    );
}

export default AdminPage;

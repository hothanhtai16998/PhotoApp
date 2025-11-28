import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '@/stores/useUserStore';
import { useImageStore } from '@/stores/useImageStore';
import { usePermissions } from '@/hooks/usePermissions';
import { adminService, type DashboardStats, type User, type AdminImage, type AdminRole, type AdminRolePermissions } from '@/services/adminService';
import { categoryService, type Category } from '@/services/categoryService';
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
import './AdminPage.css';

// Lazy load admin tab components to reduce initial bundle size
const AdminDashboard = lazy(() => import('./components/tabs/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const AdminAnalytics = lazy(() => import('./components/tabs/AdminAnalytics').then(m => ({ default: m.AdminAnalytics })));
const AdminUsers = lazy(() => import('./components/tabs/AdminUsers').then(m => ({ default: m.AdminUsers })));
const AdminImages = lazy(() => import('./components/tabs/AdminImages').then(m => ({ default: m.AdminImages })));
const AdminCategories = lazy(() => import('./components/tabs/AdminCategories').then(m => ({ default: m.AdminCategories })));
const AdminCollections = lazy(() => import('./components/tabs/AdminCollections').then(m => ({ default: m.AdminCollections })));
const AdminRoles = lazy(() => import('./components/tabs/AdminRoles').then(m => ({ default: m.AdminRoles })));
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
    const { removeImage } = useImageStore();
    const navigate = useNavigate();
    const { hasPermission, isSuperAdmin } = usePermissions();
    const [activeTab, setActiveTab] = useState<TabType>('dashboard');
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<DashboardStats | null>(null);

    // Users state
    const [users, setUsers] = useState<User[]>([]);
    const [usersPagination, setUsersPagination] = useState({ page: 1, pages: 1, total: 0 });
    const [usersSearch, setUsersSearch] = useState('');
    const [editingUser, setEditingUser] = useState<User | null>(null);

    // Images state
    const [images, setImages] = useState<AdminImage[]>([]);
    const [imagesPagination, setImagesPagination] = useState({ page: 1, pages: 1, total: 0 });
    const [imagesSearch, setImagesSearch] = useState('');

    // Categories state
    const [categories, setCategories] = useState<Category[]>([]);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [creatingCategory, setCreatingCategory] = useState(false);

    // Roles state
    const [adminRoles, setAdminRoles] = useState<AdminRole[]>([]);
    const [editingRole, setEditingRole] = useState<AdminRole | null>(null);
    const [creatingRole, setCreatingRole] = useState(false);

    const loadDashboardStats = useCallback(async () => {
        // Check permission before API call
        if (!isSuperAdmin() && !hasPermission('viewDashboard')) {
            toast.error('Bạn không có quyền xem bảng điều khiển');
            return;
        }
        try {
            setLoading(true);
            const data = await adminService.getDashboardStats();
            setStats(data);
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Failed to load dashboard stats');
        } finally {
            setLoading(false);
        }
    }, [hasPermission, isSuperAdmin]);

    const loadUsers = useCallback(async (page = 1) => {
        // Check permission before API call
        if (!isSuperAdmin() && !hasPermission('viewUsers')) {
            toast.error('Bạn không có quyền xem người dùng');
            return;
        }
        try {
            setLoading(true);
            const data = await adminService.getAllUsers({
                page,
                limit: 20,
                search: usersSearch || undefined,
            });
            setUsers(data.users);
            setUsersPagination(data.pagination);
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Failed to load users');
        } finally {
            setLoading(false);
        }
    }, [usersSearch, hasPermission, isSuperAdmin]);

    const loadImages = useCallback(async (page = 1) => {
        // Check permission before API call
        if (!isSuperAdmin() && !hasPermission('viewImages')) {
            toast.error('Bạn không có quyền xem ảnh');
            return;
        }
        try {
            setLoading(true);
            const data = await adminService.getAllImages({
                page,
                limit: 20,
                search: imagesSearch || undefined,
            });
            setImages(data.images);
            setImagesPagination(data.pagination);
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Lỗi khi lấy ảnh');
        } finally {
            setLoading(false);
        }
    }, [imagesSearch, hasPermission, isSuperAdmin]);

    const loadCategories = useCallback(async () => {
        // Check permission before API call
        if (!isSuperAdmin() && !hasPermission('viewCategories')) {
            toast.error('Bạn không có quyền xem danh mục');
            return;
        }
        try {
            setLoading(true);
            const data = await categoryService.getAllCategoriesAdmin();
            setCategories(data);
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Lỗi khi lấy danh mục');
        } finally {
            setLoading(false);
        }
    }, [hasPermission, isSuperAdmin]);

    const loadAdminRoles = useCallback(async () => {
        if (!isSuperAdmin()) return;
        try {
            setLoading(true);
            const data = await adminService.getAllAdminRoles();
            setAdminRoles(data.adminRoles);
            // Also load users if not already loaded (for create role modal)
            if (users.length === 0) {
                await loadUsers(1);
            }
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Lỗi khi lấy danh sách quyền admin');
        } finally {
            setLoading(false);
        }
    }, [isSuperAdmin, users.length, loadUsers]);

    useEffect(() => {
        let isMounted = true;
        
        const checkAdmin = async () => {
            // Get current user from store first
            let currentUser = useUserStore.getState().user;
            
            // Only fetch if we don't have user data or don't have permissions
            if (!currentUser || (!currentUser.permissions && currentUser.isAdmin === undefined)) {
                try {
                    await fetchMe();
                    // Wait a bit for state to update
                    await new Promise(resolve => setTimeout(resolve, 100));
                    if (!isMounted) return;
                    currentUser = useUserStore.getState().user;
                } catch (error) {
                    // If fetchMe fails, check if we have a user from before
                    if (!isMounted) return;
                    currentUser = useUserStore.getState().user;
                    if (!currentUser) {
                        console.error('AdminPage - Error fetching user:', error);
                        toast.error('Vui lòng đăng nhập lại.');
                        navigate('/signin');
                        return;
                    }
                    // Continue with existing user data
                }
            }
            
            if (!isMounted) return;
            
            // If still no user, redirect to sign in
            if (!currentUser) {
                toast.error('Vui lòng đăng nhập lại.');
                navigate('/signin');
                return;
            }
            
            // Check if user has admin access (either isAdmin, isSuperAdmin, or has permissions)
            const hasAdminAccess = currentUser.isAdmin === true || 
                                  currentUser.isSuperAdmin === true || 
                                  (currentUser.permissions && Object.keys(currentUser.permissions).length > 0);
            
            if (!hasAdminAccess) {
                toast.error('Cần quyền Admin để truy cập trang này.');
                navigate('/');
                return;
            }
            
            // Dashboard stats will be loaded by the tab change useEffect
        };
        
        checkAdmin();
        
        return () => {
            isMounted = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Empty deps - only run once on mount

    useEffect(() => {
        if (activeTab === 'dashboard') {
            loadDashboardStats();
        } else if (activeTab === 'users') {
            loadUsers();
        } else if (activeTab === 'images') {
            loadImages();
        } else if (activeTab === 'categories') {
            loadCategories();
        } else if (activeTab === 'roles') {
            loadAdminRoles();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]); // Only depend on activeTab to avoid infinite loops

    const handleDeleteUser = async (userId: string, username: string) => {
        if (!confirm(`Bạn có muốn xoá người dùng "${username}" không? Sẽ xoá cả ảnh mà người này đã đăng.`)) {
            return;
        }

        try {
            await adminService.deleteUser(userId);
            toast.success('Xoá người dùng thành công');
            loadUsers(usersPagination.page);
            if (activeTab === 'dashboard') loadDashboardStats();
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Lỗi khi xoá người dùng');
        }
    };

    const handleDeleteImage = async (imageId: string, imageTitle: string) => {
        // Check permission before action
        if (!isSuperAdmin() && !hasPermission('deleteImages')) {
            toast.error('Bạn không có quyền xóa ảnh');
            return;
        }
        if (!confirm(`Bạn có muốn xoá ảnh "${imageTitle}" không?`)) {
            return;
        }

        try {
            await adminService.deleteImage(imageId);
            
            // Remove image from global image store immediately
            // This ensures the image disappears from homepage ImageGrid if user is on homepage
            removeImage(imageId);
            
            // Also trigger a refresh of the ImageGrid store to sync with backend
            // This ensures deleted image doesn't reappear when user navigates back to homepage
            // Wait a bit to ensure backend deletion is complete before refreshing
            setTimeout(() => {
                const imageStoreState = useImageStore.getState();
                if (imageStoreState.images.length > 0 || imageStoreState.pagination) {
                    // Homepage has been visited at some point, refresh to sync
                    // Use _refresh flag to bypass cache and ensure we get fresh data
                    imageStoreState.fetchImages({ 
                        page: imageStoreState.pagination?.page || 1,
                        search: imageStoreState.currentSearch,
                        category: imageStoreState.currentCategory,
                        _refresh: true 
                    });
                }
            }, 200);
            
            toast.success('Xoá ảnh thành công');
            loadImages(imagesPagination.page);
            if (activeTab === 'dashboard') loadDashboardStats();
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Lỗi khi xoá ảnh');
        }
    };

    const handleUpdateUser = async (userId: string, updates: Partial<User>) => {
        // Check permission before action
        if (!isSuperAdmin() && !hasPermission('editUsers')) {
            toast.error('Bạn không có quyền chỉnh sửa người dùng');
            return;
        }
        try {
            await adminService.updateUser(userId, updates);
            toast.success('Cập nhật thông tin người dùng thành công');
            setEditingUser(null);
            loadUsers(usersPagination.page);
            if (activeTab === 'dashboard') loadDashboardStats();
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Failed to update user');
        }
    };

    const handleCreateCategory = async (data: { name: string; description?: string }) => {
        // Check permission before action
        if (!isSuperAdmin() && !hasPermission('createCategories')) {
            toast.error('Bạn không có quyền tạo danh mục');
            return;
        }
        try {
            await categoryService.createCategory(data);
            toast.success('Tạo danh mục thành công');
            setCreatingCategory(false);
            loadCategories();
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Lỗi khi tạo danh mục');
        }
    };

    const handleUpdateCategory = async (categoryId: string, updates: { name?: string; description?: string; isActive?: boolean }) => {
        // Check permission before action
        if (!isSuperAdmin() && !hasPermission('editCategories')) {
            toast.error('Bạn không có quyền chỉnh sửa danh mục');
            return;
        }
        try {
            await categoryService.updateCategory(categoryId, updates);
            toast.success('Danh mục đã được cập nhật thành công');
            setEditingCategory(null);
            loadCategories();
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Lỗi khi cập nhật danh mục');
        }
    };

    const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
        // Check permission before action
        if (!isSuperAdmin() && !hasPermission('deleteCategories')) {
            toast.error('Bạn không có quyền xóa danh mục');
            return;
        }
        if (!confirm(`Bạn có muốn xoá danh mục "${categoryName}" không? Chỉ xoá được nếu không có ảnh nào thuộc loại danh mục này.`)) {
            return;
        }

        try {
            await categoryService.deleteCategory(categoryId);
            toast.success('Xoá danh mục thành công');
            loadCategories();
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Lỗi khi xoá danh mục');
        }
    };

    const handleCreateRole = async (data: { 
        userId: string; 
        role: 'super_admin' | 'admin' | 'moderator'; 
        permissions: AdminRolePermissions;
        expiresAt?: string | null;
        active?: boolean;
        allowedIPs?: string[];
    }) => {
        try {
            await adminService.createAdminRole(data);
            toast.success('Quyền admin đã được tạo thành công');
            setCreatingRole(false);
            loadAdminRoles();
            loadUsers(usersPagination.page);
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Lỗi khi tạo quyền admin');
        }
    };

    const handleUpdateRole = async (userId: string, updates: { 
        role?: 'super_admin' | 'admin' | 'moderator'; 
        permissions?: AdminRolePermissions;
        expiresAt?: string | null;
        active?: boolean;
        allowedIPs?: string[];
    }) => {
        try {
            await adminService.updateAdminRole(userId, updates);
            toast.success('Quyền admin đã được cập nhật thành công');
            setEditingRole(null);
            loadAdminRoles();
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Lỗi khi cập nhật quyền admin');
        }
    };

    const handleDeleteRole = async (userId: string, username: string) => {
        if (!confirm(`Bạn có muốn xoá quyền ad của tài khoản "${username}" không?`)) {
            return;
        }

        try {
            await adminService.deleteAdminRole(userId);
            toast.success('Quyền admin đã được xoá thành công');
            loadAdminRoles();
            loadUsers(usersPagination.page);
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Lỗi khi xoá quyền admin');
        }
    };

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
                                <AdminDashboard stats={stats} loading={loading} />
                            )}
                            {activeTab === 'analytics' && (
                                <AdminAnalytics />
                            )}
                            {activeTab === 'users' && (
                                <AdminUsers
                                    users={users}
                                    pagination={usersPagination}
                                    search={usersSearch}
                                    currentUser={user as AuthUser | null}
                                    onSearchChange={setUsersSearch}
                                    onSearch={() => loadUsers(1)}
                                    onPageChange={loadUsers}
                                    onEdit={setEditingUser}
                                    onDelete={handleDeleteUser}
                                    editingUser={editingUser}
                                    onCloseEdit={() => setEditingUser(null)}
                                    onSaveEdit={handleUpdateUser}
                                />
                            )}
                            {activeTab === 'images' && (
                        <AdminImages
                            images={images}
                            pagination={imagesPagination}
                            search={imagesSearch}
                            onSearchChange={setImagesSearch}
                            onSearch={() => loadImages(1)}
                            onPageChange={loadImages}
                            onDelete={handleDeleteImage}
                            onImageUpdated={() => loadImages(imagesPagination.page)}
                        />
                            )}
                            {activeTab === 'categories' && (
                                <AdminCategories
                                    categories={categories}
                                    creatingCategory={creatingCategory}
                                    editingCategory={editingCategory}
                                    onCreateClick={() => setCreatingCategory(true)}
                                    onEdit={setEditingCategory}
                                    onDelete={handleDeleteCategory}
                                    onCloseCreate={() => setCreatingCategory(false)}
                                    onCloseEdit={() => setEditingCategory(null)}
                                    onSaveCreate={handleCreateCategory}
                                    onSaveEdit={handleUpdateCategory}
                                />
                            )}
                            {activeTab === 'collections' && (
                                <AdminCollections />
                            )}
                            {activeTab === 'roles' && isSuperAdmin() && (
                                <AdminRoles
                                    roles={adminRoles}
                                    users={users}
                                    currentUser={user as AuthUser | null}
                                    creatingRole={creatingRole}
                                    editingRole={editingRole}
                                    onCreateClick={() => setCreatingRole(true)}
                                    onEdit={(role) => setEditingRole(role)}
                                    onDelete={handleDeleteRole}
                                    onCloseCreate={() => setCreatingRole(false)}
                                    onCloseEdit={() => setEditingRole(null)}
                                    onSaveCreate={handleCreateRole}
                                    onSaveEdit={handleUpdateRole}
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

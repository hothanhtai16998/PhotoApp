import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
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
    Tag
} from 'lucide-react';
import { toast } from 'sonner';
import {
    AdminDashboard,
    AdminUsers,
    AdminImages,
    AdminCategories,
    AdminRoles,
} from '@/components/admin/tabs';
import './AdminPage.css';

type TabType = 'dashboard' | 'users' | 'images' | 'categories' | 'roles';

function AdminPage() {
    const { user, fetchMe } = useAuthStore();
    const navigate = useNavigate();
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

    useEffect(() => {
        const checkAdmin = async () => {
            try {
                await fetchMe();
                const currentUser = useAuthStore.getState().user;
                if (!currentUser?.isAdmin && !currentUser?.isSuperAdmin) {
                    toast.error('Cần quyền Admin để truy cập trang này.');
                    navigate('/');
                    return;
                }
                loadDashboardStats();
            } catch {
                navigate('/signin');
            }
        };
        checkAdmin();
    }, [fetchMe, navigate]);

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
    }, [activeTab, loadAdminRoles, loadImages, loadUsers]);

    const loadDashboardStats = async () => {
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
    };

    const loadUsers = useCallback(async (page = 1) => {
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
    }, [usersSearch]);

    const loadImages = useCallback(async (page = 1) => {
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
    }, [imagesSearch]);

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
        if (!confirm(`Bán có muốn xoá ảnh "${imageTitle}" không?`)) {
            return;
        }

        try {
            await adminService.deleteImage(imageId);
            toast.success('Xoá ảnh thành công');
            loadImages(imagesPagination.page);
            if (activeTab === 'dashboard') loadDashboardStats();
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Lỗi khi xoá ảnh');
        }
    };

    const handleUpdateUser = async (userId: string, updates: Partial<User>) => {
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

    const loadCategories = async () => {
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
    };

    const handleCreateCategory = async (data: { name: string; description?: string }) => {
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

    const loadAdminRoles = useCallback(async () => {
        if (!user?.isSuperAdmin) return;
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
    }, [user?.isSuperAdmin, users.length, loadUsers]);

    const handleCreateRole = async (data: { userId: string; role: 'super_admin' | 'admin' | 'moderator'; permissions: AdminRolePermissions }) => {
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

    const handleUpdateRole = async (userId: string, updates: { role?: 'super_admin' | 'admin' | 'moderator'; permissions?: AdminRolePermissions }) => {
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

    if (!user?.isAdmin && !user?.isSuperAdmin) {
        return null;
    }

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
                            <button
                                className={`admin-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                                onClick={() => setActiveTab('dashboard')}
                            >
                                <LayoutDashboard size={20} />
                                Dashboard
                            </button>
                            <button
                                className={`admin-nav-item ${activeTab === 'users' ? 'active' : ''}`}
                                onClick={() => setActiveTab('users')}
                            >
                                <Users size={20} />
                                Người dùng
                            </button>
                            <button
                                className={`admin-nav-item ${activeTab === 'images' ? 'active' : ''}`}
                                onClick={() => setActiveTab('images')}
                            >
                                <Images size={20} />
                                Ảnh
                            </button>
                            <button
                                className={`admin-nav-item ${activeTab === 'categories' ? 'active' : ''}`}
                                onClick={() => setActiveTab('categories')}
                            >
                                <Tag size={20} />
                                Danh mục ảnh
                            </button>
                            {user?.isSuperAdmin && (
                                <button
                                    className={`admin-nav-item ${activeTab === 'roles' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('roles')}
                                >
                                    <UserCog size={20} />
                                    Quyền quản trị
                                </button>
                            )}
                        </nav>
                    </div>

                    {/* Main Content */}
                    <div className="admin-content">
                        {activeTab === 'dashboard' && (
                            <AdminDashboard stats={stats} loading={loading} />
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
                        {activeTab === 'roles' && user?.isSuperAdmin && (
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
                    </div>
                </div>
            </div>
        </>
    );
}

export default AdminPage;

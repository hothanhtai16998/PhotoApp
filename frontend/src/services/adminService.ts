import api from '@/lib/axios';

export interface DashboardStats {
    stats: {
        totalUsers: number;
        totalImages: number;
        categoryStats: Array<{ _id: string; count: number }>;
    };
    recentUsers: User[];
    recentImages: AdminImage[];
}

export interface User {
    _id: string;
    username: string;
    email: string;
    displayName: string;
    bio?: string;
    isAdmin: boolean;
    isSuperAdmin?: boolean;
    isBanned?: boolean;
    bannedAt?: string;
    banReason?: string;
    createdAt: string;
    imageCount?: number;
}

export interface AdminImage {
    _id: string;
    imageTitle: string;
    imageUrl: string;
    imageCategory: string | { _id: string; name: string; description?: string } | null;
    uploadedBy: {
        _id: string;
        username: string;
        displayName: string;
        email: string;
    };
    isModerated?: boolean;
    moderationStatus?: 'pending' | 'approved' | 'rejected' | 'flagged';
    moderatedAt?: string;
    moderationNotes?: string;
    createdAt: string;
}

export interface AdminRolePermissions {
    // User Management - Granular permissions
    viewUsers?: boolean;
    editUsers?: boolean;
    deleteUsers?: boolean;
    banUsers?: boolean;
    unbanUsers?: boolean;
    
    // Image Management - Granular permissions
    viewImages?: boolean;
    editImages?: boolean;
    deleteImages?: boolean;
    moderateImages?: boolean;
    
    // Category Management - Granular permissions
    viewCategories?: boolean;
    createCategories?: boolean;
    editCategories?: boolean;
    deleteCategories?: boolean;
    
    // Admin Management - Granular permissions
    viewAdmins?: boolean;
    createAdmins?: boolean;
    editAdmins?: boolean;
    deleteAdmins?: boolean;
    
    // Dashboard & Analytics
    viewDashboard?: boolean;
    viewAnalytics?: boolean;
    
    // Collections
    viewCollections?: boolean;
    manageCollections?: boolean;
    
    // Legacy permissions (for backward compatibility)
    manageUsers?: boolean;
    manageImages?: boolean;
    manageCategories?: boolean;
    manageAdmins?: boolean;
}

export interface AdminRole {
    _id: string;
    userId: User | string;
    role: 'super_admin' | 'admin' | 'moderator';
    permissions: AdminRolePermissions;
    grantedBy?: User;
    createdAt?: string;
    updatedAt?: string;
}

export const adminService = {
    getDashboardStats: async (): Promise<DashboardStats> => {
        const res = await api.get('/admin/dashboard/stats', {
            withCredentials: true,
        });
        return res.data;
    },

    getAllUsers: async (params?: {
        page?: number;
        limit?: number;
        search?: string;
    }): Promise<{ users: User[]; pagination: { page: number; pages: number; total: number; limit: number } }> => {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        if (params?.search) queryParams.append('search', params.search);

        const queryString = queryParams.toString();
        const url = queryString ? `/admin/users?${queryString}` : '/admin/users';

        const res = await api.get(url, {
            withCredentials: true,
        });
        return res.data;
    },

    getUserById: async (userId: string): Promise<{ user: User }> => {
        const res = await api.get(`/admin/users/${userId}`, {
            withCredentials: true,
        });
        return res.data;
    },

    updateUser: async (
        userId: string,
        data: {
            displayName?: string;
            email?: string;
            bio?: string;
        }
    ): Promise<{ user: User }> => {
        const res = await api.put(`/admin/users/${userId}`, data, {
            withCredentials: true,
        });
        return res.data;
    },

    deleteUser: async (userId: string): Promise<void> => {
        await api.delete(`/admin/users/${userId}`, {
            withCredentials: true,
        });
    },

    banUser: async (userId: string, reason?: string): Promise<{ user: User }> => {
        const res = await api.post(`/admin/users/${userId}/ban`, { reason }, {
            withCredentials: true,
        });
        return res.data;
    },

    unbanUser: async (userId: string): Promise<{ user: User }> => {
        const res = await api.post(`/admin/users/${userId}/unban`, {}, {
            withCredentials: true,
        });
        return res.data;
    },

    getAllImages: async (params?: {
        page?: number;
        limit?: number;
        search?: string;
        category?: string;
        userId?: string;
    }): Promise<{ images: AdminImage[]; pagination: { page: number; pages: number; total: number; limit: number } }> => {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        if (params?.search) queryParams.append('search', params.search);
        if (params?.category) queryParams.append('category', params.category);
        if (params?.userId) queryParams.append('userId', params.userId);

        const queryString = queryParams.toString();
        const url = queryString ? `/admin/images?${queryString}` : '/admin/images';

        const res = await api.get(url, {
            withCredentials: true,
        });
        return res.data;
    },

    updateImage: async (imageId: string, updates: {
        location?: string;
        coordinates?: { latitude: number; longitude: number } | null;
        imageTitle?: string;
        cameraModel?: string;
    }): Promise<{ image: AdminImage }> => {
        const res = await api.put(`/admin/images/${imageId}`, updates, {
            withCredentials: true,
        });
        return res.data;
    },

    deleteImage: async (imageId: string): Promise<void> => {
        await api.delete(`/admin/images/${imageId}`, {
            withCredentials: true,
        });
    },

    moderateImage: async (imageId: string, status: 'approved' | 'rejected' | 'flagged', notes?: string): Promise<{ image: AdminImage }> => {
        const res = await api.post(`/admin/images/${imageId}/moderate`, { status, notes }, {
            withCredentials: true,
        });
        return res.data;
    },

    // Admin Role Management
    getAllAdminRoles: async (): Promise<{ adminRoles: AdminRole[] }> => {
        const res = await api.get('/admin/roles', {
            withCredentials: true,
        });
        return res.data;
    },

    getAdminRole: async (userId: string): Promise<{ adminRole: AdminRole }> => {
        const res = await api.get(`/admin/roles/${userId}`, {
            withCredentials: true,
        });
        return res.data;
    },

    createAdminRole: async (data: {
        userId: string;
        role?: 'super_admin' | 'admin' | 'moderator';
        permissions?: AdminRolePermissions;
    }): Promise<{ adminRole: AdminRole }> => {
        const res = await api.post('/admin/roles', data, {
            withCredentials: true,
        });
        return res.data;
    },

    updateAdminRole: async (
        userId: string,
        data: {
            role?: 'super_admin' | 'admin' | 'moderator';
            permissions?: AdminRolePermissions;
        }
    ): Promise<{ adminRole: AdminRole }> => {
        const res = await api.put(`/admin/roles/${userId}`, data, {
            withCredentials: true,
        });
        return res.data;
    },

    deleteAdminRole: async (userId: string): Promise<void> => {
        await api.delete(`/admin/roles/${userId}`, {
            withCredentials: true,
        });
    },

    // Analytics
    getAnalytics: async (days?: number): Promise<any> => {
        const queryParams = new URLSearchParams();
        if (days) queryParams.append('days', days.toString());
        const queryString = queryParams.toString();
        const url = queryString ? `/admin/analytics?${queryString}` : '/admin/analytics';
        const res = await api.get(url, {
            withCredentials: true,
        });
        return res.data;
    },

    getRealtimeAnalytics: async (): Promise<{
        usersOnline: number;
        viewsPerSecond: Array<{ second: number; count: number }>;
        mostActivePages: Array<{ path: string; userCount: number }>;
    }> => {
        const res = await api.get('/admin/analytics/realtime', {
            withCredentials: true,
        });
        return res.data;
    },

    trackPageView: async (path: string): Promise<void> => {
        await api.post('/admin/analytics/track', { path }, {
            withCredentials: true,
        });
    },

    // Collections
    getAllCollections: async (params?: {
        page?: number;
        limit?: number;
        search?: string;
    }): Promise<{ collections: any[]; pagination: { page: number; pages: number; total: number; limit: number } }> => {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        if (params?.search) queryParams.append('search', params.search);
        const queryString = queryParams.toString();
        const url = queryString ? `/admin/collections?${queryString}` : '/admin/collections';
        const res = await api.get(url, {
            withCredentials: true,
        });
        return res.data;
    },

    updateCollection: async (collectionId: string, data: {
        name?: string;
        description?: string;
        isPublic?: boolean;
    }): Promise<{ collection: any }> => {
        const res = await api.put(`/admin/collections/${collectionId}`, data, {
            withCredentials: true,
        });
        return res.data;
    },

    deleteCollection: async (collectionId: string): Promise<void> => {
        await api.delete(`/admin/collections/${collectionId}`, {
            withCredentials: true,
        });
    },
};


import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { useUserStore } from '@/stores/useUserStore';
import { useEffect } from 'react';

export default function AdminRoute() {
    const { isInitializing } = useAuthStore();
    const { user, fetchMe } = useUserStore();

    useEffect(() => {
        if (!user && !isInitializing) {
            fetchMe();
        }
    }, [user, isInitializing, fetchMe]);

    if (isInitializing) {
        return <div>Đang tải...</div>;
    }

    if (!user) {
        return <Navigate to="/signin" replace />;
    }

    // Check if user has admin access (either isAdmin, isSuperAdmin, or has permissions)
    const hasAdminAccess = user.isAdmin === true ||
        user.isSuperAdmin === true ||
        (user.permissions && Object.keys(user.permissions).length > 0);

    if (!hasAdminAccess) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}


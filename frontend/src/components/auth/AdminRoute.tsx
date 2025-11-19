import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { useEffect } from 'react';

export default function AdminRoute() {
    const { user, fetchMe, isInitializing } = useAuthStore();

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

    if (!user.isAdmin && !user.isSuperAdmin) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}


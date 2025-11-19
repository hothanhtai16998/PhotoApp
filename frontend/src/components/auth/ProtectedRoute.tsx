import { Navigate, Outlet } from "react-router";
import { useAuthStore } from "@/stores/useAuthStore"

const ProtectedRoute = () => {
    const { accessToken, loading } = useAuthStore();

    // We can show a loading state while the store is initializing
    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                Đang tải...
            </div>
        );
    }

    // If not loading and there's no token, redirect to sign-in
    if (!accessToken) {
        return (
            <Navigate
                to="/signin"
                replace
            />
        );
    }

    // If the token exists, show the protected content
    return <Outlet />;
};

export default ProtectedRoute;
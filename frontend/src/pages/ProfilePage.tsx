import Header from "@/components/Header";
import { useAuthStore } from "@/stores/useAuthStore";


const ProfilePage = () => {
    const user = useAuthStore(s => s.user);

    return (
        <>
            <Header />
            <h1>Trang cá nhân</h1>
            <p>{user?.avatarUrl}</p>
            <p>Tên người dùng: {user?.displayName}</p>
            <p>Email: {user?.email}</p>
            <p>Số điện thoại: {user?.phone}</p>
            <p>Thông tin thêm: {user?.bio}</p>
            <button >Cập nhật thông tin</button>
        </>
    )
}

export default ProfilePage;
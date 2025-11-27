import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserStore } from "@/stores/useUserStore";
import Header from "@/components/Header";
import { useProfileEdit } from "./profile/hooks/useProfileEdit";
import { ProfileForm } from "./profile/components/ProfileForm";
import { PasswordForm } from "./profile/components/PasswordForm";
import "./EditProfilePage.css";

function EditProfilePage() {
    const { user } = useUserStore();
    const navigate = useNavigate();
    const [activeSection, setActiveSection] = useState('edit-profile');

    const {
        isSubmitting,
        passwordError,
        passwordSuccess,
        avatarPreview,
        isUploadingAvatar,
        fileInputRef,
        register,
        handleSubmit,
        setValue,
        watch,
        bioCharCount,
        registerPassword,
        handlePasswordSubmit,
        passwordErrors,
        handleAvatarChange,
        handleAvatarButtonClick,
        onSubmit,
        onPasswordSubmit,
    } = useProfileEdit();

    useEffect(() => {
        if (!user) {
            navigate('/signin');
            return;
        }
        // Set form values when user data is available
        if (user) {
            const nameParts = user.displayName?.split(' ') || [];
            setValue('firstName', nameParts[0] || '');
            setValue('lastName', nameParts.slice(1).join(' ') || '');
            setValue('email', user.email || '');
            setValue('username', user.username || '');
            setValue('bio', user.bio || '');
            setValue('location', user.location || '');
            setValue('phone', user.phone || '');
            setValue('personalSite', user.website || 'https://');
            setValue('instagram', user.instagram || '');
            setValue('twitter', user.twitter || '');
        }
    }, [user, navigate, setValue]);

    if (!user) {
        return null;
    }

    // Filter menu items based on user type
    const allMenuItems = [
        { id: 'edit-profile', label: 'Chỉnh sửa thông tin' },
        // { id: 'hiring', label: 'Hiring' },
        { id: 'download-history', label: 'Lịch sử tải xuống' },
        // { id: 'email-settings', label: 'Email settings' },
        { id: 'change-password', label: 'Đổi mật khẩu' },
        // { id: 'applications', label: 'Applications' },
        // { id: 'close-account', label: 'Close account' },
    ];

    // Hide "Change password" for OAuth users
    const menuItems = allMenuItems.filter(item =>
        user?.isOAuthUser ? item.id !== 'change-password' : true
    );

    return (
        <>
            <Header />
            <main className="profile-settings-page">
                <div className="profile-settings-container">
                    {/* Left Sidebar */}
                    <aside className="profile-sidebar">
                        <h2 className="sidebar-title">Cài đặt tài khoản</h2>
                        <nav className="sidebar-nav">
                            {menuItems.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveSection(item.id)}
                                    className={`sidebar-link ${activeSection === item.id ? 'active' : ''}`}
                                >
                                    {item.label}
                                </button>
                            ))}
                        </nav>
                    </aside>

                    {/* Right Main Content */}
                    <div className="profile-main-content">
                        {activeSection === 'edit-profile' && (
                            <ProfileForm
                                user={user}
                                avatarPreview={avatarPreview}
                                isUploadingAvatar={isUploadingAvatar}
                                fileInputRef={fileInputRef}
                                bioCharCount={bioCharCount}
                                register={register}
                                handleSubmit={handleSubmit}
                                watch={watch}
                                handleAvatarChange={handleAvatarChange}
                                handleAvatarButtonClick={handleAvatarButtonClick}
                                onSubmit={onSubmit}
                                isSubmitting={isSubmitting}
                            />
                        )}

                        {activeSection === 'change-password' && !user?.isOAuthUser && (
                            <PasswordForm
                                register={registerPassword}
                                handleSubmit={handlePasswordSubmit}
                                errors={passwordErrors}
                                onSubmit={onPasswordSubmit}
                                isSubmitting={isSubmitting}
                                passwordError={passwordError}
                                passwordSuccess={passwordSuccess}
                            />
                        )}

                        {activeSection !== 'edit-profile' && activeSection !== 'change-password' && (
                            <div className="coming-soon">
                                <h2>{menuItems.find(item => item.id === activeSection)?.label}</h2>
                                <p>Phần này sẽ sớm ra mắt.</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </>
    );
}

export default EditProfilePage;

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserStore } from "@/stores/useUserStore";
import Header from "@/components/Header";
import { useProfileEdit } from "./profile/hooks/useProfileEdit";
import { ProfileForm } from "./profile/components/ProfileForm";
import { PasswordForm } from "./profile/components/PasswordForm";
import "./EditProfilePage.css";

// Profile settings section IDs
const SECTION_IDS = {
    EDIT_PROFILE: 'edit-profile',
    CHANGE_PASSWORD: 'change-password',
    DOWNLOAD_HISTORY: 'download-history',
} as const;

const ROUTES = {
    SIGNIN: '/signin',
} as const;

function EditProfilePage() {
    const { user } = useUserStore();
    const navigate = useNavigate();
    const [activeSection, setActiveSection] = useState(SECTION_IDS.EDIT_PROFILE);

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
            navigate(ROUTES.SIGNIN);
            return;
        }
        // Set form values when user data is available
        const nameParts = user.displayName?.split(' ') ?? [];
        setValue('firstName', nameParts[0] ?? '');
        setValue('lastName', nameParts.slice(1).join(' ') ?? '');
        setValue('email', user.email ?? '');
        setValue('username', user.username ?? '');
        setValue('bio', user.bio ?? '');
        setValue('location', user.location ?? '');
        setValue('phone', user.phone ?? '');
        setValue('personalSite', user.website ?? 'https://');
        setValue('instagram', user.instagram ?? '');
        setValue('twitter', user.twitter ?? '');
    }, [user, navigate, setValue]);

    // Filter menu items based on user type
    const allMenuItems = [
        { id: SECTION_IDS.EDIT_PROFILE, label: 'Chỉnh sửa thông tin' },
        { id: SECTION_IDS.DOWNLOAD_HISTORY, label: 'Lịch sử tải xuống' },
        { id: SECTION_IDS.CHANGE_PASSWORD, label: 'Đổi mật khẩu' },
    ];

    // Hide "Change password" for OAuth users
    const menuItems = allMenuItems.filter(item =>
        user?.isOAuthUser ? item.id !== SECTION_IDS.CHANGE_PASSWORD : true
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
                        {activeSection === SECTION_IDS.EDIT_PROFILE && (
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

                        {activeSection === SECTION_IDS.CHANGE_PASSWORD && !user?.isOAuthUser && (
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

                        {activeSection !== SECTION_IDS.EDIT_PROFILE && activeSection !== SECTION_IDS.CHANGE_PASSWORD && (
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

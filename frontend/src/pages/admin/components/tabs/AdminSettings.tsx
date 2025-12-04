import { useState, useEffect } from 'react';
import { adminService } from '@/services/adminService';
import { toast } from 'sonner';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Megaphone, X } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { t } from '@/i18n';

export function AdminSettings() {
    const { hasPermission, isSuperAdmin } = usePermissions();
    const { refreshSettings } = useSiteSettings();
    const [settings, setSettings] = useState({
        siteName: 'PhotoApp',
        siteDescription: '',
        maxUploadSize: 10,
        allowedFileTypes: 'jpg,jpeg,png,webp',
        maintenanceMode: false,
    });
    
    // Available file types for selection
    const availableFileTypes = [
        { value: 'jpg', label: 'JPG' },
        { value: 'jpeg', label: 'JPEG' },
        { value: 'png', label: 'PNG' },
        { value: 'webp', label: 'WebP' },
        { value: 'gif', label: 'GIF' },
        { value: 'svg', label: 'SVG' },
        { value: 'bmp', label: 'BMP' },
        { value: 'ico', label: 'ICO' },
        { value: 'mp4', label: 'MP4' },
        { value: 'webm', label: 'WebM' },
    ];
    
    // Convert comma-separated string to array for checkbox handling
    const selectedFileTypes = settings.allowedFileTypes.split(',').map(t => t.trim()).filter(t => t);
    
    const handleFileTypeToggle = (fileType: string) => {
        const currentTypes = selectedFileTypes;
        const newTypes = currentTypes.includes(fileType)
            ? currentTypes.filter(t => t !== fileType)
            : [...currentTypes, fileType];
        setSettings({ ...settings, allowedFileTypes: newTypes.join(',') });
    };
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    
    // System Announcement state
    const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
    const [announcementData, setAnnouncementData] = useState({
        type: 'system_announcement' as 'system_announcement' | 'feature_update' | 'maintenance_scheduled' | 'terms_updated',
        title: '',
        message: '',
    });
    const [sendingAnnouncement, setSendingAnnouncement] = useState(false);

    useEffect(() => {
        if (!isSuperAdmin() && !hasPermission('manageSettings')) {
            toast.error('Bạn không có quyền quản lý cài đặt');
            return;
        }
        loadSettings();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const data = await adminService.getSettings();
            if (data.settings) {
                const settingsData = data.settings as {
                    siteName?: string;
                    siteDescription?: string;
                    maxUploadSize?: number;
                    allowedFileTypes?: string[] | string;
                    maintenanceMode?: boolean;
                };
                setSettings({
                    siteName: (settingsData.siteName as string) || 'PhotoApp',
                    siteDescription: (settingsData.siteDescription as string) || '',
                    maxUploadSize: (settingsData.maxUploadSize as number) || 10,
                    allowedFileTypes: Array.isArray(settingsData.allowedFileTypes)
                        ? settingsData.allowedFileTypes.join(',')
                        : (settingsData.allowedFileTypes as string) || 'jpg,jpeg,png,webp',
                    maintenanceMode: (settingsData.maintenanceMode as boolean) || false,
                });
            }
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Lỗi khi tải cài đặt');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!isSuperAdmin() && !hasPermission('manageSettings')) {
            toast.error('Bạn không có quyền quản lý cài đặt');
            return;
        }

        try {
            setSaving(true);
            const updateData = {
                ...settings,
                allowedFileTypes: settings.allowedFileTypes.split(',').map(t => t.trim()),
            };
            await adminService.updateSettings(updateData);
            toast.success('Đã lưu cài đặt thành công');
            // Reload settings to reflect the saved changes
            await loadSettings();
            // Refresh site settings globally (updates document title)
            await refreshSettings();
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Lỗi khi lưu cài đặt');
        } finally {
            setSaving(false);
        }
    };

    const handleSendAnnouncement = async () => {
        if (!isSuperAdmin() && !hasPermission('manageSettings')) {
            toast.error('Bạn không có quyền gửi thông báo hệ thống');
            return;
        }

        if (!announcementData.title.trim() || !announcementData.message.trim()) {
            toast.error('Vui lòng điền đầy đủ tiêu đề và nội dung');
            return;
        }

        try {
            setSendingAnnouncement(true);
            const result = await adminService.createSystemAnnouncement(announcementData);
            toast.success(result.message || `Đã gửi thông báo đến ${result.recipientCount} người dùng`);
            setShowAnnouncementForm(false);
            setAnnouncementData({
                type: 'system_announcement',
                title: '',
                message: '',
            });
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Lỗi khi gửi thông báo');
        } finally {
            setSendingAnnouncement(false);
        }
    };

    if (loading) {
        return <div className="admin-loading">Đang tải...</div>;
    }

    return (
        <div className="admin-settings">
            <div className="admin-header">
                <h1 className="admin-title">{t('admin.systemSettings')}</h1>
            </div>

            <div className="admin-form">
                <div className="admin-form-group">
                    <Label>{t('admin.siteName')}</Label>
                    <Input
                        value={settings.siteName}
                        onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                    />
                </div>

                <div className="admin-form-group">
                    <Label>{t('admin.siteDescription')}</Label>
                    <Input
                        value={settings.siteDescription}
                        onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
                    />
                </div>

                <div className="admin-form-group">
                    <Label>{t('admin.maxUploadSize')}</Label>
                    <Input
                        type="number"
                        value={settings.maxUploadSize}
                        onChange={(e) => setSettings({ ...settings, maxUploadSize: parseInt(e.target.value) || 10 })}
                    />
                </div>

                <div className="admin-form-group">
                    <Label>{t('admin.allowedFileFormats')}</Label>
                    <div className="admin-file-types-selector">
                        {availableFileTypes.map((fileType) => {
                            const isSelected = selectedFileTypes.includes(fileType.value);
                            return (
                                <label
                                    key={fileType.value}
                                    className={`admin-file-type-checkbox ${isSelected ? 'selected' : ''}`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => handleFileTypeToggle(fileType.value)}
                                    />
                                    <span>{fileType.label}</span>
                                </label>
                            );
                        })}
                    </div>
                    {selectedFileTypes.length === 0 && (
                        <p style={{ color: '#dc2626', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                            {t('admin.selectAtLeastOneFormat')}
                        </p>
                    )}
                </div>

                <div className="admin-form-group">
                    <Label>
                        <input
                            type="checkbox"
                            checked={settings.maintenanceMode}
                            onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                        />
                        {t('admin.maintenanceMode')}
                    </Label>
                </div>

                <div className="admin-modal-actions">
                    <Button onClick={handleSave} disabled={saving} className="admin-add-category-btn">
                        <Save size={16} />
                        {saving ? t('admin.saving') : t('admin.saveSettings')}
                    </Button>
                </div>
            </div>

            {/* System Announcement Section */}
            <div className="admin-settings-section" style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #e5e7eb' }}>
                <div className="admin-header" style={{ marginBottom: '1rem' }}>
                    <h2 className="admin-title" style={{ fontSize: '1.25rem' }}>{t('admin.systemNotifications')}</h2>
                    <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                        {t('admin.systemNotificationsDescription')}
                    </p>
                </div>

                {!showAnnouncementForm ? (
                    <Button 
                        onClick={() => setShowAnnouncementForm(true)}
                        style={{ marginBottom: '1rem' }}
                        className="admin-add-category-btn"
                    >
                        <Megaphone size={16} style={{ marginRight: '0.5rem' }} />
                        {t('admin.createNotification')}
                    </Button>
                ) : (
                    <div className="admin-form" style={{ backgroundColor: '#f9fafb', padding: '1.5rem', borderRadius: '0.5rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '1.125rem', fontWeight: '600' }}>Tạo thông báo hệ thống</h3>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setShowAnnouncementForm(false);
                                    setAnnouncementData({
                                        type: 'system_announcement',
                                        title: '',
                                        message: '',
                                    });
                                }}
                            >
                                <X size={16} />
                            </Button>
                        </div>

                        <div className="admin-form-group">
                            <Label>Loại thông báo</Label>
                            <select
                                value={announcementData.type}
                                onChange={(e) => setAnnouncementData({ ...announcementData, type: e.target.value as 'system_announcement' | 'feature_update' | 'maintenance_scheduled' | 'terms_updated' })}
                                style={{
                                    width: '100%',
                                    padding: '0.5rem',
                                    borderRadius: '0.375rem',
                                    border: '1px solid #d1d5db',
                                }}
                            >
                                <option value="system_announcement">Thông báo hệ thống</option>
                                <option value="feature_update">Cập nhật tính năng</option>
                                <option value="maintenance_scheduled">Bảo trì hệ thống</option>
                                <option value="terms_updated">Cập nhật điều khoản</option>
                            </select>
                        </div>

                        <div className="admin-form-group">
                            <Label>Tiêu đề</Label>
                            <Input
                                value={announcementData.title}
                                onChange={(e) => setAnnouncementData({ ...announcementData, title: e.target.value })}
                                placeholder="Nhập tiêu đề thông báo"
                            />
                        </div>

                        <div className="admin-form-group">
                            <Label>Nội dung</Label>
                            <Textarea
                                value={announcementData.message}
                                onChange={(e) => setAnnouncementData({ ...announcementData, message: e.target.value })}
                                placeholder="Nhập nội dung thông báo"
                                rows={5}
                            />
                        </div>

                        <div className="admin-modal-actions">
                            <Button 
                                onClick={handleSendAnnouncement} 
                                disabled={sendingAnnouncement}
                                style={{ backgroundColor: '#3b82f6' }}
                            >
                                <Megaphone size={16} style={{ marginRight: '0.5rem' }} />
                                {sendingAnnouncement ? 'Đang gửi...' : 'Gửi thông báo'}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowAnnouncementForm(false);
                                    setAnnouncementData({
                                        type: 'system_announcement',
                                        title: '',
                                        message: '',
                                    });
                                }}
                                disabled={sendingAnnouncement}
                            >
                                Hủy
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}


import { useState, useEffect } from 'react';
import { adminService } from '@/services/adminService';
import { toast } from 'sonner';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Megaphone, X } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

export function AdminSettings() {
    const { hasPermission, isSuperAdmin } = usePermissions();
    const [settings, setSettings] = useState({
        siteName: 'PhotoApp',
        siteDescription: '',
        maxUploadSize: 10,
        allowedFileTypes: 'jpg,jpeg,png,webp',
        maintenanceMode: false,
    });
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
                <h1 className="admin-title">Cài đặt hệ thống</h1>
            </div>

            <div className="admin-form">
                <div className="admin-form-group">
                    <Label>Tên trang web</Label>
                    <Input
                        value={settings.siteName}
                        onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                    />
                </div>

                <div className="admin-form-group">
                    <Label>Mô tả trang web</Label>
                    <Input
                        value={settings.siteDescription}
                        onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
                    />
                </div>

                <div className="admin-form-group">
                    <Label>Kích thước upload tối đa (MB)</Label>
                    <Input
                        type="number"
                        value={settings.maxUploadSize}
                        onChange={(e) => setSettings({ ...settings, maxUploadSize: parseInt(e.target.value) || 10 })}
                    />
                </div>

                <div className="admin-form-group">
                    <Label>Định dạng file cho phép</Label>
                    <Input
                        value={settings.allowedFileTypes}
                        onChange={(e) => setSettings({ ...settings, allowedFileTypes: e.target.value })}
                        placeholder="jpg,jpeg,png,webp"
                    />
                </div>

                <div className="admin-form-group">
                    <Label>
                        <input
                            type="checkbox"
                            checked={settings.maintenanceMode}
                            onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                        />
                        Chế độ bảo trì
                    </Label>
                </div>

                <div className="admin-modal-actions">
                    <Button onClick={handleSave} disabled={saving}>
                        <Save size={16} />
                        {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
                    </Button>
                </div>
            </div>

            {/* System Announcement Section */}
            <div className="admin-settings-section" style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '1px solid #e5e7eb' }}>
                <div className="admin-header" style={{ marginBottom: '1rem' }}>
                    <h2 className="admin-title" style={{ fontSize: '1.25rem' }}>Thông báo hệ thống</h2>
                    <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                        Gửi thông báo đến tất cả người dùng hoặc người dùng cụ thể
                    </p>
                </div>

                {!showAnnouncementForm ? (
                    <Button 
                        onClick={() => setShowAnnouncementForm(true)}
                        style={{ marginBottom: '1rem' }}
                    >
                        <Megaphone size={16} style={{ marginRight: '0.5rem' }} />
                        Tạo thông báo mới
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


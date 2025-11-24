import { useState, useEffect } from 'react';
import { adminService } from '@/services/adminService';
import { toast } from 'sonner';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save } from 'lucide-react';

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

    useEffect(() => {
        if (!isSuperAdmin() && !hasPermission('manageSettings')) {
            toast.error('Bạn không có quyền quản lý cài đặt');
            return;
        }
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            setLoading(true);
            const data = await adminService.getSettings();
            if (data.settings) {
                setSettings({
                    siteName: data.settings.siteName || 'PhotoApp',
                    siteDescription: data.settings.siteDescription || '',
                    maxUploadSize: data.settings.maxUploadSize || 10,
                    allowedFileTypes: Array.isArray(data.settings.allowedFileTypes)
                        ? data.settings.allowedFileTypes.join(',')
                        : data.settings.allowedFileTypes || 'jpg,jpeg,png,webp',
                    maintenanceMode: data.settings.maintenanceMode || false,
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
        </div>
    );
}


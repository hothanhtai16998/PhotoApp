import { useState, useEffect } from 'react';
import { adminService } from '@/services/adminService';
import { toast } from 'sonner';
import { usePermissions } from '@/hooks/usePermissions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Save, Megaphone, X, Settings, Upload, Shield, Bell, Globe, ChevronDown, ChevronUp, HelpCircle, CheckCircle2, AlertCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { t } from '@/i18n';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
    const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
    const [originalSettings, setOriginalSettings] = useState(settings);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [isFadingOut, setIsFadingOut] = useState(false);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
    const [showMaintenanceConfirm, setShowMaintenanceConfirm] = useState(false);

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
                const loadedSettings = {
                    siteName: (settingsData.siteName as string) || 'PhotoApp',
                    siteDescription: (settingsData.siteDescription as string) || '',
                    maxUploadSize: (settingsData.maxUploadSize as number) || 10,
                    allowedFileTypes: Array.isArray(settingsData.allowedFileTypes)
                        ? settingsData.allowedFileTypes.join(',')
                        : (settingsData.allowedFileTypes as string) || 'jpg,jpeg,png,webp',
                    maintenanceMode: (settingsData.maintenanceMode as boolean) || false,
                };
                setSettings(loadedSettings);
                setOriginalSettings(loadedSettings);
            }
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Lỗi khi tải cài đặt');
        } finally {
            setLoading(false);
        }
    };

    // Real-time validation
    const validateSettings = () => {
        const errors: Record<string, string> = {};
        
        if (!settings.siteName.trim()) {
            errors.siteName = 'Site name is required';
        } else if (settings.siteName.length > 100) {
            errors.siteName = 'Site name must be less than 100 characters';
        }
        
        if (settings.siteDescription.length > 500) {
            errors.siteDescription = 'Description must be less than 500 characters';
        }
        
        if (settings.maxUploadSize < 1 || settings.maxUploadSize > 1000) {
            errors.maxUploadSize = 'Upload size must be between 1 and 1000 MB';
        }
        
        if (selectedFileTypes.length === 0) {
            errors.allowedFileTypes = 'At least one file format must be selected';
        }
        
        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Check if settings have changed
    const hasChanges = () => {
        return JSON.stringify(settings) !== JSON.stringify(originalSettings);
    };

    const handleSave = async () => {
        if (!isSuperAdmin() && !hasPermission('manageSettings')) {
            toast.error('Bạn không có quyền quản lý cài đặt');
            return;
        }

        // Validate before saving
        if (!validateSettings()) {
            toast.error('Please fix validation errors before saving');
            return;
        }

        try {
            setSaving(true);
            setSaveSuccess(false);
            const updateData = {
                ...settings,
                allowedFileTypes: settings.allowedFileTypes.split(',').map(t => t.trim()),
            };
            await adminService.updateSettings(updateData);
            
            // Update original settings to reflect saved state (prevent flash)
            setOriginalSettings(settings);
            
            // Show success indicator
            setSaveSuccess(true);
            setIsFadingOut(false);
            toast.success('Đã lưu cài đặt thành công');
            
            // Refresh site settings globally (updates document title) without full reload
            await refreshSettings();
            
            // Clear success indicator after 3 seconds with fade out
            setTimeout(() => {
                setIsFadingOut(true);
                setTimeout(() => {
                    setSaveSuccess(false);
                    setIsFadingOut(false);
                }, 300);
            }, 2700);
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { message?: string } } };
            toast.error(axiosError.response?.data?.message || 'Lỗi khi lưu cài đặt');
            setSaveSuccess(false);
        } finally {
            setSaving(false);
        }
    };

    const handleMaintenanceModeChange = (checked: boolean) => {
        if (checked) {
            setShowMaintenanceConfirm(true);
        } else {
            setSettings({ ...settings, maintenanceMode: false });
        }
    };

    const confirmMaintenanceMode = () => {
        setSettings({ ...settings, maintenanceMode: true });
        setShowMaintenanceConfirm(false);
    };

    // Validate on settings change
    useEffect(() => {
        if (!loading) {
            validateSettings();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [settings, selectedFileTypes]);

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

            <Tabs defaultValue="general" className="admin-settings-tabs">
                <TabsList className="admin-settings-tabs-list">
                    <TabsTrigger value="general">
                        <Globe size={16} style={{ marginRight: '0.5rem' }} />
                        General
                    </TabsTrigger>
                    <TabsTrigger value="upload">
                        <Upload size={16} style={{ marginRight: '0.5rem' }} />
                        Upload
                    </TabsTrigger>
                    <TabsTrigger value="system">
                        <Shield size={16} style={{ marginRight: '0.5rem' }} />
                        System
                    </TabsTrigger>
                    <TabsTrigger value="notifications">
                        <Bell size={16} style={{ marginRight: '0.5rem' }} />
                        Notifications
                    </TabsTrigger>
                </TabsList>

                {/* General Settings Tab */}
                <TabsContent value="general" className="admin-settings-tab-content">
                    <div className="admin-settings-two-column">
                        <Card className="admin-settings-card">
                            <CardHeader>
                                <CardTitle className="admin-settings-card-title">
                                    <Globe size={20} style={{ marginRight: '0.5rem' }} />
                                    General Settings
                                </CardTitle>
                                <CardDescription>
                                    Configure basic site information and branding
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="admin-form">
                                    <div className={`admin-form-group ${validationErrors.siteName ? 'has-error' : ''} ${settings.siteName !== originalSettings.siteName ? 'has-changes' : ''}`}>
                                        <Label>
                                            {t('admin.siteName')}
                                            <span className="admin-required-indicator">*</span>
                                            <div className="admin-tooltip-wrapper">
                                                <HelpCircle size={14} className="admin-tooltip-icon" />
                                                <span className="admin-tooltip-text">
                                                    The name displayed in the browser tab and site header
                                                </span>
                                            </div>
                                        </Label>
                                        <Input
                                            value={settings.siteName}
                                            onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                                            placeholder="Enter site name"
                                            className={validationErrors.siteName ? 'input-error' : ''}
                                        />
                                        {validationErrors.siteName && (
                                            <p className="admin-validation-error">
                                                <AlertCircle size={14} />
                                                {validationErrors.siteName}
                                            </p>
                                        )}
                                        {settings.siteName !== originalSettings.siteName && !validationErrors.siteName && (
                                            <p className="admin-change-indicator">
                                                <span className="admin-change-dot"></span>
                                                Modified
                                            </p>
                                        )}
                                    </div>

                                <div className={`admin-form-group ${validationErrors.siteDescription ? 'has-error' : ''} ${settings.siteDescription !== originalSettings.siteDescription ? 'has-changes' : ''}`}>
                                    <Label>
                                        {t('admin.siteDescription')}
                                        <div className="admin-tooltip-wrapper">
                                            <HelpCircle size={14} className="admin-tooltip-icon" />
                                            <span className="admin-tooltip-text">
                                                A brief description of your site (used for SEO and social sharing)
                                            </span>
                                        </div>
                                    </Label>
                                    <Input
                                        value={settings.siteDescription}
                                        onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
                                        placeholder="Enter site description"
                                        className={validationErrors.siteDescription ? 'input-error' : ''}
                                    />
                                    {validationErrors.siteDescription && (
                                        <p className="admin-validation-error">
                                            <AlertCircle size={14} />
                                            {validationErrors.siteDescription}
                                        </p>
                                    )}
                                    {settings.siteDescription !== originalSettings.siteDescription && !validationErrors.siteDescription && (
                                        <p className="admin-change-indicator">
                                            <span className="admin-change-dot"></span>
                                            Modified
                                        </p>
                                    )}
                                    <p className="admin-form-help-text">
                                        {settings.siteDescription.length}/500 characters
                                    </p>
                                </div>

                                {/* Progressive Disclosure - Advanced Settings */}
                                <div className="admin-advanced-settings-section">
                                    <button
                                        type="button"
                                        className="admin-advanced-settings-toggle"
                                        onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                                    >
                                        <span>Advanced Settings</span>
                                        {showAdvancedSettings ? (
                                            <ChevronUp size={18} />
                                        ) : (
                                            <ChevronDown size={18} />
                                        )}
                                    </button>
                                    {showAdvancedSettings && (
                                        <div className="admin-advanced-settings-content">
                                            <div className="admin-form-group">
                                                <Label>Timezone</Label>
                                                <select className="admin-select" defaultValue="UTC">
                                                    <option value="UTC">UTC</option>
                                                    <option value="America/New_York">Eastern Time</option>
                                                    <option value="America/Chicago">Central Time</option>
                                                    <option value="America/Denver">Mountain Time</option>
                                                    <option value="America/Los_Angeles">Pacific Time</option>
                                                    <option value="Europe/London">London</option>
                                                    <option value="Asia/Ho_Chi_Minh">Ho Chi Minh</option>
                                                </select>
                                                <p className="admin-form-help-text">
                                                    Set the default timezone for the application
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="admin-modal-actions">
                                    <div className="admin-actions-status">
                                        {hasChanges() && (
                                            <div className="admin-unsaved-changes-indicator">
                                                <AlertCircle size={16} />
                                                <span>You have unsaved changes</span>
                                            </div>
                                        )}
                                        {saveSuccess && (
                                            <div className={`admin-save-success-indicator ${isFadingOut ? 'fade-out' : ''}`}>
                                                <CheckCircle2 size={16} />
                                                <span>Settings saved successfully!</span>
                                            </div>
                                        )}
                                    </div>
                                    <Button 
                                        onClick={handleSave} 
                                        disabled={saving || !hasChanges() || Object.keys(validationErrors).length > 0} 
                                        className="admin-add-category-btn"
                                    >
                                        <Save size={16} />
                                        {saving ? t('admin.saving') : t('admin.saveSettings')}
                                    </Button>
                                </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* Upload Settings Tab */}
                <TabsContent value="upload" className="admin-settings-tab-content">
                    <Card className="admin-settings-card">
                        <CardHeader>
                            <CardTitle className="admin-settings-card-title">
                                <Upload size={20} style={{ marginRight: '0.5rem' }} />
                                Upload Settings
                            </CardTitle>
                            <CardDescription>
                                Configure file upload limits and allowed formats
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="admin-form">
                                <div className={`admin-form-group ${validationErrors.maxUploadSize ? 'has-error' : ''} ${settings.maxUploadSize !== originalSettings.maxUploadSize ? 'has-changes' : ''}`}>
                                    <Label>
                                        {t('admin.maxUploadSize')} (MB)
                                        <div className="admin-tooltip-wrapper">
                                            <HelpCircle size={14} className="admin-tooltip-icon" />
                                            <span className="admin-tooltip-text">
                                                Maximum file size allowed for uploads. Higher values may require server configuration changes.
                                            </span>
                                        </div>
                                    </Label>
                                    <Input
                                        type="number"
                                        value={settings.maxUploadSize}
                                        onChange={(e) => setSettings({ ...settings, maxUploadSize: parseInt(e.target.value) || 10 })}
                                        min="1"
                                        max="1000"
                                        className={validationErrors.maxUploadSize ? 'input-error' : ''}
                                    />
                                    {validationErrors.maxUploadSize && (
                                        <p className="admin-validation-error">
                                            <AlertCircle size={14} />
                                            {validationErrors.maxUploadSize}
                                        </p>
                                    )}
                                    {settings.maxUploadSize !== originalSettings.maxUploadSize && !validationErrors.maxUploadSize && (
                                        <p className="admin-change-indicator">
                                            <span className="admin-change-dot"></span>
                                            Modified
                                        </p>
                                    )}
                                    <p className="admin-form-help-text">
                                        Maximum file size users can upload (1-1000 MB)
                                    </p>
                                </div>

                                <div className={`admin-form-group ${validationErrors.allowedFileTypes ? 'has-error' : ''} ${settings.allowedFileTypes !== originalSettings.allowedFileTypes ? 'has-changes' : ''}`}>
                                    <Label>
                                        {t('admin.allowedFileFormats')}
                                        <div className="admin-tooltip-wrapper">
                                            <HelpCircle size={14} className="admin-tooltip-icon" />
                                            <span className="admin-tooltip-text">
                                                Select which file formats users can upload. At least one format must be selected.
                                            </span>
                                        </div>
                                    </Label>
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
                                    {validationErrors.allowedFileTypes && (
                                        <p className="admin-validation-error">
                                            <AlertCircle size={14} />
                                            {validationErrors.allowedFileTypes}
                                        </p>
                                    )}
                                    {settings.allowedFileTypes !== originalSettings.allowedFileTypes && !validationErrors.allowedFileTypes && (
                                        <p className="admin-change-indicator">
                                            <span className="admin-change-dot"></span>
                                            Modified
                                        </p>
                                    )}
                                </div>

                                <div className="admin-modal-actions">
                                    <div className="admin-actions-status">
                                        {hasChanges() && (
                                            <div className="admin-unsaved-changes-indicator">
                                                <AlertCircle size={16} />
                                                <span>You have unsaved changes</span>
                                            </div>
                                        )}
                                        {saveSuccess && (
                                            <div className={`admin-save-success-indicator ${isFadingOut ? 'fade-out' : ''}`}>
                                                <CheckCircle2 size={16} />
                                                <span>Settings saved successfully!</span>
                                            </div>
                                        )}
                                    </div>
                                    <Button 
                                        onClick={handleSave} 
                                        disabled={saving || !hasChanges() || Object.keys(validationErrors).length > 0} 
                                        className="admin-add-category-btn"
                                    >
                                        <Save size={16} />
                                        {saving ? t('admin.saving') : t('admin.saveSettings')}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* System Settings Tab */}
                <TabsContent value="system" className="admin-settings-tab-content">
                    <Card className="admin-settings-card">
                        <CardHeader>
                            <CardTitle className="admin-settings-card-title">
                                <Shield size={20} style={{ marginRight: '0.5rem' }} />
                                System Settings
                            </CardTitle>
                            <CardDescription>
                                Configure system-wide settings and maintenance mode
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="admin-form">
                                <div className={`admin-form-group ${settings.maintenanceMode !== originalSettings.maintenanceMode ? 'has-changes' : ''}`}>
                                    <Label className="admin-maintenance-toggle-label">
                                        <input
                                            type="checkbox"
                                            checked={settings.maintenanceMode}
                                            onChange={(e) => handleMaintenanceModeChange(e.target.checked)}
                                            className="admin-maintenance-checkbox"
                                        />
                                        <span>{t('admin.maintenanceMode')}</span>
                                        {settings.maintenanceMode && (
                                            <span className="admin-status-badge admin-status-badge-warning">Active</span>
                                        )}
                                    </Label>
                                    <p className="admin-form-help-text">
                                        When enabled, the site will be unavailable to regular users. Only administrators can access.
                                    </p>
                                    {settings.maintenanceMode !== originalSettings.maintenanceMode && (
                                        <p className="admin-change-indicator">
                                            <span className="admin-change-dot"></span>
                                            Modified
                                        </p>
                                    )}
                                </div>

                                {/* Maintenance Mode Confirmation Dialog */}
                                {showMaintenanceConfirm && (
                                    <div className="admin-confirmation-dialog-overlay" onClick={() => setShowMaintenanceConfirm(false)}>
                                        <div className="admin-confirmation-dialog" onClick={(e) => e.stopPropagation()}>
                                            <div className="admin-confirmation-dialog-header">
                                                <AlertCircle size={24} className="admin-confirmation-icon" />
                                                <h3>Enable Maintenance Mode?</h3>
                                            </div>
                                            <div className="admin-confirmation-dialog-content">
                                                <p>Enabling maintenance mode will make the site unavailable to all regular users. Only administrators will be able to access the site.</p>
                                                <p><strong>Are you sure you want to continue?</strong></p>
                                            </div>
                                            <div className="admin-confirmation-dialog-actions">
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setShowMaintenanceConfirm(false)}
                                                >
                                                    Cancel
                                                </Button>
                                                <Button
                                                    onClick={confirmMaintenanceMode}
                                                    className="admin-confirmation-button-danger"
                                                >
                                                    Enable Maintenance Mode
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="admin-modal-actions">
                                    <div className="admin-actions-status">
                                        {hasChanges() && (
                                            <div className="admin-unsaved-changes-indicator">
                                                <AlertCircle size={16} />
                                                <span>You have unsaved changes</span>
                                            </div>
                                        )}
                                        {saveSuccess && (
                                            <div className={`admin-save-success-indicator ${isFadingOut ? 'fade-out' : ''}`}>
                                                <CheckCircle2 size={16} />
                                                <span>Settings saved successfully!</span>
                                            </div>
                                        )}
                                    </div>
                                    <Button 
                                        onClick={handleSave} 
                                        disabled={saving || !hasChanges() || Object.keys(validationErrors).length > 0} 
                                        className="admin-add-category-btn"
                                    >
                                        <Save size={16} />
                                        {saving ? t('admin.saving') : t('admin.saveSettings')}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Notifications Tab */}
                <TabsContent value="notifications" className="admin-settings-tab-content">
                    <Card className="admin-settings-card">
                        <CardHeader>
                            <CardTitle className="admin-settings-card-title">
                                <Bell size={20} style={{ marginRight: '0.5rem' }} />
                                System Notifications
                            </CardTitle>
                            <CardDescription>
                                {t('admin.systemNotificationsDescription')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {!showAnnouncementForm ? (
                                <Button 
                                    onClick={() => setShowAnnouncementForm(true)}
                                    className="admin-add-category-btn"
                                >
                                    <Megaphone size={16} style={{ marginRight: '0.5rem' }} />
                                    {t('admin.createNotification')}
                                </Button>
                            ) : (
                                <div className="admin-form admin-announcement-form">
                                    <div className="admin-announcement-form-header">
                                        <h3 className="admin-announcement-form-title">Tạo thông báo hệ thống</h3>
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
                                            className="admin-select"
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
                                            className="admin-add-category-btn"
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
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}


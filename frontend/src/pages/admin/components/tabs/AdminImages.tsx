import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Trash2, CheckCircle, XCircle, Flag, X } from 'lucide-react';
import { adminService, type AdminImage } from '@/services/adminService';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/utils';
import { PermissionButton } from '../PermissionButton';
import { t } from '@/i18n';

interface AdminImagesProps {
    images: AdminImage[];
    pagination: { page: number; pages: number; total: number };
    search: string;
    onSearchChange: (value: string) => void;
    onSearch: () => void;
    onPageChange: (page: number) => void;
    onDelete: (imageId: string, imageTitle: string) => void;
    onImageUpdated?: () => void;
}

export function AdminImages({
    images,
    pagination,
    search,
    onSearchChange,
    onSearch,
    onPageChange,
    onDelete,
    onImageUpdated,
}: AdminImagesProps) {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    // Close modal on ESC key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setSelectedImage(null);
            }
        };
        if (selectedImage) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [selectedImage]);

    const handleModerate = async (imageId: string, status: 'approved' | 'rejected' | 'flagged') => {
        const notes = prompt(t('admin.moderationNotes'));
        if (notes === null && status !== 'approved') return; // User cancelled (except for approve which doesn't need notes)
        
        try {
            await adminService.moderateImage(imageId, status, notes || undefined);
            const successMessage = status === 'approved' 
                ? t('admin.approveSuccess')
                : status === 'rejected' 
                ? t('admin.rejectSuccess')
                : t('admin.flagSuccess');
            toast.success(successMessage);
            onImageUpdated?.();
        } catch (error: unknown) {
            toast.error(getErrorMessage(error, t('admin.moderationFailed')));
        }
    };
    return (
        <div className="admin-images">
            <div className="admin-header">
                <h1 className="admin-title">{t('admin.manageImages')}</h1>
                <div className="admin-search">
                    <Search size={20} />
                    <Input
                        placeholder={t('admin.searchImage')}
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                onSearch();
                            }
                        }}
                    />
                    <Button onClick={onSearch}>{t('admin.search')}</Button>
                </div>
            </div>

            <div className="admin-images-grid">
                {images.map((img) => (
                    <div key={img._id} className="admin-image-card">
                        <img 
                            src={img.imageUrl} 
                            alt={img.imageTitle}
                            onClick={() => setSelectedImage(img.imageUrl)}
                            style={{ cursor: 'pointer' }}
                        />
                        <div className="admin-image-info">
                            <h3>{img.imageTitle}</h3>
                            <p>{t('admin.categoryLabel2')} {typeof img.imageCategory === 'string'
                                ? img.imageCategory
                                : img.imageCategory?.name || t('admin.unknown')}</p>
                            <p>{t('admin.uploaderLabel')} {img.uploadedBy.displayName || img.uploadedBy.username}</p>
                            <p>{t('admin.uploadDateLabel')} {img.createdAt}</p>
                            {img.moderationStatus && (
                                <p className="moderation-status">
                                    {t('admin.moderationStatus')} <span className={`moderation-badge ${img.moderationStatus}`}>
                                        {img.moderationStatus === 'approved' ? t('admin.approved') : 
                                         img.moderationStatus === 'rejected' ? t('admin.rejected') : 
                                         img.moderationStatus === 'flagged' ? t('admin.flagged') : t('admin.pending')}
                                    </span>
                                </p>
                            )}
                            <div className="admin-image-actions">
                                {/* Show Approve button only if status is NOT approved (pending, rejected, or flagged) */}
                                {img.moderationStatus !== 'approved' && (
                                    <PermissionButton
                                        permission="moderateImages"
                                        action={t('admin.approveImage')}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleModerate(img._id, 'approved')}
                                        className="admin-action-approve"
                                    >
                                        <CheckCircle size={16} /> {t('admin.approve')}
                                    </PermissionButton>
                                )}
                                {/* Show Reject button only if status is NOT rejected (pending, approved, or flagged) */}
                                {img.moderationStatus !== 'rejected' && (
                                    <PermissionButton
                                        permission="moderateImages"
                                        action={t('admin.rejectImage')}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleModerate(img._id, 'rejected')}
                                        className="admin-action-reject"
                                    >
                                        <XCircle size={16} /> {t('admin.reject')}
                                    </PermissionButton>
                                )}
                                {/* Show Flag button only if status is NOT flagged (pending, approved, or rejected) */}
                                {img.moderationStatus !== 'flagged' && (
                                    <PermissionButton
                                        permission="moderateImages"
                                        action={t('admin.flagImage')}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleModerate(img._id, 'flagged')}
                                        className="admin-action-flag"
                                    >
                                        <Flag size={16} /> {t('admin.flag')}
                                    </PermissionButton>
                                )}
                                <PermissionButton
                                    permission="deleteImages"
                                    action={t('admin.deleteImage')}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onDelete(img._id, img.imageTitle)}
                                    className="admin-action-delete"
                                >
                                    <Trash2 size={16} /> {t('admin.deleteImage')}
                                </PermissionButton>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {pagination.pages > 1 && (
                <div className="admin-pagination">
                    <Button
                        disabled={pagination.page === 1}
                        onClick={() => onPageChange(pagination.page - 1)}
                    >
                        {t('admin.previous')}
                    </Button>
                    <span>
                        {t('admin.pageOf', { current: pagination.page, total: pagination.pages })}
                    </span>
                    <Button
                        disabled={pagination.page === pagination.pages}
                        onClick={() => onPageChange(pagination.page + 1)}
                    >
                        {t('admin.next')}
                    </Button>
                </div>
            )}

            {/* Fullscreen Image Viewer */}
            {selectedImage && (
                <div 
                    className="admin-image-viewer-overlay"
                    onClick={() => setSelectedImage(null)}
                >
                    <button
                        className="admin-image-viewer-close"
                        onClick={(e) => {
                            e.stopPropagation();
                            setSelectedImage(null);
                        }}
                        aria-label="Close"
                    >
                        <X size={24} />
                    </button>
                    <img 
                        src={selectedImage} 
                        alt="Fullscreen view"
                        className="admin-image-viewer-image"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    );
}


import { useState } from 'react';
import { Flag } from 'lucide-react';
import { toast } from 'sonner';
import { reportService, type ReportType, type ReportReason } from '@/services/reportService';
import './ReportButton.css';

interface ReportButtonProps {
    type: ReportType;
    targetId: string;
    targetName?: string;
    className?: string;
}

const REPORT_REASONS: { value: ReportReason; label: string }[] = [
    { value: 'inappropriate_content', label: 'Nội dung không phù hợp' },
    { value: 'spam', label: 'Spam' },
    { value: 'copyright_violation', label: 'Vi phạm bản quyền' },
    { value: 'harassment', label: 'Quấy rối' },
    { value: 'fake_account', label: 'Tài khoản giả mạo' },
    { value: 'other', label: 'Khác' },
];

export default function ReportButton({ type, targetId, targetName, className = '' }: ReportButtonProps) {
    const [showModal, setShowModal] = useState(false);
    const [reason, setReason] = useState<ReportReason | ''>('');
    const [description, setDescription] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!reason) {
            toast.error('Vui lòng chọn lý do báo cáo');
            return;
        }

        setSubmitting(true);
        try {
            await reportService.createReport({
                type,
                targetId,
                reason: reason as ReportReason,
                description: description.trim() || undefined,
            });
            
            toast.success('Đã gửi báo cáo thành công. Cảm ơn bạn đã giúp cải thiện cộng đồng!');
            setShowModal(false);
            setReason('');
            setDescription('');
        } catch (error: any) {
            console.error('Failed to submit report:', error);
            toast.error(error.response?.data?.message || 'Không thể gửi báo cáo. Vui lòng thử lại.');
        } finally {
            setSubmitting(false);
        }
    };

    const getTypeLabel = () => {
        switch (type) {
            case 'image':
                return 'ảnh';
            case 'collection':
                return 'bộ sưu tập';
            case 'user':
                return 'người dùng';
            default:
                return 'nội dung';
        }
    };

    return (
        <>
            <button
                className={`report-btn ${className}`}
                onClick={() => setShowModal(true)}
                title={`Báo cáo ${getTypeLabel()}`}
            >
                <Flag size={16} />
                <span>Báo cáo</span>
            </button>

            {showModal && (
                <div className="report-modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="report-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="report-modal-header">
                            <h2>Báo cáo {getTypeLabel()}</h2>
                            <button
                                className="report-modal-close"
                                onClick={() => setShowModal(false)}
                                aria-label="Đóng"
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="report-modal-form">
                            {targetName && (
                                <div className="report-modal-target">
                                    <p>Bạn đang báo cáo: <strong>{targetName}</strong></p>
                                </div>
                            )}

                            <div className="report-form-group">
                                <label htmlFor="reason">Lý do báo cáo *</label>
                                <select
                                    id="reason"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value as ReportReason)}
                                    required
                                    disabled={submitting}
                                >
                                    <option value="">Chọn lý do...</option>
                                    {REPORT_REASONS.map((r) => (
                                        <option key={r.value} value={r.value}>
                                            {r.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="report-form-group">
                                <label htmlFor="description">Mô tả chi tiết (tùy chọn)</label>
                                <textarea
                                    id="description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Vui lòng cung cấp thêm thông tin về vấn đề..."
                                    rows={4}
                                    maxLength={1000}
                                    disabled={submitting}
                                />
                                <div className="report-char-count">
                                    {description.length}/1000
                                </div>
                            </div>

                            <div className="report-modal-actions">
                                <button
                                    type="button"
                                    className="report-btn-cancel"
                                    onClick={() => setShowModal(false)}
                                    disabled={submitting}
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    className="report-btn-submit"
                                    disabled={submitting || !reason}
                                >
                                    {submitting ? 'Đang gửi...' : 'Gửi báo cáo'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}


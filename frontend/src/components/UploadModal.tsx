import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { X, Upload, ArrowRight } from 'lucide-react';
import { useImageUpload, type ImageData } from './upload/hooks/useImageUpload';
import { UploadProgress } from './upload/UploadProgress';
import { UploadPreview } from './upload/UploadPreview';
import { UploadForm } from './upload/UploadForm';
import './UploadModal.css';

interface UploadModalProps {
    isOpen: boolean;
    onClose: () => void;
}

function UploadModal({ isOpen, onClose }: UploadModalProps) {
    const { accessToken } = useAuthStore();
    const navigate = useNavigate();
    const [dragActive, setDragActive] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [imagesData, setImagesData] = useState<ImageData[]>([]);
    const [showTooltip, setShowTooltip] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const {
        categories,
        loadingCategories,
        loadCategories,
        showProgress,
        showSuccess,
        uploadingIndex,
        totalUploads,
        uploadProgress,
        loading,
        handleSubmitAll,
        resetUploadState,
    } = useImageUpload({
        onSuccess: () => {
            // Success handling is done in the hook
        },
    });

    // Fetch categories when modal opens
    useEffect(() => {
        if (isOpen) {
            loadCategories();
        }
    }, [isOpen, loadCategories]);

    // Check if all images have required fields filled
    const isFormValid = imagesData.length > 0 &&
        imagesData.every(img =>
            img.title.trim().length > 0 &&
            img.category.trim().length > 0
        );

    // Initialize imagesData when files are selected
    useEffect(() => {
        if (selectedFiles.length > 0) {
            setImagesData(prev => {
                // Initialize or update imagesData array
                const newImagesData: ImageData[] = selectedFiles.map((file, index) => {
                    // If image data already exists for this file at this index, keep it; otherwise create new
                    if (prev[index] && prev[index].file === file) {
                        return prev[index];
                    }
                    return {
                        file,
                        title: '',
                        category: '',
                        location: '',
                        coordinates: undefined,
                        cameraModel: '',
                        tags: [],
                        errors: {}
                    };
                });
                return newImagesData;
            });
        } else {
            setImagesData([]);
        }
    }, [selectedFiles]);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files);
            setSelectedFiles(files);
        }
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const files = Array.from(e.target.files);
            setSelectedFiles(files);
        }
    };

    // Update image data when form fields change
    const updateImageData = (index: number, field: 'title' | 'category' | 'location' | 'cameraModel' | 'tags', value: string | string[]) => {
        setImagesData(prev => {
            const updated = [...prev];
            const current = updated[index];
            if (!current) return updated;
            const newErrors = { ...current.errors };
            if (field === 'title') {
                newErrors.title = undefined;
            } else if (field === 'category') {
                newErrors.category = undefined;
            }
            updated[index] = {
                ...current,
                [field]: value,
                errors: newErrors
            };
            return updated;
        });
    };

    // Update coordinates for an image
    const updateImageCoordinates = (index: number, coordinates: { latitude: number; longitude: number } | undefined) => {
        setImagesData(prev => {
            const updated = [...prev];
            const current = updated[index];
            if (!current) return updated;
            updated[index] = {
                ...current,
                coordinates,
            };
            return updated;
        });
    };

    const handleSubmit = async () => {
        // Validate all images first
        const updated = imagesData.map(img => {
            const errors: { title?: string; category?: string } = {};
            if (!img.title.trim()) {
                errors.title = 'Title is required';
            }
            if (!img.category.trim()) {
                errors.category = 'Category is required';
            }
            return { ...img, errors };
        });
        setImagesData(updated);

        if (!updated.every(img => Object.keys(img.errors).length === 0)) {
            return;
        }

        await handleSubmitAll(imagesData);
    };

    const handleViewProfile = () => {
        setSelectedFiles([]);
        setImagesData([]);
        resetUploadState();
        onClose();
        // Dispatch custom event to trigger image refresh
        window.dispatchEvent(new CustomEvent('refreshProfile'));
        navigate('/profile');
    };

    const handleCancel = useCallback(() => {
        if (showProgress || showSuccess) return; // Prevent closing during upload/success
        setSelectedFiles([]);
        setImagesData([]);
        resetUploadState();
        onClose();
    }, [onClose, showProgress, showSuccess, resetUploadState]);

    // Handle ESC key
    useEffect(() => {
        if (!isOpen) return;
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                handleCancel();
            }
        };
        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, [isOpen, handleCancel]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // Redirect to sign-in if not authenticated
    useEffect(() => {
        if (isOpen && !accessToken) {
            onClose();
            navigate('/signin');
        }
    }, [isOpen, accessToken, onClose, navigate]);

    // Confetti effect
    useEffect(() => {
        if (showSuccess) {
            const container = document.getElementById('confetti-container');
            if (!container) return;

            const colors = ['#ff6b6b', '#4ecdc4', '#ffe66d', '#95e1d3', '#f38181'];
            const confettiCount = 50;

            for (let i = 0; i < confettiCount; i++) {
                const confetti = document.createElement('div');
                confetti.className = 'confetti';
                confetti.style.left = `${Math.random() * 100}%`;
                const color = colors[Math.floor(Math.random() * colors.length)];
                if (color) {
                  confetti.style.background = color;
                }
                confetti.style.animationDelay = `${Math.random() * 2}s`;
                confetti.style.animationDuration = `${2 + Math.random() * 2}s`;
                container.appendChild(confetti);
            }

            return () => {
                container.innerHTML = '';
            };
        }
    }, [showSuccess]);

    if (!isOpen || !accessToken) return null;

    // Progress Screen
    if (showProgress) {
        return (
            <UploadProgress
                uploadingIndex={uploadingIndex}
                totalUploads={totalUploads}
                uploadProgress={uploadProgress}
            />
        );
    }

    // Success Screen
    if (showSuccess) {
        return (
            <div className="upload-modal-overlay" onClick={onClose}>
                <div className="upload-success-screen" onClick={(e) => e.stopPropagation()}>
                    <div className="confetti-container" id="confetti-container"></div>
                    <div className="success-content">
                        <div className="success-header">
                            <h1 className="success-title">Thêm ảnh thành công 🎉</h1>
                            <p className="success-subtitle">Our Editorial team is now reviewing your image.</p>
                        </div>
                        <Button
                            className="success-button"
                            onClick={handleViewProfile}
                            size="lg"
                        >
                            Xem trang cá nhân
                            <ArrowRight size={20} />
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // Upload Screen (when no images selected)
    if (selectedFiles.length === 0) {
        return (
            <div className="upload-modal-overlay" onClick={handleCancel}>
                <div className="upload-modal" onClick={(e) => e.stopPropagation()}>
                    {/* Header */}
                    <div className="upload-modal-header">
                        <h2 className="upload-modal-title">Thêm ảnh vào PhotoApp</h2>
                        <button className="upload-modal-close" onClick={handleCancel}>
                            <X size={20} />
                        </button>
                    </div>

                    {/* Upload Area */}
                    <div className="upload-modal-content">
                        <div
                            className={`upload-dropzone ${dragActive ? 'drag-active' : ''}`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <div className="upload-icon-large">
                                <Upload size={64} />
                            </div>
                            <div className="upload-text">
                                <span className="upload-main-text">Thêm ảnh</span>
                                <span className="upload-tag">JPEG</span>
                            </div>
                            <div className="upload-text">
                                <span className="upload-main-text">hoặc bản vẽ illustration</span>
                                <span className="upload-tag">SVG</span>
                            </div>
                            <p className="upload-instruction">Kẻo thả hoặc</p>
                            <p className="upload-browse">
                                <button type="button" className="upload-browse-link" onClick={(e) => {
                                    e.stopPropagation();
                                    fileInputRef.current?.click();
                                }}>Chọn</button> ảnh từ máy tính, điện thoại (có thể chọn nhiều ảnh)
                            </p>
                            <p className="upload-max-size">Tối đa 10 MB</p>
                            <input
                                type="file"
                                accept="image/*"
                                className="upload-file-input"
                                multiple={true}
                                onChange={handleFileInput}
                                ref={fileInputRef}
                            />
                        </div>

                        {/* Footer */}
                        <div className="upload-modal-footer">
                            <div className="footer-buttons">
                                <Button type="button" variant="outline" onClick={handleCancel}>
                                    Huỷ
                                </Button>
                                <Button type="button" disabled>
                                    Tiếp theo
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Form View (when image is selected)
    return (
        <div className="upload-modal-overlay" onClick={handleCancel}>
            <div className="upload-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="upload-modal-header">
                    <h2 className="upload-modal-title">Thêm ảnh vào PhotoApp</h2>
                    <button className="upload-modal-close" onClick={handleCancel}>
                        <X size={20} />
                    </button>
                </div>

                {/* Content - Scrollable container with all images and their forms */}
                <div className="upload-modal-content" style={{ maxHeight: '80vh', overflowY: 'auto', padding: '20px' }}>
                    {/* Header with add more button */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600' }}>
                            Đã chọn {imagesData.length} {imagesData.length === 1 ? 'ảnh' : 'ảnh'}
                        </h3>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = 'image/*';
                                input.multiple = true;
                                input.onchange = (event) => {
                                    const target = event.target as HTMLInputElement;
                                    if (target.files && target.files.length > 0) {
                                        const newFiles = Array.from(target.files);
                                        setSelectedFiles([...selectedFiles, ...newFiles]);
                                    }
                                };
                                input.click();
                            }}
                            style={{ fontSize: '14px' }}
                        >
                            <Upload size={16} style={{ marginRight: '8px' }} />
                            Thêm ảnh
                        </Button>
                    </div>

                    {/* Grid of images with individual forms */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                        gap: '24px',
                        marginBottom: '24px',
                        alignItems: 'start'
                    }}>
                        {imagesData.map((imgData, index) => (
                            <div key={index} style={{
                                border: '1px solid #e5e5e5',
                                borderRadius: '12px',
                                padding: '16px',
                                backgroundColor: 'white',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                height: 'fit-content',
                                display: 'flex',
                                flexDirection: 'column'
                            }}>
                                {/* Image Preview */}
                                <UploadPreview
                                    imageData={imgData}
                                    index={index}
                                    totalImages={imagesData.length}
                                    onRemove={() => {
                                        const newFiles = selectedFiles.filter((_, i) => i !== index);
                                        setSelectedFiles(newFiles);
                                        setImagesData(prev => prev.filter((_, i) => i !== index));
                                    }}
                                />

                                {/* Form Fields for this image */}
                                <UploadForm
                                    imageData={imgData}
                                    index={index}
                                    categories={categories}
                                    loadingCategories={loadingCategories}
                                    onUpdate={updateImageData}
                                    onUpdateCoordinates={updateImageCoordinates}
                                />
                            </div>
                        ))}
                    </div>

                    {/* Footer with Submit Button */}
                    <div className="upload-modal-footer" style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #e5e5e5', position: 'sticky', bottom: 0, backgroundColor: 'white' }}>
                        <a href="#" className="footer-link"></a>
                        <div className="footer-buttons" style={{ position: 'relative', display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'flex-end', width: '100%' }}>
                            <Button type="button" variant="outline" onClick={handleCancel}>
                                Huỷ
                            </Button>
                            <div
                                style={{
                                    position: 'relative',
                                    display: 'inline-block'
                                }}
                                onMouseEnter={() => {
                                    if (!isFormValid && !loading) {
                                        setShowTooltip(true);
                                    }
                                }}
                                onMouseLeave={() => {
                                    setShowTooltip(false);
                                }}
                            >
                                <Button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={loading || !isFormValid}
                                    style={{ minWidth: '120px' }}
                                >
                                    {loading ? 'Đang tải...' : `Gửi ${imagesData.length} ảnh`}
                                </Button>
                                {showTooltip && !isFormValid && !loading && (
                                    <div style={{
                                        position: 'absolute',
                                        bottom: 'calc(100% + 8px)',
                                        right: 0,
                                        padding: '10px 14px',
                                        backgroundColor: '#1f2937',
                                        color: 'white',
                                        borderRadius: '8px',
                                        fontSize: '13px',
                                        whiteSpace: 'nowrap',
                                        zIndex: 10000,
                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                        pointerEvents: 'none'
                                    }}>
                                        Vui lòng điền đầy đủ các trường có dấu <span style={{ color: '#ef4444', fontWeight: 'bold' }}>*</span>
                                        <div style={{
                                            position: 'absolute',
                                            top: '100%',
                                            right: '20px',
                                            width: 0,
                                            height: 0,
                                            borderLeft: '6px solid transparent',
                                            borderRight: '6px solid transparent',
                                            borderTop: '6px solid #1f2937'
                                        }}></div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default UploadModal;

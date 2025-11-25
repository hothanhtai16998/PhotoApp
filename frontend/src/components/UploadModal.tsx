import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { X, Upload, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
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
        validateImagesWithErrors,
        showSuccess,
        uploadingIndex,
        totalUploads,
        uploadProgress,
        loading,
        handleSubmitAll,
        resetUploadState,
        preUploadAllImages,
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

    // Check if all images have required fields filled AND all are pre-uploaded
    const isFormValid = imagesData.length > 0 &&
        imagesData.every(img =>
            img.title.trim().length > 0 &&
            img.category.trim().length > 0 &&
            img.preUploadData && // Must be pre-uploaded
            !img.isUploading && // Not currently uploading
            !img.uploadError // No upload errors
        );

    // Get upload status for user feedback
    const uploadStatus = {
        total: imagesData.length,
        uploading: imagesData.filter(img => img.isUploading).length,
        uploaded: imagesData.filter(img => img.preUploadData && !img.uploadError).length,
        failed: imagesData.filter(img => img.uploadError).length,
        needsUpload: imagesData.filter(img => !img.preUploadData && !img.isUploading && !img.uploadError).length,
    };

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
                        errors: {},
                        preUploadData: null,
                        uploadProgress: 0,
                        isUploading: false,
                        uploadError: null,
                    };
                });
                return newImagesData;
            });
        } else {
            setImagesData([]);
        }
    }, [selectedFiles]);

    // Track if upload is in progress to prevent duplicate requests
    const uploadInProgressRef = useRef(false);

    // Auto-start pre-upload when imagesData is initialized with files
    useEffect(() => {
        if (imagesData.length > 0 && preUploadAllImages && !uploadInProgressRef.current) {
            // Check if any images need to be uploaded
            const needsUpload = imagesData.some(img => !img.preUploadData && !img.isUploading && !img.uploadError);
            
            if (needsUpload) {
                // Prevent duplicate upload attempts
                uploadInProgressRef.current = true;
                
                // Set isUploading immediately for all images that need upload
                const updatedImagesData = imagesData.map(img => {
                    if (!img.preUploadData && !img.isUploading && !img.uploadError) {
                        return {
                            ...img,
                            isUploading: true,
                            uploadProgress: 0,
                        };
                    }
                    return img;
                });
                
                // Update state first to show overlay immediately
                setImagesData(updatedImagesData);
                
                // Then start pre-uploading
                setTimeout(() => {
                    preUploadAllImages(updatedImagesData, (index, progress) => {
                        // Update progress in real-time
                        setImagesData(prev => {
                            const updated = [...prev];
                            if (updated[index]) {
                                updated[index] = {
                                    ...updated[index], // Preserve all existing fields
                                    uploadProgress: progress,
                                    isUploading: progress < 100, // Update isUploading based on progress
                                };
                            }
                            return updated;
                        });
                    }).then((finalImagesData) => {
                        // Merge upload results with existing form data to preserve user input
                        setImagesData(prev => {
                            return finalImagesData.map((finalImg, index) => {
                                const existingImg = prev[index];
                                if (!existingImg) return finalImg;
                                
                                // Preserve all form fields from existing data (user input takes priority)
                                return {
                                    ...finalImg, // Upload results (preUploadData, uploadProgress, isUploading, uploadError)
                                    // Always preserve form fields from existing data if they exist
                                    title: existingImg.title.trim() ? existingImg.title : finalImg.title,
                                    category: existingImg.category.trim() ? existingImg.category : finalImg.category,
                                    location: existingImg.location.trim() ? existingImg.location : finalImg.location,
                                    coordinates: existingImg.coordinates || finalImg.coordinates,
                                    cameraModel: existingImg.cameraModel.trim() ? existingImg.cameraModel : finalImg.cameraModel,
                                    tags: existingImg.tags && existingImg.tags.length > 0 ? existingImg.tags : finalImg.tags,
                                    errors: existingImg.errors || finalImg.errors,
                                };
                            });
                        });
                        
                        // Check if all uploads succeeded
                        const allSucceeded = finalImagesData.every(img => img.preUploadData && !img.uploadError);
                        if (allSucceeded) {
                            toast.success('Tất cả ảnh đã tải lên thành công! Bạn có thể gửi bây giờ.');
                        } else {
                            const failedCount = finalImagesData.filter(img => img.uploadError).length;
                            if (failedCount > 0) {
                                toast.error(`${failedCount} ảnh tải lên thất bại. Vui lòng thử lại.`);
                            }
                        }
                        }).catch((error) => {
                            console.error('Failed to pre-upload images:', error);
                            toast.error('Lỗi tải ảnh lên. Vui lòng thử lại.');
                        }).finally(() => {
                            // Reset upload flag when done
                            uploadInProgressRef.current = false;
                        });
                }, 50); // Small delay to ensure state update is processed
            } else {
                // No upload needed, reset flag
                uploadInProgressRef.current = false;
            }
        }
    }, [imagesData.length, preUploadAllImages]); // Only trigger when imagesData length changes (new files added)

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
        // Use shared validation function to avoid duplication
        const validatedImages = validateImagesWithErrors(imagesData);
        setImagesData(validatedImages);

        // Check if all images are valid
        if (!validatedImages.every(img => Object.keys(img.errors).length === 0)) {
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
            // Calculate scrollbar width to prevent layout shift
            const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
            const originalPaddingRight = document.body.style.paddingRight;
            
            document.body.style.overflow = 'hidden';
            // Add padding to compensate for scrollbar width to prevent layout shift
            if (scrollbarWidth > 0) {
                document.body.style.paddingRight = `${scrollbarWidth}px`;
            }
            
            return () => {
                document.body.style.overflow = '';
                document.body.style.paddingRight = originalPaddingRight || '';
            };
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

    // Check if any images are currently uploading (pre-upload phase)
    const isPreUploading = imagesData.some(img => img.isUploading === true);
    const preUploadingCount = imagesData.filter(img => img.isUploading === true).length;
    const totalPreUploading = imagesData.length;
    const overallPreUploadProgress = imagesData.length > 0
        ? Math.round(
            imagesData.reduce((sum, img) => sum + (img.uploadProgress || 0), 0) / imagesData.length
          )
        : 0;


    // Progress Screen (finalize phase)
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
                        {/* Upload Status Banner */}
                        {(uploadStatus.uploading > 0 || uploadStatus.needsUpload > 0 || uploadStatus.failed > 0) && (
                            <div style={{
                                marginBottom: '16px',
                                padding: '12px 16px',
                                borderRadius: '8px',
                                backgroundColor: uploadStatus.failed > 0 ? '#fef2f2' : uploadStatus.uploading > 0 ? '#eff6ff' : '#f0fdf4',
                                border: `1px solid ${uploadStatus.failed > 0 ? '#fecaca' : uploadStatus.uploading > 0 ? '#bfdbfe' : '#bbf7d0'}`,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '0.875rem'
                            }}>
                                {uploadStatus.uploading > 0 && (
                                    <>
                                        <div className="spinner-circle" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                                        <span style={{ color: '#1e40af', fontWeight: '500' }}>
                                            Đang tải {uploadStatus.uploading} ảnh lên... ({uploadStatus.uploaded}/{uploadStatus.total})
                                        </span>
                                    </>
                                )}
                                {uploadStatus.needsUpload > 0 && uploadStatus.uploading === 0 && (
                                    <span style={{ color: '#166534', fontWeight: '500' }}>
                                        ⏳ Đang chờ tải {uploadStatus.needsUpload} ảnh lên...
                                    </span>
                                )}
                                {uploadStatus.failed > 0 && (
                                    <span style={{ color: '#991b1b', fontWeight: '500' }}>
                                        ❌ {uploadStatus.failed} ảnh tải lên thất bại. Vui lòng thử lại.
                                    </span>
                                )}
                            </div>
                        )}
                        {uploadStatus.uploaded === uploadStatus.total && uploadStatus.uploading === 0 && uploadStatus.failed === 0 && imagesData.length > 0 && (
                            <div style={{
                                marginBottom: '16px',
                                padding: '12px 16px',
                                borderRadius: '8px',
                                backgroundColor: '#f0fdf4',
                                border: '1px solid #bbf7d0',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '0.875rem',
                                color: '#166534',
                                fontWeight: '500'
                            }}>
                                ✅ Tất cả {uploadStatus.uploaded} ảnh đã tải lên thành công!
                            </div>
                        )}
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
                                {/* Always show status message when button is disabled */}
                                {(!isFormValid || uploadStatus.uploading > 0) && !loading && (
                                    <div style={{
                                        position: 'absolute',
                                        bottom: 'calc(100% + 8px)',
                                        right: 0,
                                        padding: '12px 16px',
                                        backgroundColor: '#1f2937',
                                        color: 'white',
                                        borderRadius: '8px',
                                        fontSize: '0.875rem',
                                        zIndex: 1000,
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                        minWidth: '250px',
                                        maxWidth: '350px'
                                    }}>
                                        {uploadStatus.uploading > 0 && (
                                            <div style={{ marginBottom: '4px' }}>
                                                ⏳ Đang tải {uploadStatus.uploading} ảnh lên... ({uploadStatus.uploaded}/{uploadStatus.total})
                                            </div>
                                        )}
                                        {uploadStatus.needsUpload > 0 && uploadStatus.uploading === 0 && (
                                            <div style={{ marginBottom: '4px' }}>
                                                ⏳ Đang chờ tải {uploadStatus.needsUpload} ảnh lên...
                                            </div>
                                        )}
                                        {uploadStatus.failed > 0 && (
                                            <div style={{ color: '#f87171', marginBottom: '4px' }}>
                                                ❌ {uploadStatus.failed} ảnh tải lên thất bại. Vui lòng thử lại.
                                            </div>
                                        )}
                                        {uploadStatus.uploaded === uploadStatus.total && uploadStatus.uploading === 0 && uploadStatus.failed === 0 && (
                                            <div style={{ color: '#86efac', marginBottom: '4px' }}>
                                                ✅ Tất cả ảnh đã tải lên thành công!
                                            </div>
                                        )}
                                        {imagesData.some(img => !img.title.trim()) && (
                                            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                                                📝 Vui lòng điền tiêu đề cho tất cả ảnh
                                            </div>
                                        )}
                                        {imagesData.some(img => !img.category.trim()) && (
                                            <div style={{ marginTop: '4px' }}>
                                                📁 Vui lòng chọn danh mục cho tất cả ảnh
                                            </div>
                                        )}
                                    </div>
                                )}
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

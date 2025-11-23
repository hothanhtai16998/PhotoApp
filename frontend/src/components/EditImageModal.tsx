import { useState, useEffect, useCallback } from 'react';
import { X, MapPin, Camera, Image as ImageIcon } from 'lucide-react';
import type { Image } from '@/types/image';
import { imageService } from '@/services/imageService';
import { useAuthStore } from '@/stores/useAuthStore';
import { toast } from 'sonner';
import { ImageEditor } from './image/ImageEditor';
import { TagInput } from './ui/TagInput';
import './EditImageModal.css';

interface EditImageModalProps {
  image: Image;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedImage: Image) => void;
}

function EditImageModal({ image, isOpen, onClose, onUpdate }: EditImageModalProps) {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'details' | 'tags' | 'exif' | 'edit'>('details');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEditor, setShowEditor] = useState(false);

  // Form state
  const [imageTitle, setImageTitle] = useState(image.imageTitle || '');
  const [location, setLocation] = useState(image.location || '');
  const [cameraModel, setCameraModel] = useState(image.cameraModel || '');
  const [tags, setTags] = useState<string[]>(image.tags || []);
  const [description, setDescription] = useState(''); // Placeholder for future description field

  // Reset form when image changes or modal opens
  useEffect(() => {
    if (isOpen && image) {
      setImageTitle(image.imageTitle || '');
      setLocation(image.location || '');
      setCameraModel(image.cameraModel || '');
      setTags(image.tags || []);
      setDescription('');
    }
  }, [isOpen, image]);

  // Check if user can edit (owner or admin)
  const canEdit = user && (
    user._id === image.uploadedBy._id ||
    user.isAdmin ||
    user.isSuperAdmin
  );

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canEdit) {
      toast.error('Bạn không có quyền chỉnh sửa ảnh này');
      return;
    }

    setIsSubmitting(true);
    try {
      const updatedImage = await imageService.updateImage(image._id, {
        imageTitle: imageTitle.trim(),
        location: location.trim() || undefined,
        cameraModel: cameraModel.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
      });

      toast.success('Cập nhật thông tin ảnh thành công');
      onUpdate(updatedImage);
      onClose();
    } catch (error) {
      console.error('Failed to update image:', error);
      const errorMessage =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Cập nhật thông tin ảnh thất bại';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [image._id, imageTitle, location, cameraModel, tags, canEdit, onUpdate, onClose]);

  // Handle saving edited image
  const handleSaveEditedImage = useCallback(async (editedImageBlob: Blob) => {
    if (!canEdit) {
      toast.error('Bạn không có quyền chỉnh sửa ảnh này');
      return;
    }

    setIsSubmitting(true);
    try {
      // Convert blob to File
      const editedFile = new File([editedImageBlob], `${image.imageTitle || 'image'}.jpg`, {
        type: 'image/jpeg',
      });

      // Upload edited image
      const updatedImage = await imageService.updateImageWithFile(image._id, editedFile);

      toast.success('Cập nhật ảnh đã chỉnh sửa thành công');
      onUpdate(updatedImage);
      setShowEditor(false);
      onClose();
    } catch (error) {
      console.error('Failed to save edited image:', error);
      const errorMessage =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Lưu ảnh đã chỉnh sửa thất bại';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }, [image._id, image.imageTitle, canEdit, onUpdate, onClose]);

  if (!isOpen) return null;

  // Show image editor in full screen
  if (showEditor) {
    return (
      <div className="edit-image-modal-overlay">
        <div className="edit-image-modal edit-image-modal-fullscreen" onClick={(e) => e.stopPropagation()}>
          <ImageEditor
            imageUrl={image.imageUrl || image.regularUrl || image.smallUrl || ''}
            imageTitle={image.imageTitle || ''}
            onSave={handleSaveEditedImage}
            onCancel={() => setShowEditor(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="edit-image-modal-overlay" onClick={onClose}>
      <div className="edit-image-modal" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="edit-modal-header">
          <h2>Sửa ảnh</h2>
          <button className="edit-modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="edit-modal-tabs">
          <button
            className={`edit-modal-tab ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            Chi tiết
          </button>
          <button
            className={`edit-modal-tab ${activeTab === 'tags' ? 'active' : ''}`}
            onClick={() => setActiveTab('tags')}
          >
            Tags
          </button>
          <button
            className={`edit-modal-tab ${activeTab === 'exif' ? 'active' : ''}`}
            onClick={() => setActiveTab('exif')}
          >
            Exif
          </button>
          <button
            className={`edit-modal-tab ${activeTab === 'edit' ? 'active' : ''}`}
            onClick={() => setShowEditor(true)}
          >
            <ImageIcon size={16} />
            Chỉnh sửa ảnh
          </button>
        </div>

        {/* Tab Content */}
        <form className="edit-modal-content" onSubmit={handleSubmit}>
          {activeTab === 'details' && (
            <div className="edit-modal-tab-panel">
              <div className="edit-form-group">
                <label htmlFor="description">Mô tả</label>
                <textarea
                  id="description"
                  className="edit-form-textarea"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a description"
                  maxLength={600}
                  rows={4}
                />
                <div className="edit-form-char-count">{description.length}/600</div>
              </div>

              <div className="edit-form-group">
                <label htmlFor="title">Tiêu đề</label>
                <input
                  id="title"
                  type="text"
                  className="edit-form-input"
                  value={imageTitle}
                  onChange={(e) => setImageTitle(e.target.value)}
                  placeholder="Image title"
                  required
                  maxLength={200}
                />
              </div>

              <div className="edit-form-group">
                <label htmlFor="location">
                  <MapPin size={16} />
                  Địa điểm
                </label>
                <input
                  id="location"
                  type="text"
                  className="edit-form-input"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Add location"
                  maxLength={200}
                />
                {location && (
                  <button
                    type="button"
                    className="edit-form-clear"
                    onClick={() => setLocation('')}
                    aria-label="Clear location"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'exif' && (
            <div className="edit-modal-tab-panel">
              <div className="edit-form-group">
                <label htmlFor="camera">
                  <Camera size={16} />
                  Camera
                </label>
                <input
                  id="camera"
                  type="text"
                  className="edit-form-input"
                  value={cameraModel}
                  onChange={(e) => setCameraModel(e.target.value)}
                  placeholder="Camera model"
                  maxLength={100}
                />
              </div>
            </div>
          )}

          {activeTab === 'tags' && (
            <div className="edit-modal-tab-panel">
              <TagInput
                tags={tags}
                onChange={setTags}
                placeholder="Nhập tag và nhấn Enter (ví dụ: nature, landscape, sunset)..."
                maxTags={20}
                maxTagLength={50}
              />
            </div>
          )}


          {/* Form Actions */}
          <div className="edit-modal-actions">
            <button
              type="button"
              className="edit-modal-btn edit-modal-btn-cancel"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Huỷ
            </button>
            <button
              type="submit"
              className="edit-modal-btn edit-modal-btn-submit"
              disabled={isSubmitting || !canEdit}
            >
              {isSubmitting ? 'Đang cập nhật...' : 'Cập nhật'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditImageModal;


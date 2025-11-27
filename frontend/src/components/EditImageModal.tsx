import { useState } from 'react';
import { X, MapPin, Camera, HelpCircle } from 'lucide-react';
import type { Image } from '@/types/image';
import { ImageEditor } from './image/ImageEditor';
import { TagInput } from './ui/TagInput';
import { EditImageTabs } from './image/EditImageTabs';
import { useEditImageForm } from './image/hooks/useEditImageForm';
import './EditImageModal.css';

interface EditImageModalProps {
  image: Image;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (updatedImage: Image) => void;
}

function EditImageModal({ image, isOpen, onClose, onUpdate }: EditImageModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'tags' | 'exif' | 'edit'>('details');

  const {
    isSubmitting,
    showEditor,
    setShowEditor,
    imageTitle,
    setImageTitle,
    location,
    setLocation,
    cameraModel,
    setCameraModel,
    cameraMake,
    setCameraMake,
    focalLength,
    setFocalLength,
    aperture,
    setAperture,
    shutterSpeed,
    setShutterSpeed,
    iso,
    setIso,
    tags,
    setTags,
    description,
    setDescription,
    canEdit,
    handleSubmit,
    handleSaveEditedImage,
  } = useEditImageForm({ image, isOpen, onUpdate, onClose });

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
          <button className="edit-modal-close" onClick={onClose} aria-label="Đóng">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <EditImageTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onEditClick={() => setShowEditor(true)}
        />

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
                  placeholder="Thêm mô tả"
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Camera Make */}
                <div className="edit-form-group">
                  <label htmlFor="cameraMake" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Camera size={16} />
                    Hãng máy ảnh
                    <div className="tooltip-wrapper">
                      <HelpCircle size={14} className="tooltip-icon" />
                      <span className="tooltip-text">
                        Tên hãng sản xuất máy ảnh (ví dụ: Canon, Nikon, Sony, iPhone)
                      </span>
                    </div>
                  </label>
                  <input
                    id="cameraMake"
                    type="text"
                    className="edit-form-input"
                    value={cameraMake}
                    onChange={(e) => setCameraMake(e.target.value)}
                    placeholder="Ví dụ: Canon, Nikon, Sony"
                    maxLength={50}
                  />
                </div>

                {/* Camera Model */}
                <div className="edit-form-group">
                  <label htmlFor="cameraModel" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Camera size={16} />
                    Model máy ảnh
                    <div className="tooltip-wrapper">
                      <HelpCircle size={14} className="tooltip-icon" />
                      <span className="tooltip-text">
                        Tên model máy ảnh (ví dụ: Canon EOS 7D, iPhone X, Sony A7 III)
                      </span>
                    </div>
                  </label>
                  <input
                    id="cameraModel"
                    type="text"
                    className="edit-form-input"
                    value={cameraModel}
                    onChange={(e) => setCameraModel(e.target.value)}
                    placeholder="Ví dụ: Canon EOS 7D"
                    maxLength={100}
                  />
                </div>

                {/* Focal Length */}
                <div className="edit-form-group">
                  <label htmlFor="focalLength" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Tiêu cự (mm)
                    <div className="tooltip-wrapper">
                      <HelpCircle size={14} className="tooltip-icon" />
                      <span className="tooltip-text">
                        Độ dài tiêu cự của ống kính (tính bằng mm). Số càng nhỏ = góc rộng hơn, số càng lớn = zoom xa hơn. Ví dụ: 24mm (góc rộng), 50mm (bình thường), 200mm (tele)
                      </span>
                    </div>
                  </label>
                  <input
                    id="focalLength"
                    type="number"
                    step="0.1"
                    min="0"
                    className="edit-form-input"
                    value={focalLength}
                    onChange={(e) => setFocalLength(e.target.value)}
                    placeholder="Ví dụ: 60.0"
                  />
                </div>

                {/* Aperture */}
                <div className="edit-form-group">
                  <label htmlFor="aperture" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Khẩu độ (f)
                    <div className="tooltip-wrapper">
                      <HelpCircle size={14} className="tooltip-icon" />
                      <span className="tooltip-text">
                        Độ mở của ống kính (f-stop). Số càng nhỏ = mở rộng hơn = xóa phông nhiều hơn. Số càng lớn = mở hẹp hơn = ảnh sắc nét hơn. Ví dụ: f/1.8 (mở rộng), f/9.0 (mở hẹp)
                      </span>
                    </div>
                  </label>
                  <input
                    id="aperture"
                    type="number"
                    step="0.1"
                    min="0"
                    className="edit-form-input"
                    value={aperture}
                    onChange={(e) => setAperture(e.target.value)}
                    placeholder="Ví dụ: 9.0"
                  />
                </div>

                {/* Shutter Speed */}
                <div className="edit-form-group">
                  <label htmlFor="shutterSpeed" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    Tốc độ màn trập (s)
                    <div className="tooltip-wrapper">
                      <HelpCircle size={14} className="tooltip-icon" />
                      <span className="tooltip-text">
                        Thời gian màn trập mở (tính bằng giây). Nhanh (1/1000) = đóng băng chuyển động. Chậm (1/30) = làm mờ chuyển động. Ví dụ: 1/80 (nhanh), 2s (chậm)
                      </span>
                    </div>
                  </label>
                  <input
                    id="shutterSpeed"
                    type="text"
                    className="edit-form-input"
                    value={shutterSpeed}
                    onChange={(e) => setShutterSpeed(e.target.value)}
                    placeholder="Ví dụ: 1/80 hoặc 2s"
                    maxLength={20}
                  />
                </div>

                {/* ISO */}
                <div className="edit-form-group">
                  <label htmlFor="iso" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    ISO
                    <div className="tooltip-wrapper">
                      <HelpCircle size={14} className="tooltip-icon" />
                      <span className="tooltip-text">
                        Độ nhạy sáng của cảm biến. Số thấp (100-400) = ảnh sạch, ít nhiễu. Số cao (1600+) = ảnh sáng hơn nhưng nhiều nhiễu hơn. Ví dụ: 100 (thấp), 800 (trung bình), 3200 (cao)
                      </span>
                    </div>
                  </label>
                  <input
                    id="iso"
                    type="number"
                    min="0"
                    className="edit-form-input"
                    value={iso}
                    onChange={(e) => setIso(e.target.value)}
                    placeholder="Ví dụ: 100"
                  />
                </div>
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

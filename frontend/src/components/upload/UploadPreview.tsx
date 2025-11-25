import { X } from 'lucide-react';
import type { ImageData } from './hooks/useImageUpload';
import './UploadPreview.css';

interface UploadPreviewProps {
  imageData: ImageData;
  index: number;
  totalImages: number;
  onRemove: () => void;
}

export const UploadPreview = ({ imageData, index, totalImages, onRemove }: UploadPreviewProps) => {
  const isUploading = imageData.isUploading || false;
  const uploadProgress = imageData.uploadProgress || 0;
  const uploadError = imageData.uploadError;
  const isUploaded = imageData.preUploadData && !uploadError;

  return (
    <div style={{ position: 'relative', marginBottom: '16px' }}>
      <img
        src={URL.createObjectURL(imageData.file)}
        alt={`Preview ${index + 1}`}
        style={{
          width: '100%',
          height: 'auto', // Preserve aspect ratio
          maxHeight: '500px', // Limit max height for very tall images
          objectFit: 'contain', // Show full image without cropping
          borderRadius: '8px',
          border: '1px solid #e5e5e5',
          display: 'block',
          opacity: isUploading ? 0.6 : 1,
          transition: 'opacity 0.3s ease'
        }}
      />
      {/* Upload Progress Indicator on Image */}
      {isUploading && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '8px',
          fontSize: '14px',
          fontWeight: '600',
          zIndex: 10
        }}>
          {uploadProgress}%
        </div>
      )}
      {/* Success Indicator - Show after upload completes */}
      {isUploaded && !isUploading && (
        <div style={{
          position: 'absolute',
          top: '8px',
          left: '8px',
          background: '#10b981',
          color: 'white',
          padding: '6px 12px',
          borderRadius: '6px',
          fontSize: '13px',
          fontWeight: '600',
          zIndex: 100,
          pointerEvents: 'none',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
          animation: 'fadeIn 0.3s ease'
        }}>
          ✓ Đã tải lên
        </div>
      )}
      {/* Error Indicator */}
      {uploadError && (
        <div style={{
          position: 'absolute',
          top: '8px',
          left: '8px',
          background: '#dc2626',
          color: 'white',
          padding: '4px 10px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: '600',
          zIndex: 100,
          pointerEvents: 'none'
        }}>
          ✗ Lỗi
        </div>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          background: 'rgba(0, 0, 0, 0.7)',
          border: 'none',
          borderRadius: '50%',
          width: '28px',
          height: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: 'white'
        }}
      >
        <X size={16} />
      </button>
      <div style={{
        position: 'absolute',
        bottom: '8px',
        left: '8px',
        background: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '4px 10px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: '600'
      }}>
        {index + 1} / {totalImages}
      </div>
    </div>
  );
};


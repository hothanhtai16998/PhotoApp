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
  const isUploading = imageData.isUploading === true; // Explicitly check for true
  const uploadProgress = imageData.uploadProgress || 0;
  const uploadError = imageData.uploadError;
  const hasPreUploadData = !!imageData.preUploadData; // Upload is complete when we have this
  const isUploaded = hasPreUploadData && !uploadError && !isUploading;

  // Overlay should show when:
  // 1. isUploading is true, OR
  // 2. We don't have preUploadData yet (upload not complete)
  // This ensures overlay stays until upload is truly successful
  const showOverlay = isUploading || (!hasPreUploadData && !uploadError);

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
          transition: 'opacity 0.3s ease'
        }}
      />
      {/* Simple Upload Overlay - Just a dark overlay with progress, no modal */}
      {showOverlay && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          pointerEvents: 'none',
          animation: 'fadeIn 0.2s ease'
        }}>
          {/* Progress Bar */}
          <div style={{
            width: '80%',
            maxWidth: '300px',
            height: '4px',
            background: 'rgba(255, 255, 255, 0.3)',
            borderRadius: '2px',
            overflow: 'hidden',
            marginBottom: '12px'
          }}>
            <div style={{
              width: `${Math.min(100, Math.max(0, uploadProgress))}%`,
              height: '100%',
              background: '#fff',
              borderRadius: '2px',
              transition: 'width 0.2s ease',
              willChange: 'width'
            }}></div>
          </div>
          {/* Percentage */}
          <p style={{
            fontSize: '1rem',
            fontWeight: '600',
            color: '#fff',
            margin: 0,
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
          }}>
            {Math.min(100, Math.max(0, uploadProgress))}%
          </p>
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


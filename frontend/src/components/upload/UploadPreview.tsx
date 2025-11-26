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
  const isUploading = imageData.isUploading === true;
  const uploadProgress = imageData.uploadProgress || 0;
  const uploadError = imageData.uploadError;
  const hasPreUploadData = !!imageData.preUploadData;
  const isUploaded = hasPreUploadData && !uploadError && !isUploading;

  // Simple overlay - show when uploading or before upload completes
  const showOverlay = isUploading || (!hasPreUploadData && !uploadError);

  return (
    <div style={{ position: 'relative', marginBottom: '16px' }}>
      <div style={{ position: 'relative', display: 'block', width: '100%' }}>
        <img
          src={URL.createObjectURL(imageData.file)}
          alt={`Preview ${index + 1}`}
          style={{
            width: '100%',
            height: 'auto',
            maxHeight: '500px',
            objectFit: 'contain',
            borderRadius: '8px',
            border: '1px solid #e5e5e5',
            display: 'block',
            transition: 'opacity 0.3s ease'
          }}
        />
        {/* Simple Overlay - shows during upload */}
        {showOverlay && (
          <>
            <div 
              className="image-upload-overlay"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.7)',
                backdropFilter: 'blur(4px)',
                borderRadius: '8px',
                zIndex: 10,
                pointerEvents: 'none',
                animation: 'fadeIn 0.2s ease'
              }}
            />
            {/* Scrolling Loader - above overlay */}
            <div 
              className="upload-loader-container"
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 20,
                pointerEvents: 'none'
              }}
            >
              <div className="loader">
                <div className="text"><span>Loading</span></div>
                <div className="text"><span>Loading</span></div>
                <div className="text"><span>Loading</span></div>
                <div className="text"><span>Loading</span></div>
                <div className="text"><span>Loading</span></div>
                <div className="text"><span>Loading</span></div>
                <div className="text"><span>Loading</span></div>
                <div className="text"><span>Loading</span></div>
                <div className="text"><span>Loading</span></div>
                <div className="line"></div>
              </div>
            </div>
          </>
        )}
      </div>
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

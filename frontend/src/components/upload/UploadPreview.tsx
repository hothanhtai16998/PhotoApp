import { X } from 'lucide-react';
import type { ImageData } from './hooks/useImageUpload';

interface UploadPreviewProps {
  imageData: ImageData;
  index: number;
  totalImages: number;
  onRemove: () => void;
}

export const UploadPreview = ({ imageData, index, totalImages, onRemove }: UploadPreviewProps) => {
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
          display: 'block'
        }}
      />
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


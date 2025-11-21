import { useState, useRef, useEffect, memo } from 'react';
import { Info } from 'lucide-react';
import { ImageModalChart } from './ImageModalChart';
import type { Image } from '@/types/image';

interface ImageModalInfoProps {
  image: Image;
}

export const ImageModalInfo = memo(({ image }: ImageModalInfoProps) => {
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'views' | 'downloads'>('views');
  const infoButtonRef = useRef<HTMLButtonElement>(null);

  // Close info modal when clicking outside
  useEffect(() => {
    if (!showInfoModal) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        infoButtonRef.current &&
        !infoButtonRef.current.contains(target) &&
        !target.closest('.info-modal')
      ) {
        setShowInfoModal(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showInfoModal]);

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={infoButtonRef}
        className={`modal-footer-btn ${showInfoModal ? 'active' : ''}`}
        onClick={() => setShowInfoModal(!showInfoModal)}
      >
        <Info size={18} />
        <span>Thông tin</span>
      </button>
      {/* Info Modal */}
      {showInfoModal && (
        <div className="info-modal-wrapper">
          <div className="info-modal">
            <div className="info-modal-header">
              <h2 className="info-modal-title">Thông tin</h2>
              <button
                className="info-modal-close"
                onClick={() => setShowInfoModal(false)}
                aria-label="Close info modal"
              >
                ×
              </button>
            </div>
            <div className="info-modal-content">
              <div className="info-published">
                Đã đăng vào {(() => {
                  const daysAgo = Math.floor((Date.now() - new Date(image.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                  if (daysAgo === 0) return 'hôm nay';
                  if (daysAgo === 1) return '1 ngày trước';
                  return `${daysAgo} ngày trước`;
                })()}
              </div>

              {/* Chart Container */}
              <ImageModalChart image={image} activeTab={activeTab} />

              {/* Tabs */}
              <div className="info-tabs">
                <button
                  className={`info-tab ${activeTab === 'views' ? 'active' : ''}`}
                  onClick={() => setActiveTab('views')}
                >
                  Lượt xem
                </button>
                <button
                  className={`info-tab ${activeTab === 'downloads' ? 'active' : ''}`}
                  onClick={() => setActiveTab('downloads')}
                >
                  Lượt tải
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

ImageModalInfo.displayName = 'ImageModalInfo';


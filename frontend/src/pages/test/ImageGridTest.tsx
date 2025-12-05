import { useState, useCallback, useMemo } from 'react';
import MasonryGrid from '@/components/MasonryGrid';
import type { Image } from '@/types/image';
import { Skeleton } from '@/components/ui/skeleton';
import { downloadImage, type DownloadSize } from '@/utils/downloadService';
import { toast } from 'sonner';
import TestImageModal from './TestImageModal';
import './ImageGridTest.css';

// Mock data for testing
const generateMockImages = (count: number): Image[] => {
  const orientations: ('portrait' | 'landscape' | 'square')[] = ['portrait', 'landscape', 'square'];
  const categories = ['nature', 'urban', 'portrait', 'abstract', 'travel'];
  const mockImages: Image[] = [];

  for (let i = 0; i < count; i++) {
    const orientation = orientations[i % orientations.length];
    const width = orientation === 'portrait' ? 400 : orientation === 'landscape' ? 800 : 600;
    const height = orientation === 'portrait' ? 600 : orientation === 'landscape' ? 450 : 600;

    mockImages.push({
      _id: `test-image-${i}`,
      imageUrl: `https://picsum.photos/id/${100 + i}/${width}/${height}`,
      smallUrl: `https://picsum.photos/id/${100 + i}/${Math.floor(width / 2)}/${Math.floor(height / 2)}`,
      thumbnailUrl: `https://picsum.photos/id/${100 + i}/${Math.floor(width / 4)}/${Math.floor(height / 4)}`,
      regularUrl: `https://picsum.photos/id/${100 + i}/${width}/${height}`,
      imageTitle: `Test Image ${i + 1} - ${orientation}`,
      description: `This is a ${orientation} test image for grid testing`,
      width,
      height,
      downloads: Math.floor(Math.random() * 1000),
      views: Math.floor(Math.random() * 5000),
      tags: ['test', orientation, 'demo'] as string[],
      createdAt: new Date(Date.now() - Math.random() * 10000000000).toISOString(),
      updatedAt: new Date().toISOString(),
      uploadedBy: {
        _id: `user-${i % 5}`,
        displayName: `Test User ${i % 5 + 1}`,
        username: `testuser${i % 5 + 1}`,
        bio: 'Test photographer',
        avatarUrl: `https://i.pravatar.cc/150?img=${i % 5 + 1}`,
        email: `test${i % 5 + 1}@example.com`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      imageCategory: categories[i % categories.length] as string,
    });
  }

  return mockImages;
};

const ImageGridTest = () => {
  const [images] = useState<Image[]>(() => generateMockImages(30));
  const [columnCount, setColumnCount] = useState(3);
  const [gap, setGap] = useState(24);
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  const [modalImage, setModalImage] = useState<Image | null>(null);

  const handleImageClick = useCallback((image: Image) => {
    setModalImage(image);
    setSelectedImage(image);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalImage(null);
  }, []);

  const handleModalNavigate = useCallback((image: Image) => {
    setModalImage(image);
    setSelectedImage(image);
  }, []);

  const handleDownload = useCallback(async (image: Image, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      toast.success(`Downloading: ${image.imageTitle}`);
      // In real implementation, would use downloadImage service
    } catch (_error) {
      toast.error('Download failed');
    }
  }, []);

  const handleDownloadWithSize = useCallback(async (image: Image, size: DownloadSize) => {
    try {
      await downloadImage(image, size);
      toast.success(`Downloaded ${size} version of ${image.imageTitle}`);
    } catch (_error) {
      toast.error('Download failed');
    }
  }, []);

  const handleAddToCollection = useCallback((image: Image, e: React.MouseEvent) => {
    e.stopPropagation();
    toast.success(`Added to collection: ${image.imageTitle}`);
  }, []);

  const stats = useMemo(() => {
    const portraitCount = images.filter(img => img.height > img.width).length;
    const landscapeCount = images.filter(img => img.width > img.height).length;
    const squareCount = images.filter(img => img.width === img.height).length;
    
    return {
      total: images.length,
      portrait: portraitCount,
      landscape: landscapeCount,
      square: squareCount,
    };
  }, [images]);

  return (
    <div className="image-grid-test">
      <div className="test-header">
        <h1>Image Grid Test Page</h1>
        <p>Test the masonry grid layout with various configurations</p>
      </div>

      {/* Controls Panel */}
      <div className="test-controls">
        <div className="control-group">
          <label>
            <span>Columns: {columnCount}</span>
            <input
              type="range"
              min="1"
              max="6"
              value={columnCount}
              onChange={(e) => setColumnCount(Number(e.target.value))}
            />
          </label>
        </div>

        <div className="control-group">
          <label>
            <span>Gap: {gap}px</span>
            <input
              type="range"
              min="0"
              max="48"
              step="4"
              value={gap}
              onChange={(e) => setGap(Number(e.target.value))}
            />
          </label>
        </div>

        <div className="control-group">
          <button 
            className="test-button"
            onClick={() => setLoading(!loading)}
          >
            Toggle Loading State
          </button>
        </div>

        <div className="control-group">
          <button 
            className="test-button secondary"
            onClick={() => window.location.reload()}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Stats Panel */}
      <div className="test-stats">
        <div className="stat-item">
          <span className="stat-label">Total Images:</span>
          <span className="stat-value">{stats.total}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Portrait:</span>
          <span className="stat-value">{stats.portrait}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Landscape:</span>
          <span className="stat-value">{stats.landscape}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Square:</span>
          <span className="stat-value">{stats.square}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Columns:</span>
          <span className="stat-value">{columnCount}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Gap:</span>
          <span className="stat-value">{gap}px</span>
        </div>
      </div>

      {/* Selected Image Info */}
      {selectedImage && (
        <div className="selected-image-info">
          <h3>Selected Image</h3>
          <div className="selected-details">
            <p><strong>Title:</strong> {selectedImage.imageTitle}</p>
            <p><strong>Dimensions:</strong> {selectedImage.width} × {selectedImage.height}</p>
            <p><strong>Type:</strong> {
              selectedImage.height > selectedImage.width ? 'Portrait' :
              selectedImage.width > selectedImage.height ? 'Landscape' :
              'Square'
            }</p>
            <button 
              className="test-button secondary"
              onClick={() => setSelectedImage(null)}
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Grid Container */}
      <div className="test-grid-container">
        <h2>Masonry Grid</h2>
        
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
            {Array.from({ length: columnCount * 3 }).map((_, i) => (
              <Skeleton key={i} className="w-full h-64" />
            ))}
          </div>
        ) : (
          <MasonryGrid
            images={images}
            columnCount={columnCount}
            gap={gap}
            onImageClick={handleImageClick}
            onDownload={handleDownload}
            onDownloadWithSize={handleDownloadWithSize}
            onAddToCollection={handleAddToCollection}
          />
        )}
      </div>

      {/* Test Instructions */}
      <div className="test-instructions">
        <h3>Test Instructions</h3>
        <ul>
          <li>Adjust the number of columns using the slider (1-6 columns)</li>
          <li>Adjust the gap between images (0-48px)</li>
          <li>Click on any image to open it in a modal view</li>
          <li>Navigate between images using arrow keys or buttons in modal</li>
          <li>Hover over images to see overlay actions</li>
          <li>Test download and collection features from grid or modal</li>
          <li>Toggle loading state to see skeleton placeholders</li>
          <li>Resize your browser window to test responsive behavior</li>
          <li>Check how portrait, landscape, and square images are laid out</li>
          <li>Press ESC or click outside modal to close it</li>
        </ul>
      </div>

      {/* Features Tested */}
      <div className="test-features">
        <h3>Features Being Tested</h3>
        <div className="feature-grid">
          <div className="feature-item">
            <h4>✅ Masonry Layout</h4>
            <p>CSS Grid-based masonry with dynamic columns</p>
          </div>
          <div className="feature-item">
            <h4>✅ Responsive Design</h4>
            <p>Adapts to screen size and column count</p>
          </div>
          <div className="feature-item">
            <h4>✅ Image Orientations</h4>
            <p>Portrait, landscape, and square images</p>
          </div>
          <div className="feature-item">
            <h4>✅ Image Loading</h4>
            <p>Progressive loading with placeholders</p>
          </div>
          <div className="feature-item">
            <h4>✅ Hover Effects</h4>
            <p>Overlay with actions on hover</p>
          </div>
          <div className="feature-item">
            <h4>✅ Click Handlers</h4>
            <p>Image selection and modal interaction</p>
          </div>
          <div className="feature-item">
            <h4>✅ Image Modal</h4>
            <p>Full-screen image viewer with navigation</p>
          </div>
          <div className="feature-item">
            <h4>✅ Download Feature</h4>
            <p>Multiple size options for download</p>
          </div>
          <div className="feature-item">
            <h4>✅ Collections</h4>
            <p>Add images to collections</p>
          </div>
          <div className="feature-item">
            <h4>✅ Keyboard Navigation</h4>
            <p>Arrow keys to navigate, ESC to close modal</p>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {modalImage && (
        <TestImageModal
          image={modalImage}
          images={images}
          onClose={handleCloseModal}
          onNavigate={handleModalNavigate}
        />
      )}
    </div>
  );
};

export default ImageGridTest;

import React from 'react';
import { useMasonry } from '../hooks/useMasonry';
import type { Image } from '../types/image';
import './MasonryGrid.css';
import ProgressiveImage from './ProgressiveImage';
import { Heart, Download, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

interface MasonryGridProps {
    images: Image[];
    columnCount?: number;
    gap?: number;
    onImageClick?: (image: Image) => void;
}

const MasonryGrid: React.FC<MasonryGridProps> = ({
    images,
    columnCount = 3,
    gap = 24,
    onImageClick = () => { },
}) => {
    const columns = useMasonry(images, columnCount, gap);

    const handleOverlayClick = (e: React.MouseEvent) => {
        e.stopPropagation();
    };

    return (
        <div className="masonry-grid" style={{ gap: `${gap}px` }}>
            {columns.map((column, colIndex) => (
                <div key={colIndex} className="masonry-column" style={{ gap: `${gap}px` }}>
                    {column.map((image) => {
                        return (
                            <div
                                key={image._id}
                                className="masonry-item"
                                onClick={() => onImageClick(image)}
                            >
                                <ProgressiveImage
                                    src={image.imageUrl}
                                    smallUrl={image.smallUrl}
                                    thumbnailUrl={image.thumbnailUrl}
                                    regularUrl={image.regularUrl}
                                    imageAvifUrl={image.imageAvifUrl}
                                    smallAvifUrl={image.smallAvifUrl}
                                    thumbnailAvifUrl={image.thumbnailAvifUrl}
                                    regularAvifUrl={image.regularAvifUrl}
                                    alt={image.title || 'image'}
                                    eager={false}
                                    className="progressive-image"
                                />
                                <div className="image-card-overlay" onClick={handleOverlayClick}>
                                    <div className="overlay-top">
                                        <div /> {/* For spacing */}
                                        <div className="overlay-actions">
                                            <button aria-label="Add to collection">
                                                <Plus size={16} className="text-gray-700" />
                                            </button>
                                            <button aria-label="Download image">
                                                <Download size={16} className="text-gray-700" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="overlay-bottom">
                                        {image.uploadedBy && (
                                            <Link to={`/profile/${image.uploadedBy.username}`} className="user-info">
                                                <img
                                                    src={image.uploadedBy.avatarUrl || '/default-avatar.png'}
                                                    alt={image.uploadedBy.username}
                                                />
                                                <span>{image.uploadedBy.username}</span>
                                            </Link>
                                        )}
                                        <div className="overlay-actions">
                                            <button aria-label="Like image">
                                                <Heart size={16} className="text-gray-700" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
};

export default MasonryGrid;
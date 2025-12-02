import React from 'react';
import { useMasonry } from '../hooks/useMasonry';
import type { Image } from '../types/image';
import './MasonryGrid.css';
import ProgressiveImage from './ProgressiveImage';

interface MasonryGridProps {
    images: Image[];
    columnCount?: number;
    gap?: number;
}

const MasonryGrid: React.FC<MasonryGridProps> = ({
    images,
    columnCount = 3,
    gap = 24,
}) => {
    const columns = useMasonry(images, columnCount, gap);

    return (
        <div className="masonry-grid" style={{ gap: `${gap}px` }}>
            {columns.map((column, colIndex) => (
                <div key={colIndex} className="masonry-column" style={{ gap: `${gap}px` }}>
                    {column.map((image) => {
                        const isPortrait = image.height > image.width;
                        return (
                            <div
                                key={image._id}
                                className={`masonry-item ${isPortrait ? 'portrait' : ''}`}
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
                                />
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
    );
};

export default MasonryGrid;
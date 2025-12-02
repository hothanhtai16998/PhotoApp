
import React, { useState, useEffect } from 'react';
import type { Image } from '../types/image';
import ProgressiveImage from './ProgressiveImage';
import './MasonryGrid.css';
import { masonryConfig } from '../config/masonry.config';

interface MasonryGridProps {
    images: Image[];
    columnWidth?: number;
    onImageClick?: (image: Image) => void;
}

interface ImageWithDimensions extends Image {
    width: number;
    height: number;
}

const getColumnCount = () => {
    if (typeof window === 'undefined') return 3;
    const width = window.innerWidth;
    if (width >= 1024) return 3;
    if (width >= 768) return 2;
    return 1;
};

const MasonryGrid: React.FC<MasonryGridProps> = ({ images, columnWidth = 400, onImageClick }) => {
    const [columnCount, setColumnCount] = useState(getColumnCount());
    const [imagesWithDims, setImagesWithDims] = useState<ImageWithDimensions[]>([]);

    useEffect(() => {
        const handleResize = () => {
            setColumnCount(getColumnCount());
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const fetchDimensions = async () => {
            const newImagesWithDims = await Promise.all(
                images.map(image => new Promise<ImageWithDimensions>((resolve) => {
                    const img = new window.Image();
                    img.src = image.imageUrl;
                    img.onload = () => {
                        resolve({ ...image, width: img.width, height: img.height });
                    };
                    img.onerror = () => {
                        // Fallback for failed loads: default to a 1:1 aspect ratio
                        resolve({ ...image, width: 1, height: 1 });
                    };
                }))
            );
            setImagesWithDims(newImagesWithDims);
        };

        if (images.length > 0) {
            fetchDimensions();
        }
    }, [images]);

    if (imagesWithDims.length === 0) {
        return <div className="text-center">Loading images...</div>;
    }

    const columns: ImageWithDimensions[][] = Array.from({ length: columnCount }, () => []);
    const columnHeights: number[] = Array(columnCount).fill(0);

    imagesWithDims.forEach((image) => {
        const shortestColumnIndex = columnHeights.indexOf(Math.min(...columnHeights));

        // Guard against potential edge cases where no column is found
        if (shortestColumnIndex === -1) {
            return;
        }

        columns[shortestColumnIndex].push(image);
        const aspectRatio = image.height / image.width;
        columnHeights[shortestColumnIndex] += columnWidth * aspectRatio;
    });

    const masonryStyle = {
        '--masonry-portrait-max-height': masonryConfig.portraitMaxHeight,
        '--masonry-portrait-aspect-ratio': masonryConfig.portraitAspectRatio,
    } as React.CSSProperties;

    return (
        <div className="masonry-grid" style={masonryStyle}>
            {columns.map((column, colIndex) => (
                <div className="masonry-column" key={colIndex}>
                    {column.map((image) => (
                        <div
                            key={image._id}
                            className={`masonry-item ${image.height > image.width ? 'portrait' : ''}`}
                            onClick={() => onImageClick && onImageClick(image)}
                            style={{ cursor: onImageClick ? 'pointer' : 'default' }}
                        >
                            <ProgressiveImage
                                src={image.imageUrl}
                                thumbnailUrl={image.thumbnailUrl}
                                alt={image.imageTitle || 'image'}
                                className="w-full h-auto block"
                            />
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
};

export default MasonryGrid;

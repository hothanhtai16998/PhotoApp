import { useMemo, useCallback, useRef, useEffect, useState } from 'react';

interface ColumnImage {
  image: Image;
  height: number;
}

interface Column {
  images: ColumnImage[];
  totalHeight: number;
}

interface UnsplashGridLayoutProps {
  images: Image[];
  columnCount: number;
  gap: number;
  columnWidth: number;
  imageTypes: Map<string, 'portrait' | 'landscape'>;
  imageAspectRatios: Map<string, number>;
  onImageClick: (image: Image) => void;
  renderImage: (image: Image, height: number) => React.ReactNode;
}

export const UnsplashGridLayout = ({
  images,
  columnCount,
  gap,
  columnWidth,
  imageTypes,
  imageAspectRatios,
  onImageClick,
  renderImage,
}: UnsplashGridLayoutProps) => {
  // Calculate columns with balancing algorithm
  const columns = useMemo(() => {
    const cols: Column[] = Array.from({ length: columnCount }, () => ({
      images: [],
      totalHeight: 0,
    }));

    images.forEach((image) => {
      // Get aspect ratio for this image
      const aspectRatio = imageAspectRatios.get(image._id) || 1;
      
      // Calculate image height based on column width and aspect ratio
      const imageHeight = columnWidth / aspectRatio;

      // Find column with smallest total height (balancing algorithm)
      let shortestColumn = cols[0];
      let shortestIndex = 0;

      for (let i = 1; i < cols.length; i++) {
        if (cols[i].totalHeight < shortestColumn.totalHeight) {
          shortestColumn = cols[i];
          shortestIndex = i;
        }
      }

      // Add image to shortest column
      shortestColumn.images.push({ image, height: imageHeight });
      shortestColumn.totalHeight += imageHeight + gap;
    });

    return cols;
  }, [images, columnCount, columnWidth, gap, imageAspectRatios]);

  return (
    <div
      className="flex gap-6 w-full"
      style={{ gap: `${gap}px` }}
    >
      {columns.map((column, colIndex) => (
        <div
          key={colIndex}
          className="flex flex-col flex-1"
          style={{ width: `${columnWidth}px` }}
        >
          {column.images.map(({ image, height }) => (
            <div
              key={image._id}
              className="cursor-pointer overflow-hidden rounded-lg mb-6 hover:opacity-90 transition-opacity"
              style={{ marginBottom: `${gap}px`, height: `${height}px` }}
              onClick={() => onImageClick(image)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onImageClick(image);
                }
              }}
            >
              {renderImage(image, height)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};
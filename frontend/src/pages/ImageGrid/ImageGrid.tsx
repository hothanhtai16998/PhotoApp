import { lazy, Suspense } from 'react';
import type { Image } from '@/types/image';
import MasonryGrid from '@/components/MasonryGrid';
import CategoryNavigation from '@/components/CategoryNavigation';
import { useInfiniteScroll } from '@/components/image/hooks/useInfiniteScroll';
import { Skeleton } from '@/components/ui/skeleton';
import { downloadImage, type DownloadSize } from '@/utils/downloadService';
import { t } from '@/i18n';
import {
    useImageGridState,
    useImageGridModal,
    useImageGridCategory,
    useImageGridColumns,
} from './hooks';

const ImageModal = lazy(() => import('@/components/ImageModal'));
const CollectionModal = lazy(() => import('@/components/CollectionModal'));

const ImageGrid = () => {
    // Category management
    const { category } = useImageGridCategory();

    // Image state and data fetching
    const {
        loading,
        isLoadingMore,
        hasMore,
        filteredImages,
        imageTypes,
        processedImages,
        currentImageIds,
        handleLoadMore,
        handleImageLoad,
    } = useImageGridState({ category });

    // Modal state management
    const {
        selectedImage,
        collectionImage,
        showCollectionModal,
        handleImageClick,
        handleCloseModal,
        handleModalImageSelect,
        handleAddToCollection,
        handleCollectionModalClose,
    } = useImageGridModal({ images: filteredImages });

    // Responsive columns
    const columnCount = useImageGridColumns();

    // Infinite scroll
    const { loadMoreRef } = useInfiniteScroll({
        hasMore,
        isLoading: loading || isLoadingMore,
        onLoadMore: handleLoadMore,
    });

    // Download handler
    const handleDownload = async (image: Image, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await downloadImage(image);
        } catch (error) {
            console.error('Failed to download image:', error);
        }
    };

    // Download handler with size selection (for mobile)
    const handleDownloadWithSize = async (image: Image, size: DownloadSize) => {
        try {
            await downloadImage(image, size);
        } catch (error) {
            console.error('Failed to download image:', error);
        }
    };

    return (
        <>
            <div className="container mx-auto">
                <CategoryNavigation />
                {loading && filteredImages.length === 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
                        {Array.from({ length: 12 }).map((_, i) => (
                            <Skeleton key={i} className="w-full h-64" />
                        ))}
                    </div>
                ) : (
                    <MasonryGrid
                        images={filteredImages}
                        onImageClick={handleImageClick}
                        columnCount={columnCount}
                        onDownload={handleDownload}
                        onDownloadWithSize={handleDownloadWithSize}
                        onAddToCollection={handleAddToCollection}
                    />
                )}
                <div ref={loadMoreRef} />
                {isLoadingMore && <p className="text-center py-4">{t('common.loading')}</p>}
            </div>
            <Suspense fallback={null}>
                {selectedImage && (
                    <ImageModal
                        image={selectedImage}
                        images={filteredImages}
                        onClose={handleCloseModal}
                        onImageSelect={handleModalImageSelect}
                        lockBodyScroll={false}
                        renderAsPage={false}
                        onDownload={() => { /* Download handled by ImageModal internally */ }}
                        imageTypes={imageTypes as Map<string, 'portrait' | 'landscape'>}
                        onImageLoad={handleImageLoad}
                        currentImageIds={currentImageIds.current}
                        processedImages={processedImages}
                    />
                )}
                {showCollectionModal && collectionImage && (
                    <CollectionModal
                        isOpen={showCollectionModal}
                        onClose={handleCollectionModalClose}
                        imageId={collectionImage._id}
                        onCollectionUpdate={() => {
                            // Optionally refresh images or update state
                        }}
                    />
                )}
            </Suspense>
        </>
    );
};

export default ImageGrid;


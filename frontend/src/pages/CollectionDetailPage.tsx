import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Header from '@/components/Header';
import { collectionService } from '@/services/collectionService';
import type { Collection } from '@/types/collection';
import type { Image } from '@/types/image';
import { toast } from 'sonner';
import { generateImageSlug, extractIdFromSlug } from '@/lib/utils';
import ImageModal from '@/components/ImageModal';
import ProgressiveImage from '@/components/ProgressiveImage';
import { useAuthStore } from '@/stores/useAuthStore';
import { ImageIcon, Check, GripVertical, Square, CheckSquare2, Trash2, X } from 'lucide-react';
import { CollectionShare } from '@/components/collection/CollectionShare';
import api from '@/lib/axios';
import './CollectionDetailPage.css';

export default function CollectionDetailPage() {
	const { collectionId } = useParams<{ collectionId: string }>();
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();
	const { user } = useAuthStore();
	const [collection, setCollection] = useState<Collection | null>(null);
	const [loading, setLoading] = useState(true);
	const [updatingCover, setUpdatingCover] = useState<string | null>(null);
	const [draggedImageId, setDraggedImageId] = useState<string | null>(null);
	const [dragOverImageId, setDragOverImageId] = useState<string | null>(null);
	const [isReordering, setIsReordering] = useState(false);
	const [selectionMode, setSelectionMode] = useState(false);
	const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(new Set());
	const [isBulkRemoving, setIsBulkRemoving] = useState(false);
	const [imageTypes, setImageTypes] = useState<Map<string, 'portrait' | 'landscape'>>(new Map());
	const processedImages = useRef<Set<string>>(new Set());

	// Get selected image slug from URL
	const imageSlugFromUrl = searchParams.get('image');

	// Get images array
	const images = useMemo(() => {
		if (!collection) return [];
		return Array.isArray(collection.images)
			? collection.images.filter((img): img is Image => {
					return typeof img === 'object' && img !== null && '_id' in img;
			  })
			: [];
	}, [collection]);

	// Find selected image from URL slug
	const selectedImage = useMemo(() => {
		if (!imageSlugFromUrl || images.length === 0) return null;
		
		const shortId = extractIdFromSlug(imageSlugFromUrl);
		if (!shortId) return null;
		
		return images.find(img => {
			const imgShortId = img._id.slice(-12);
			return imgShortId === shortId;
		}) || null;
	}, [imageSlugFromUrl, images]);

	// Get current image IDs for comparison
	const currentImageIds = useMemo(() => new Set(images.map(img => img._id)), [images]);

	// Determine image type when it loads
	const handleImageLoad = useCallback((imageId: string, img: HTMLImageElement) => {
		if (!currentImageIds.has(imageId) || processedImages.current.has(imageId)) return;

		processedImages.current.add(imageId);
		const isPortrait = img.naturalHeight > img.naturalWidth;
		const imageType = isPortrait ? 'portrait' : 'landscape';

		setImageTypes(prev => {
			if (prev.has(imageId)) return prev;
			const newMap = new Map(prev);
			newMap.set(imageId, imageType);
			return newMap;
		});
	}, [currentImageIds]);

	// Update image in the state when stats change
	const handleImageUpdate = useCallback((updatedImage: Image) => {
		setCollection(prev => {
			if (!prev) return prev;
			// Type guard: ensure images is Image[] before mapping
			const imageArray = Array.isArray(prev.images) 
				? prev.images.filter((img): img is Image => typeof img === 'object' && img !== null && '_id' in img)
				: [];
			
			const updatedImages = imageArray.map(img => 
				img._id === updatedImage._id ? updatedImage : img
			);
			
			return {
				...prev,
				images: updatedImages,
			};
		});
	}, []);

	// Check if user owns the collection
	const isOwner = useMemo(() => {
		if (!collection || !user) return false;
		const createdBy = typeof collection.createdBy === 'object' 
			? collection.createdBy._id 
			: collection.createdBy;
		return createdBy === user._id;
	}, [collection, user]);

	// Get current cover image ID
	const coverImageId = useMemo(() => {
		if (!collection || !collection.coverImage) return null;
		return typeof collection.coverImage === 'object' 
			? collection.coverImage._id 
			: collection.coverImage;
	}, [collection]);

	// Handle drag start
	const handleDragStart = useCallback((imageId: string, e: React.DragEvent) => {
		if (!isOwner) return;
		setDraggedImageId(imageId);
		e.dataTransfer.effectAllowed = 'move';
		e.dataTransfer.setData('text/plain', imageId);
		// Add a slight delay to allow drag image to be set
		setTimeout(() => {
			if (e.dataTransfer) {
				e.dataTransfer.effectAllowed = 'move';
			}
		}, 0);
	}, [isOwner]);

	// Handle drag over
	const handleDragOver = useCallback((imageId: string, e: React.DragEvent) => {
		if (!isOwner || !draggedImageId || draggedImageId === imageId) return;
		e.preventDefault();
		e.dataTransfer.dropEffect = 'move';
		setDragOverImageId(imageId);
	}, [isOwner, draggedImageId]);

	// Handle drag leave
	const handleDragLeave = useCallback(() => {
		setDragOverImageId(null);
	}, []);

	// Handle drop
	const handleDrop = useCallback(async (targetImageId: string, e: React.DragEvent) => {
		if (!isOwner || !draggedImageId || !collectionId) return;
		
		e.preventDefault();
		e.stopPropagation();

		if (draggedImageId === targetImageId) {
			setDraggedImageId(null);
			setDragOverImageId(null);
			return;
		}

		// Get current image order
		const currentOrder = images.map(img => img._id);
		const draggedIndex = currentOrder.indexOf(draggedImageId);
		const targetIndex = currentOrder.indexOf(targetImageId);

		if (draggedIndex === -1 || targetIndex === -1) {
			setDraggedImageId(null);
			setDragOverImageId(null);
			return;
		}

		// Reorder images
		const newOrder = [...currentOrder];
		newOrder.splice(draggedIndex, 1);
		newOrder.splice(targetIndex, 0, draggedImageId);

		// Optimistically update UI
		setCollection(prev => {
			if (!prev) return prev;
			const imageArray = Array.isArray(prev.images) 
				? prev.images.filter((img): img is Image => typeof img === 'object' && img !== null && '_id' in img)
				: [];
			
			const reorderedImages = newOrder.map(id => 
				imageArray.find(img => img._id === id)
			).filter((img): img is Image => img !== undefined);

			return {
				...prev,
				images: reorderedImages,
			};
		});

		setDraggedImageId(null);
		setDragOverImageId(null);

		// Save to backend
		try {
			setIsReordering(true);
			const updatedCollection = await collectionService.reorderCollectionImages(
				collectionId,
				newOrder
			);
			setCollection(updatedCollection);
			toast.success('Đã sắp xếp lại ảnh');
		} catch (error: any) {
			console.error('Failed to reorder images:', error);
			toast.error(error.response?.data?.message || 'Không thể sắp xếp lại ảnh. Vui lòng thử lại.');
			// Reload collection to revert optimistic update
			const data = await collectionService.getCollectionById(collectionId);
			setCollection(data);
		} finally {
			setIsReordering(false);
		}
	}, [isOwner, draggedImageId, collectionId, images]);

	// Handle drag end
	const handleDragEnd = useCallback(() => {
		setDraggedImageId(null);
		setDragOverImageId(null);
	}, []);

	// Toggle selection mode
	const toggleSelectionMode = useCallback(() => {
		setSelectionMode(prev => !prev);
		if (selectionMode) {
			setSelectedImageIds(new Set());
		}
	}, [selectionMode]);

	// Toggle image selection
	const toggleImageSelection = useCallback((imageId: string) => {
		setSelectedImageIds(prev => {
			const next = new Set(prev);
			if (next.has(imageId)) {
				next.delete(imageId);
			} else {
				next.add(imageId);
			}
			return next;
		});
	}, []);

	// Select all images
	const selectAllImages = useCallback(() => {
		setSelectedImageIds(new Set(images.map(img => img._id)));
	}, [images]);

	// Deselect all images
	const deselectAllImages = useCallback(() => {
		setSelectedImageIds(new Set());
	}, []);

	// Handle bulk remove
	const handleBulkRemove = useCallback(async () => {
		if (!collectionId || selectedImageIds.size === 0) return;

		const count = selectedImageIds.size;
		if (!confirm(`Bạn có chắc chắn muốn xóa ${count} ảnh khỏi bộ sưu tập này?`)) {
			return;
		}

		try {
			setIsBulkRemoving(true);
			const imageIdsArray = Array.from(selectedImageIds);
			
			// Remove images one by one (or we could add a bulk endpoint)
			await Promise.all(
				imageIdsArray.map(imageId => 
					collectionService.removeImageFromCollection(collectionId, imageId)
				)
			);

			// Reload collection
			const updatedCollection = await collectionService.getCollectionById(collectionId);
			setCollection(updatedCollection);
			setSelectedImageIds(new Set());
			setSelectionMode(false);
			toast.success(`Đã xóa ${count} ảnh khỏi bộ sưu tập`);
		} catch (error: any) {
			console.error('Failed to remove images:', error);
			toast.error('Không thể xóa ảnh. Vui lòng thử lại.');
		} finally {
			setIsBulkRemoving(false);
		}
	}, [collectionId, selectedImageIds]);

	// Handle setting cover image
	const handleSetCoverImage = useCallback(async (imageId: string, e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();

		if (!collectionId || !isOwner) return;

		try {
			setUpdatingCover(imageId);
			const updatedCollection = await collectionService.updateCollection(collectionId, {
				coverImage: imageId,
			});
			
			setCollection(updatedCollection);
			toast.success('Đã đặt ảnh làm ảnh bìa');
		} catch (error: any) {
			console.error('Failed to set cover image:', error);
			toast.error(error.response?.data?.message || 'Không thể đặt ảnh bìa. Vui lòng thử lại.');
		} finally {
			setUpdatingCover(null);
		}
	}, [collectionId, isOwner]);

	// Handle download
	const handleDownload = useCallback(async (image: Image, e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();

		try {
			const response = await api.get(`/images/${image._id}/download`, {
				responseType: 'blob',
				withCredentials: true,
			});

			const blob = new Blob([response.data], { type: response.headers['content-type'] });
			const blobUrl = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = blobUrl;
			link.download = `${image.imageTitle || 'image'}.jpg`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			setTimeout(() => {
				URL.revokeObjectURL(blobUrl);
			}, 100);
			toast.success('Tải ảnh thành công');
		} catch (error) {
			console.error('Download failed:', error);
			toast.error('Tải ảnh thất bại. Vui lòng thử lại.');
		}
	}, []);

	useEffect(() => {
		if (!collectionId) {
			navigate('/collections');
			return;
		}

		const loadCollection = async () => {
			try {
				setLoading(true);
				const data = await collectionService.getCollectionById(collectionId);
				setCollection(data);
			} catch (error: any) {
				console.error('Failed to load collection:', error);
				toast.error('Không thể tải bộ sưu tập');
				navigate('/collections');
			} finally {
				setLoading(false);
			}
		};

		loadCollection();
	}, [collectionId, navigate]);

	if (loading) {
		return (
			<>
				<Header />
				<div className="collection-detail-page">
					<div className="collection-detail-loading">
						<div className="loading-spinner" />
						<p>Đang tải bộ sưu tập...</p>
					</div>
				</div>
			</>
		);
	}

	if (!collection) {
		return (
			<>
				<Header />
				<div className="collection-detail-page">
					<div className="collection-detail-error">
						<p>Không tìm thấy bộ sưu tập</p>
						<button onClick={() => navigate('/collections')}>
							Quay lại danh sách
						</button>
					</div>
				</div>
			</>
		);
	}

	return (
		<>
			<Header />
			<div className="collection-detail-page">
				<div className="collection-detail-header">
					<button
						className="collection-detail-back"
						onClick={() => navigate('/collections')}
					>
						← Quay lại
					</button>
					<div className="collection-detail-info">
						<div className="collection-detail-title-row">
							<div>
								<h1>{collection.name}</h1>
								{collection.description && (
									<p className="collection-detail-description">
										{collection.description}
									</p>
								)}
								<div className="collection-detail-meta">
									<span>{images.length} ảnh</span>
									{collection.views !== undefined && collection.views > 0 && (
										<span>{collection.views} lượt xem</span>
									)}
									{typeof collection.createdBy === 'object' &&
										collection.createdBy && (
											<span>
												bởi {collection.createdBy.displayName || collection.createdBy.username}
											</span>
										)}
								</div>
							</div>
							<div className="collection-detail-actions">
								{collection.isPublic && (
									<div onClick={(e) => e.stopPropagation()}>
										<CollectionShare collection={collection} />
									</div>
								)}
								{isOwner && images.length > 0 && (
									<button
										className={`collection-selection-mode-btn ${selectionMode ? 'active' : ''}`}
										onClick={toggleSelectionMode}
										title={selectionMode ? 'Thoát chế độ chọn' : 'Chọn nhiều ảnh'}
									>
										{selectionMode ? (
											<>
												<X size={18} />
												<span>Thoát</span>
											</>
										) : (
											<>
												<CheckSquare2 size={18} />
												<span>Chọn</span>
											</>
										)}
									</button>
								)}
							</div>
						</div>
					</div>
				</div>

				{/* Bulk Action Bar */}
				{selectionMode && selectedImageIds.size > 0 && (
					<div className="collection-bulk-action-bar">
						<div className="bulk-action-info">
							<span className="bulk-action-count">
								Đã chọn {selectedImageIds.size} ảnh
							</span>
							<button
								className="bulk-action-link-btn"
								onClick={selectedImageIds.size === images.length ? deselectAllImages : selectAllImages}
							>
								{selectedImageIds.size === images.length ? 'Bỏ chọn tất cả' : 'Chọn tất cả'}
							</button>
						</div>
						<div className="bulk-action-buttons">
							<button
								className="bulk-action-btn bulk-action-remove"
								onClick={handleBulkRemove}
								disabled={isBulkRemoving}
							>
								<Trash2 size={18} />
								<span>Xóa khỏi bộ sưu tập</span>
							</button>
						</div>
					</div>
				)}

				{images.length === 0 ? (
					<div className="collection-detail-empty">
						<p>Bộ sưu tập này chưa có ảnh nào</p>
						<button onClick={() => navigate('/')}>
							Khám phá ảnh để thêm vào bộ sưu tập
						</button>
					</div>
				) : (
					<div className="collection-detail-images">
						<div className="collection-images-grid">
							{images.map((image) => {
								const imageType = imageTypes.get(image._id) || 'landscape';
								const slug = generateImageSlug(image.imageTitle, image._id);
								const isCoverImage = coverImageId === image._id;
								const isDragging = draggedImageId === image._id;
								const isDragOver = dragOverImageId === image._id;
								const isSelected = selectedImageIds.has(image._id);
								
								return (
									<div
										key={image._id}
										className={`collection-image-item ${imageType} ${isCoverImage ? 'is-cover' : ''} ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''} ${isSelected ? 'selected' : ''} ${selectionMode ? 'selection-mode' : ''}`}
										draggable={isOwner && !isReordering && !selectionMode}
										onDragStart={(e) => handleDragStart(image._id, e)}
										onDragOver={(e) => handleDragOver(image._id, e)}
										onDragLeave={handleDragLeave}
										onDrop={(e) => handleDrop(image._id, e)}
										onDragEnd={handleDragEnd}
										onClick={() => {
											if (isDragging) return; // Don't open modal if dragging
											if (selectionMode) {
												toggleImageSelection(image._id);
												return;
											}
											// Update URL search params instead of navigating
											setSearchParams(prev => {
												const newParams = new URLSearchParams(prev);
												newParams.set('image', slug);
												return newParams;
											});
										}}
									>
										<ProgressiveImage
											src={image.imageUrl}
											thumbnailUrl={image.thumbnailUrl}
											smallUrl={image.smallUrl}
											regularUrl={image.regularUrl}
											alt={image.imageTitle || 'Photo'}
											onLoad={(img) => {
												if (!processedImages.current.has(image._id) && currentImageIds.has(image._id)) {
													handleImageLoad(image._id, img);
												}
											}}
										/>
										{/* Cover Image Badge */}
										{isCoverImage && (
											<div className="collection-image-cover-badge">
												<ImageIcon size={14} />
												<span>Ảnh bìa</span>
											</div>
										)}
										{/* Selection Checkbox */}
										{selectionMode && (
											<div 
												className={`collection-image-checkbox ${isSelected ? 'checked' : ''}`}
												onClick={(e) => {
													e.stopPropagation();
													toggleImageSelection(image._id);
												}}
											>
												{isSelected ? (
													<CheckSquare2 size={20} />
												) : (
													<Square size={20} />
												)}
											</div>
										)}
										{/* Drag Handle */}
										{isOwner && !isReordering && !selectionMode && (
											<div className="collection-image-drag-handle" title="Kéo để sắp xếp lại">
												<GripVertical size={16} />
											</div>
										)}
										{/* Hover Overlay with Set Cover Button */}
										{isOwner && (
											<div className="collection-image-overlay">
												<button
													className={`collection-image-set-cover-btn ${isCoverImage ? 'is-cover' : ''}`}
													onClick={(e) => handleSetCoverImage(image._id, e)}
													disabled={isCoverImage || updatingCover === image._id}
													title={isCoverImage ? 'Đây là ảnh bìa' : 'Đặt làm ảnh bìa'}
												>
													{updatingCover === image._id ? (
														<div className="cover-loading-spinner" />
													) : isCoverImage ? (
														<>
															<Check size={16} />
															<span>Ảnh bìa</span>
														</>
													) : (
														<>
															<ImageIcon size={16} />
															<span>Đặt làm ảnh bìa</span>
														</>
													)}
												</button>
											</div>
										)}
									</div>
								);
							})}
						</div>
					</div>
				)}
			</div>

			{/* Image Modal - shown as overlay when image param exists */}
			{selectedImage && (
				<ImageModal
					image={selectedImage}
					images={images}
					onClose={() => {
						// Remove image param from URL when closing
						setSearchParams(prev => {
							const newParams = new URLSearchParams(prev);
							newParams.delete('image');
							return newParams;
						});
					}}
					onImageSelect={(updatedImage) => {
						handleImageUpdate(updatedImage);
						// Update URL to reflect the selected image with slug
						const slug = generateImageSlug(updatedImage.imageTitle, updatedImage._id);
						setSearchParams(prev => {
							const newParams = new URLSearchParams(prev);
							newParams.set('image', slug);
							return newParams;
						});
					}}
					onDownload={handleDownload}
					imageTypes={imageTypes}
					onImageLoad={handleImageLoad}
					currentImageIds={currentImageIds}
					processedImages={processedImages}
					renderAsPage={false} // Always render as modal when opened from collection
				/>
			)}
		</>
	);
}


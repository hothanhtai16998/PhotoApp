import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Header from '@/components/Header';
import { collectionService } from '@/services/collectionService';
import type { Image } from '@/types/image';
import { toast } from 'sonner';
import { generateImageSlug, extractIdFromSlug } from '@/lib/utils';
import ImageModal from '@/components/ImageModal';
import ProgressiveImage from '@/components/ProgressiveImage';
import { useUserStore } from '@/stores/useUserStore';
import { useCollectionStore } from '@/stores/useCollectionStore';
import { useCollectionImageStore } from '@/stores/useCollectionImageStore';
import type { CollectionVersion } from '@/services/collectionVersionService';
import { ImageIcon, Check, GripVertical, Square, CheckSquare2, Trash2, X, Download, Heart, History, RotateCcw, Clock } from 'lucide-react';
import { CollectionShare } from '@/components/collection/CollectionShare';
import CollectionCollaborators from './components/CollectionCollaborators';
import ReportButton from '@/components/ReportButton';
import api from '@/lib/axios';
import './CollectionDetailPage.css';

export default function CollectionDetailPage() {
	const { collectionId } = useParams<{ collectionId: string }>();
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();
	const { user } = useUserStore();

	// Collection store
	const {
		collection,
		loading,
		isFavorited,
		togglingFavorite,
		versions,
		loadingVersions,
		updatingCover,
		fetchCollection,
		setCoverImage,
		toggleFavorite,
		fetchVersions,
		restoreVersion,
		clearCollection,
	} = useCollectionStore();

	// Collection image store
	const {
		images,
		imageTypes,
		draggedImageId,
		dragOverImageId,
		isReordering,
		selectionMode,
		selectedImageIds,
		isBulkRemoving,
		setImages,
		updateImage,
		setImageType,
		setDraggedImageId,
		setDragOverImageId,
		reorderImages,
		toggleSelectionMode,
		toggleImageSelection,
		selectAllImages,
		deselectAllImages,
		bulkRemoveImages,
	} = useCollectionImageStore();

	// Detect if we're on mobile - MOBILE ONLY check
	const [isMobile, setIsMobile] = useState(() => {
		if (typeof window === 'undefined') return false;
		return window.innerWidth <= 768;
	});

	useEffect(() => {
		const handleResize = () => {
			setIsMobile(window.innerWidth <= 768);
		};
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, []);

	const processedImages = useRef<Set<string>>(new Set());
	const [showVersionHistory, setShowVersionHistory] = useState(false);
	const [restoringVersion, setRestoringVersion] = useState<number | null>(null);

	// Get selected image slug from URL
	const imageSlugFromUrl = searchParams.get('image');

	// Sync images from collection to image store
	useEffect(() => {
		if (collection) {
			const imageArray = Array.isArray(collection.images)
				? collection.images.filter((img): img is Image => {
					return typeof img === 'object' && img !== null && '_id' in img;
				})
				: [];
			setImages(imageArray);
		} else {
			setImages([]);
		}
	}, [collection, setImages]);

	// MOBILE ONLY: If URL has ?image=slug on mobile, redirect to ImagePage
	useEffect(() => {
		if (imageSlugFromUrl && (isMobile || window.innerWidth <= 768)) {
			// Set flag to indicate we're opening from grid
			sessionStorage.setItem('imagePage_fromGrid', 'true');
			// Navigate to ImagePage with images state
			navigate(`/photos/${imageSlugFromUrl}`, {
				state: {
					images,
					fromGrid: true
				},
				replace: true // Replace current URL to avoid back button issues
			});
			// Clear the image param from current URL
			setSearchParams(prev => {
				const newParams = new URLSearchParams(prev);
				newParams.delete('image');
				return newParams;
			});
		}
	}, [imageSlugFromUrl, isMobile, navigate, images, setSearchParams]);

	// Find selected image from URL slug - DESKTOP ONLY
	const selectedImage = useMemo(() => {
		// Don't show modal on mobile
		if (isMobile || window.innerWidth <= 768) return null;
		if (!imageSlugFromUrl || images.length === 0) return null;

		const shortId = extractIdFromSlug(imageSlugFromUrl);
		if (!shortId) return null;

		return images.find(img => {
			const imgShortId = img._id.slice(-12);
			return imgShortId === shortId;
		}) || null;
	}, [imageSlugFromUrl, images, isMobile]);

	// Get current image IDs for comparison
	const currentImageIds = useMemo(() => new Set(images.map(img => img._id)), [images]);

	// Determine image type when it loads
	const handleImageLoad = useCallback((imageId: string, img: HTMLImageElement) => {
		if (!currentImageIds.has(imageId) || processedImages.current.has(imageId)) return;

		processedImages.current.add(imageId);
		const isPortrait = img.naturalHeight > img.naturalWidth;
		const imageType = isPortrait ? 'portrait' : 'landscape';
		setImageType(imageId, imageType);
	}, [currentImageIds, setImageType]);

	// Update image in the state when stats change
	const handleImageUpdate = useCallback((updatedImage: Image) => {
		updateImage(updatedImage._id, updatedImage);
	}, [updateImage]);

	// Check if user owns the collection
	const isOwner = useMemo(() => {
		if (!collection || !user) return false;
		const createdBy = typeof collection.createdBy === 'object'
			? collection.createdBy._id
			: collection.createdBy;
		return createdBy === user._id;
	}, [collection, user]);

	// Get user's permission level (owner, admin, edit, view, or null)
	const userPermission = useMemo(() => {
		if (!collection || !user) return undefined;
		if (isOwner) return 'admin' as const; // Owner has admin permissions

		const collaborator = collection.collaborators?.find(
			collab => typeof collab.user === 'object' && collab.user._id === user._id
		);

		return collaborator?.permission;
	}, [collection, user, isOwner]);

	// Check if user can edit (owner, admin, or edit permission)
	const canEdit = useMemo(() => {
		return isOwner || userPermission === 'admin' || userPermission === 'edit';
	}, [isOwner, userPermission]);

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
	}, [isOwner, setDraggedImageId]);

	// Handle drag over
	const handleDragOver = useCallback((imageId: string, e: React.DragEvent) => {
		if (!isOwner || !draggedImageId || draggedImageId === imageId) return;
		e.preventDefault();
		e.dataTransfer.dropEffect = 'move';
		setDragOverImageId(imageId);
	}, [isOwner, draggedImageId, setDragOverImageId]);

	// Handle drag leave
	const handleDragLeave = useCallback(() => {
		setDragOverImageId(null);
	}, [setDragOverImageId]);

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

		setDraggedImageId(null);
		setDragOverImageId(null);

		// Save to backend (store handles optimistic update and error handling)
		await reorderImages(collectionId, newOrder);
	}, [isOwner, draggedImageId, collectionId, images, setDraggedImageId, setDragOverImageId, reorderImages]);

	// Handle drag end
	const handleDragEnd = useCallback(() => {
		setDraggedImageId(null);
		setDragOverImageId(null);
	}, [setDraggedImageId, setDragOverImageId]);

	// Note: toggleSelectionMode, toggleImageSelection, selectAllImages, deselectAllImages
	// are now handled by useCollectionImageStore

	// Handle bulk remove
	const handleBulkRemove = useCallback(async () => {
		if (!collectionId || selectedImageIds.size === 0) return;

		const count = selectedImageIds.size;
		if (!confirm(`Bạn có chắc chắn muốn xóa ${count} ảnh khỏi bộ sưu tập này?`)) {
			return;
		}

		const imageIdsArray = Array.from(selectedImageIds);
		await bulkRemoveImages(collectionId, imageIdsArray);

		// Reload collection to sync with backend
		await fetchCollection(collectionId);
	}, [collectionId, selectedImageIds, bulkRemoveImages, fetchCollection]);

	// Handle setting cover image
	const handleSetCoverImage = useCallback(async (imageId: string, e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();

		if (!collectionId || !isOwner) return;

		await setCoverImage(collectionId, imageId);
		// Reload collection to sync with backend
		await fetchCollection(collectionId);
	}, [collectionId, isOwner, setCoverImage, fetchCollection]);

	// Handle toggle favorite
	const handleToggleFavorite = useCallback(async () => {
		if (!collectionId) return;
		await toggleFavorite(collectionId);
	}, [collectionId, toggleFavorite]);

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

	// Load versions when collection is loaded and user can edit
	useEffect(() => {
		if (collection && canEdit && collectionId) {
			fetchVersions(collectionId);
		}
	}, [collection, canEdit, collectionId, fetchVersions]);

	// Handle restore version
	const handleRestoreVersion = useCallback(async (versionNumber: number) => {
		if (!collectionId) return;

		if (!confirm(`Bạn có chắc chắn muốn khôi phục bộ sưu tập về phiên bản ${versionNumber}? Tất cả thay đổi sau phiên bản này sẽ bị mất.`)) {
			return;
		}

		setRestoringVersion(versionNumber);
		try {
			await restoreVersion(collectionId, versionNumber);
			// Reload collection to sync with backend
			await fetchCollection(collectionId);
		} catch {
			// Error already handled in store
		} finally {
			setRestoringVersion(null);
		}
	}, [collectionId, restoreVersion, fetchCollection]);

	// Format version change description
	const getVersionChangeDescription = (version: CollectionVersion): string => {
		const changeTypeMap: Record<string, string> = {
			created: 'Tạo mới',
			updated: 'Cập nhật',
			image_added: 'Thêm ảnh',
			image_removed: 'Xóa ảnh',
			reordered: 'Sắp xếp lại',
			collaborator_added: 'Thêm cộng tác viên',
			collaborator_removed: 'Xóa cộng tác viên',
			permission_changed: 'Thay đổi quyền',
		};
		return changeTypeMap[version.changes.type] || version.changes.description || 'Thay đổi';
	};

	// Format time ago
	const formatTimeAgo = (dateString: string): string => {
		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) return 'Vừa xong';
		if (diffMins < 60) return `${diffMins} phút trước`;
		if (diffHours < 24) return `${diffHours} giờ trước`;
		if (diffDays < 7) return `${diffDays} ngày trước`;
		return date.toLocaleDateString('vi-VN');
	};

	// Handle export collection
	const handleExportCollection = useCallback(async () => {
		if (!collectionId || !collection || images.length === 0) {
			toast.error('Bộ sưu tập không có ảnh để xuất');
			return;
		}

		try {
			toast.loading('Đang tạo file ZIP...', { id: 'export-collection' });

			const blob = await collectionService.exportCollection(collectionId);
			const blobUrl = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = blobUrl;

			// Generate filename from collection name
			const safeCollectionName = (collection.name || 'collection')
				.replace(/[^a-z0-9]/gi, '_')
				.toLowerCase()
				.substring(0, 50);
			link.download = `${safeCollectionName}_${Date.now()}.zip`;

			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);

			setTimeout(() => {
				URL.revokeObjectURL(blobUrl);
			}, 100);

			toast.success(`Đã xuất ${images.length} ảnh thành công`, { id: 'export-collection' });
		} catch (error: unknown) {
			console.error('Export failed:', error);
			const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
			toast.error(
				message || 'Xuất bộ sưu tập thất bại. Vui lòng thử lại.',
				{ id: 'export-collection' }
			);
		}
	}, [collectionId, collection, images.length]);

	useEffect(() => {
		if (!collectionId) {
			navigate('/collections');
			return;
		}

		const loadCollection = async () => {
			try {
				await fetchCollection(collectionId);
			} catch {
				// Error already handled in store
				navigate('/collections');
			}
		};

		loadCollection();

		// Cleanup on unmount
		return () => {
			clearCollection();
		};
	}, [collectionId, navigate, fetchCollection, clearCollection]);

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
								<h1>{collection?.name || 'Bộ sưu tập'}</h1>
								{collection?.description && (
									<p className="collection-detail-description">
										{collection.description}
									</p>
								)}
								<div className="collection-detail-meta">
									<span>{images.length} ảnh</span>
									{collection?.views !== undefined && collection.views > 0 && (
										<span>{collection.views} lượt xem</span>
									)}
									{typeof collection?.createdBy === 'object' &&
										collection.createdBy && (
											<span>
												bởi {collection.createdBy.displayName || collection.createdBy.username}
											</span>
										)}
								</div>
							</div>
							<div className="collection-detail-actions">
								<button
									className={`collection-favorite-btn ${isFavorited ? 'favorited' : ''}`}
									onClick={handleToggleFavorite}
									disabled={togglingFavorite}
									title={isFavorited ? 'Xóa khỏi yêu thích' : 'Thêm vào yêu thích'}
								>
									<Heart size={18} fill={isFavorited ? 'currentColor' : 'none'} />
									<span>{isFavorited ? 'Đã yêu thích' : 'Yêu thích'}</span>
								</button>
								{collection?.isPublic && (
									<div onClick={(e) => e.stopPropagation()}>
										<CollectionShare collection={collection} />
										{user && user._id !== (typeof collection.createdBy === 'object' ? collection.createdBy._id : collection.createdBy) && (
											<ReportButton
												type="collection"
												targetId={collection._id}
												targetName={collection.name}
											/>
										)}
									</div>
								)}
								{images.length > 0 && collection && (
									<button
										className="collection-export-btn"
										onClick={handleExportCollection}
										title="Xuất bộ sưu tập (ZIP)"
									>
										<Download size={18} />
										<span>Xuất</span>
									</button>
								)}
								{canEdit && images.length > 0 && (
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

				{/* Collaborators Section */}
				{collection && (
					<div className="collection-detail-collaborators-wrapper">
						<CollectionCollaborators
							collection={collection}
							onCollectionUpdate={async () => {
								// Update collection in store
								await fetchCollection(collectionId!);
							}}
							isOwner={isOwner}
							userPermission={userPermission}
						/>
					</div>
				)}

				{/* Version History Section */}
				{collection && canEdit && (
					<div className="collection-detail-versions-wrapper">
						<div className="collection-versions-header">
							<h2>
								<History size={20} />
								Lịch sử phiên bản
							</h2>
							<button
								className="collection-versions-toggle"
								onClick={() => setShowVersionHistory(!showVersionHistory)}
							>
								{showVersionHistory ? 'Ẩn' : 'Hiện'} ({versions.length})
							</button>
						</div>

						{showVersionHistory && (
							<div className="collection-versions-content">
								{loadingVersions ? (
									<div className="collection-versions-loading">
										<p>Đang tải...</p>
									</div>
								) : versions.length === 0 ? (
									<div className="collection-versions-empty">
										<Clock size={48} />
										<p>Chưa có lịch sử phiên bản</p>
									</div>
								) : (
									<div className="collection-versions-list">
										{versions.map((version) => (
											<div key={version._id} className="collection-version-item">
												<div className="collection-version-header">
													<div className="collection-version-info">
														<span className="collection-version-number">
															Phiên bản {version.versionNumber}
														</span>
														<span className="collection-version-type">
															{getVersionChangeDescription(version)}
														</span>
													</div>
													<div className="collection-version-meta">
														<span className="collection-version-time">
															{formatTimeAgo(version.createdAt)}
														</span>
														{typeof version.changedBy === 'object' && (
															<span className="collection-version-author">
																bởi {version.changedBy.displayName || version.changedBy.username}
															</span>
														)}
													</div>
												</div>
												{version.changes.description && (
													<div className="collection-version-description">
														{version.changes.description}
													</div>
												)}
												{version.note && (
													<div className="collection-version-note">
														<strong>Ghi chú:</strong> {version.note}
													</div>
												)}
												{version.versionNumber > 1 && (
													<button
														className="collection-version-restore-btn"
														onClick={() => handleRestoreVersion(version.versionNumber)}
														disabled={restoringVersion === version.versionNumber}
														title="Khôi phục về phiên bản này"
													>
														<RotateCcw size={16} />
														{restoringVersion === version.versionNumber ? 'Đang khôi phục...' : 'Khôi phục'}
													</button>
												)}
											</div>
										))}
									</div>
								)}
							</div>
						)}
					</div>
				)}

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
												// Selection mode logic
												toggleImageSelection(image._id);
												return;
											}

											// MOBILE ONLY: Navigate to ImagePage instead of opening modal
											if (isMobile || window.innerWidth <= 768) {
												// Set flag to indicate we're opening from grid
												sessionStorage.setItem('imagePage_fromGrid', 'true');
												// Pass images via state for navigation
												navigate(`/photos/${slug}`, {
													state: {
														images,
														fromGrid: true
													}
												});
												return;
											}

											// DESKTOP: Use modal (existing behavior)
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


import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { collectionService } from '@/services/collectionService';
import type { Collection } from '@/types/collection';
import type { Image } from '@/types/image';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/utils';
import { useAuthStore } from '@/stores/useAuthStore';
import { useCollectionsListStore } from '@/stores/useCollectionsListStore';
import { useCollectionFavoriteStore } from '@/stores/useCollectionFavoriteStore';
import { Folder, Plus, Trash2, Edit2, Eye, Copy, Lock, Unlock, Search, X, Filter, Heart, FileText } from 'lucide-react';
import ProgressiveImage from '@/components/ProgressiveImage';
import CollectionModal from '@/components/CollectionModal';
import { CollectionShare } from '@/components/collection/CollectionShare';
import { collectionTemplateService } from '@/services/collectionTemplateService';
import './CollectionsPage.css';

export default function CollectionsPage() {
	const { accessToken } = useAuthStore();
	const navigate = useNavigate();

	// Collections list store
	const {
		collections,
		filteredCollections,
		loading,
		deletingId,
		searchQuery,
		showPublicOnly,
		sortBy,
		selectedTag,
		fetchCollections,
		deleteCollection,
		updateCollection,
		setSearchQuery,
		setShowPublicOnly,
		setSortBy,
		setSelectedTag,
		clearFilters,
		refreshCollections,
	} = useCollectionsListStore();

	// Collection favorite store
	const {
		favoriteStatuses,
		togglingFavoriteId,
		checkFavorites,
		toggleFavorite,
	} = useCollectionFavoriteStore();

	const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
	const [showEditModal, setShowEditModal] = useState(false);
	const [savingAsTemplate, setSavingAsTemplate] = useState<string | null>(null);

	useEffect(() => {
		if (!accessToken) {
			toast.info('Vui lòng đăng nhập để xem bộ sưu tập');
			navigate('/');
			return;
		}

		const loadCollections = async () => {
			try {
				await fetchCollections();
				// Check favorite statuses after collections are loaded
				// Get collections from store state
				const currentCollections = useCollectionsListStore.getState().collections;
				if (currentCollections.length > 0) {
					const collectionIds = currentCollections.map((c) => c._id).filter(Boolean) as string[];
					await checkFavorites(collectionIds);
				}
			} catch (error) {
				// Error already handled in store
			}
		};

		loadCollections();
	}, [accessToken, navigate, fetchCollections, checkFavorites]);

	// Get all unique tags from collections
	const allTags = useMemo(() => {
		const tagSet = new Set<string>();
		collections.forEach(collection => {
			if (collection.tags && Array.isArray(collection.tags)) {
				collection.tags.forEach(tag => tagSet.add(tag));
			}
		});
		return Array.from(tagSet).sort();
	}, [collections]);

	// Filtering and sorting is now handled in the store

	const handleDeleteCollection = async (collectionId: string) => {
		if (!confirm('Bạn có chắc chắn muốn xóa bộ sưu tập này?')) {
			return;
		}

		await deleteCollection(collectionId);
	};

	const handleCollectionClick = (collection: Collection) => {
		navigate(`/collections/${collection._id}`);
	};

	const handleEditCollection = (e: React.MouseEvent, collection: Collection) => {
		e.stopPropagation();
		setEditingCollection(collection);
		setShowEditModal(true);
	};

	const handleCollectionUpdated = () => {
		// Reload collections after update
		refreshCollections();
	};

	const clearSearch = () => {
		setSearchQuery('');
	};

	const handleToggleFavorite = async (e: React.MouseEvent, collection: Collection) => {
		e.stopPropagation();
		if (!accessToken || !collection._id || togglingFavoriteId === collection._id) return;

		await toggleFavorite(collection._id);
	};


	const handleTogglePublic = async (e: React.MouseEvent, collection: Collection) => {
		e.stopPropagation();
		try {
			await updateCollection(collection._id, {
				isPublic: !collection.isPublic,
			});
			toast.success(
				!collection.isPublic 
					? 'Đã công khai bộ sưu tập' 
					: 'Đã ẩn bộ sưu tập'
			);
		} catch (error) {
			// Error already handled in store
		}
	};

	const handleSaveAsTemplate = async (e: React.MouseEvent, collection: Collection) => {
		e.stopPropagation();
		const templateName = prompt(`Nhập tên mẫu cho "${collection.name}":`, collection.name);
		if (!templateName || !templateName.trim()) {
			return;
		}

		setSavingAsTemplate(collection._id);
		try {
			await collectionTemplateService.saveCollectionAsTemplate(collection._id, {
				templateName: templateName.trim(),
			});
			toast.success('Đã lưu bộ sưu tập thành mẫu');
		} catch (error: unknown) {
			console.error('Failed to save as template:', error);
			toast.error(getErrorMessage(error, 'Không thể lưu mẫu. Vui lòng thử lại.'));
		} finally {
			setSavingAsTemplate(null);
		}
	};

	const handleDuplicateCollection = async (e: React.MouseEvent, collection: Collection) => {
		e.stopPropagation();
		if (!confirm(`Tạo bản sao của "${collection.name}"?`)) {
			return;
		}

		try {
			const newCollection = await collectionService.createCollection({
				name: `${collection.name} (Bản sao)`,
				description: collection.description || undefined,
				isPublic: false, // Duplicates are private by default
			});

			// Copy images if any
			if (collection.images && Array.isArray(collection.images) && collection.images.length > 0) {
				const imageIds = collection.images
					.filter((img): img is string => typeof img === 'string')
					.concat(
						collection.images
							.filter((img): img is Image => typeof img === 'object' && img !== null && '_id' in img)
							.map(img => img._id)
					);

				// Add images in batches to avoid overwhelming the server
				for (const imageId of imageIds) {
					try {
						await collectionService.addImageToCollection(newCollection._id, imageId);
					} catch (err) {
						console.warn('Failed to add image to duplicate:', err);
					}
				}
			}

			// Reload collections
			await refreshCollections();
			toast.success('Đã tạo bản sao bộ sưu tập');
		} catch (error: unknown) {
			console.error('Failed to duplicate collection:', error);
			toast.error('Không thể tạo bản sao. Vui lòng thử lại.');
		}
	};

	if (loading) {
		return (
			<>
				<Header />
				<div className="collections-page">
					<div className="collections-loading">
						<div className="loading-spinner" />
						<p>Đang tải bộ sưu tập...</p>
					</div>
				</div>
			</>
		);
	}

	return (
		<>
			<Header />
			<div className="collections-page">
				<div className="collections-header">
					<h1>Bộ sưu tập của tôi</h1>
					<button
						className="collections-create-btn"
						onClick={() => {
							// For now, show a message. In the future, we can add a create modal
							toast.info('Mở ảnh và nhấn "Bộ sưu tập" để tạo bộ sưu tập mới');
						}}
					>
						<Plus size={18} />
						Tạo bộ sưu tập
					</button>
				</div>

				{/* Search and Filter Bar */}
				{collections.length > 0 && (
					<div className="collections-filters">
						<div className="collections-search-wrapper">
							<Search size={20} className="collections-search-icon" />
							<input
								type="text"
								className="collections-search-input"
								placeholder="Tìm kiếm bộ sưu tập..."
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
							/>
							{searchQuery && (
								<button
									className="collections-search-clear"
									onClick={clearSearch}
									title="Xóa tìm kiếm"
								>
									<X size={16} />
								</button>
							)}
						</div>
						{allTags.length > 0 && (
							<div className="collections-tags-filter">
								<button
									className={`collections-tag-filter-btn ${!selectedTag ? 'active' : ''}`}
									onClick={() => setSelectedTag(null)}
									title="Tất cả thẻ"
								>
									Tất cả
								</button>
								{allTags.map(tag => (
									<button
										key={tag}
										className={`collections-tag-filter-btn ${selectedTag === tag ? 'active' : ''}`}
										onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
										title={`Lọc theo: ${tag}`}
									>
										{tag}
									</button>
								))}
							</div>
						)}
						<div className="collections-filter-controls">
							<button
								className={`collections-filter-btn ${showPublicOnly ? 'active' : ''}`}
								onClick={() => setShowPublicOnly(!showPublicOnly)}
								title={showPublicOnly ? 'Hiển thị tất cả' : 'Chỉ hiển thị công khai'}
							>
								<Filter size={16} />
								<span>{showPublicOnly ? 'Công khai' : 'Tất cả'}</span>
							</button>
							<select
								className="collections-sort-select"
								value={sortBy}
								onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
							>
								<option value="newest">Mới nhất</option>
								<option value="oldest">Cũ nhất</option>
								<option value="name">Tên A-Z</option>
								<option value="images">Nhiều ảnh nhất</option>
							</select>
						</div>
					</div>
				)}

				{collections.length === 0 ? (
					<div className="collections-empty">
						<Folder size={64} />
						<h2>Chưa có bộ sưu tập nào</h2>
						<p>Bắt đầu tạo bộ sưu tập đầu tiên của bạn để lưu ảnh yêu thích</p>
						<button
							className="collections-empty-btn"
							onClick={() => navigate('/')}
						>
							Khám phá ảnh
						</button>
					</div>
				) : filteredCollections.length === 0 ? (
					<div className="collections-empty">
						<Folder size={64} />
						<h2>Không tìm thấy bộ sưu tập</h2>
						<p>
							{searchQuery 
								? `Không có bộ sưu tập nào khớp với "${searchQuery}"`
								: 'Không có bộ sưu tập nào phù hợp với bộ lọc'}
						</p>
						{(searchQuery || showPublicOnly) && (
							<button
								className="collections-empty-btn"
							onClick={() => {
								clearFilters();
							}}
							>
								Xóa bộ lọc
							</button>
						)}
					</div>
				) : (
					<>
						{searchQuery && (
							<div className="collections-results-info">
								Tìm thấy {filteredCollections.length} bộ sưu tập
							</div>
						)}
						<div className="collections-grid">
							{filteredCollections.map((collection) => {
							const coverImage =
								collection.coverImage &&
								typeof collection.coverImage === 'object'
									? collection.coverImage
									: null;

							return (
								<div
									key={collection._id}
									className="collection-card"
									onClick={() => handleCollectionClick(collection)}
								>
									<div className="collection-card-cover">
										{coverImage ? (
											<ProgressiveImage
												src={coverImage.imageUrl}
												thumbnailUrl={coverImage.thumbnailUrl}
												smallUrl={coverImage.smallUrl}
												regularUrl={coverImage.regularUrl}
												alt={collection.name}
											/>
										) : (
											<div className="collection-card-placeholder">
												<Folder size={48} />
											</div>
										)}
										<div className="collection-card-overlay">
											<div className="collection-card-actions">
												<button
													className="collection-card-action-btn action-primary"
													onClick={(e) => {
														e.stopPropagation();
														handleCollectionClick(collection);
													}}
													title="Xem bộ sưu tập"
												>
													<Eye size={18} />
												</button>
												<button
													className={`collection-card-action-btn ${favoriteStatuses[collection._id] ? 'action-favorite' : ''}`}
													onClick={(e) => handleToggleFavorite(e, collection)}
													disabled={togglingFavoriteId === collection._id}
													title={favoriteStatuses[collection._id] ? 'Xóa khỏi yêu thích' : 'Thêm vào yêu thích'}
												>
													<Heart size={18} fill={favoriteStatuses[collection._id] ? 'currentColor' : 'none'} />
												</button>
												<div onClick={(e) => e.stopPropagation()}>
													<CollectionShare collection={collection} />
												</div>
												<button
													className="collection-card-action-btn"
													onClick={(e) => handleTogglePublic(e, collection)}
													title={collection.isPublic ? 'Ẩn bộ sưu tập' : 'Công khai bộ sưu tập'}
												>
													{collection.isPublic ? (
														<Unlock size={18} />
													) : (
														<Lock size={18} />
													)}
												</button>
												<button
													className="collection-card-action-btn"
													onClick={(e) => handleDuplicateCollection(e, collection)}
													title="Tạo bản sao"
												>
													<Copy size={18} />
												</button>
												<button
													className="collection-card-action-btn"
													onClick={(e) => handleEditCollection(e, collection)}
													title="Chỉnh sửa bộ sưu tập"
												>
													<Edit2 size={18} />
												</button>
												<button
													className="collection-card-action-btn action-secondary"
													onClick={(e) => handleSaveAsTemplate(e, collection)}
													disabled={savingAsTemplate === collection._id}
													title="Lưu thành mẫu"
												>
													<FileText size={18} />
												</button>
												<button
													className="collection-card-action-btn action-danger"
													onClick={(e) => {
														e.stopPropagation();
														handleDeleteCollection(collection._id);
													}}
													disabled={deletingId === collection._id}
													title="Xóa bộ sưu tập"
												>
													<Trash2 size={18} />
												</button>
											</div>
										</div>
									</div>
									<div className="collection-card-info">
										<h3>{collection.name}</h3>
										{collection.description && (
											<p className="collection-card-description">
												{collection.description}
											</p>
										)}
										{collection.tags && collection.tags.length > 0 && (
											<div className="collection-card-tags">
												{collection.tags.slice(0, 3).map((tag, index) => (
													<span key={index} className="collection-card-tag">
														{tag}
													</span>
												))}
												{collection.tags.length > 3 && (
													<span className="collection-card-tag-more">
														+{collection.tags.length - 3}
													</span>
												)}
											</div>
										)}
										<div className="collection-card-meta">
											<span className="collection-card-count">
												{collection.imageCount || 0} ảnh
											</span>
											{collection.views !== undefined && collection.views > 0 && (
												<span className="collection-card-views">
													{collection.views} lượt xem
												</span>
											)}
										</div>
									</div>
								</div>
							);
						})}
						</div>
					</>
				)}
			</div>

			{/* Edit Collection Modal */}
			<CollectionModal
				isOpen={showEditModal}
				onClose={() => {
					setShowEditModal(false);
					setEditingCollection(null);
				}}
				collectionToEdit={editingCollection || undefined}
				onCollectionUpdate={handleCollectionUpdated}
			/>
		</>
	);
}


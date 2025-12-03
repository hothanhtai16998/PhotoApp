import { useEffect, useState, useMemo, lazy, Suspense } from 'react';
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
import { CollectionShare } from '@/components/collection/CollectionShare';
import { collectionTemplateService } from '@/services/collectionTemplateService';
import { t } from '@/i18n';
import './CollectionsPage.css';

// Lazy load CollectionModal - only shown when editing
const CollectionModal = lazy(() => import('@/components/CollectionModal'));

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
			toast.info(t('collections.loginRequired'));
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
			} catch (_error) {
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
		if (!confirm(t('collections.deleteConfirm'))) {
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
					? t('collections.madePublic') 
					: t('collections.madePrivate')
			);
		} catch (_error) {
			// Error already handled in store
		}
	};

	const handleSaveAsTemplate = async (e: React.MouseEvent, collection: Collection) => {
		e.stopPropagation();
		const templateName = prompt(t('collections.enterTemplateName', { name: collection.name }), collection.name);
		if (!templateName?.trim()) {
			return;
		}

		setSavingAsTemplate(collection._id);
		try {
			await collectionTemplateService.saveCollectionAsTemplate(collection._id, {
				templateName: templateName.trim(),
			});
			toast.success(t('collections.saveAsTemplateSuccess'));
		} catch (error: unknown) {
			console.error('Failed to save as template:', error);
			toast.error(getErrorMessage(error, t('collections.saveAsTemplateFailed')));
		} finally {
			setSavingAsTemplate(null);
		}
	};

	const handleDuplicateCollection = async (e: React.MouseEvent, collection: Collection) => {
		e.stopPropagation();
		if (!confirm(t('collections.duplicateConfirm', { name: collection.name }))) {
			return;
		}

		try {
			const newCollection = await collectionService.createCollection({
				name: t('collections.copyName', { name: collection.name }),
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
			toast.success(t('collections.duplicateSuccess'));
		} catch (error: unknown) {
			console.error('Failed to duplicate collection:', error);
			toast.error(t('collections.duplicateFailed'));
		}
	};

	if (loading) {
		return (
			<>
				<Header />
				<div className="collections-page">
					<div className="collections-loading">
						<div className="loading-spinner" />
						<p>{t('collections.loading')}</p>
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
					<h1>{t('collections.myCollections')}</h1>
					<button
						className="collections-create-btn"
						onClick={() => {
							// For now, show a message. In the future, we can add a create modal
							toast.info(t('collections.openToCreate'));
						}}
					>
						<Plus size={18} />
						{t('collections.createCollection')}
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
								placeholder={t('collections.searchPlaceholder')}
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
							/>
							{searchQuery && (
								<button
									className="collections-search-clear"
									onClick={clearSearch}
									title={t('collections.clearSearch')}
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
									title={t('collections.allTags')}
								>
									{t('collections.all')}
								</button>
								{allTags.map(tag => (
									<button
										key={tag}
										className={`collections-tag-filter-btn ${selectedTag === tag ? 'active' : ''}`}
										onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
										title={t('collections.filterBy', { tag })}
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
								title={showPublicOnly ? t('collections.showAll') : t('collections.showPublicOnly')}
							>
								<Filter size={16} />
								<span>{showPublicOnly ? t('collections.public') : t('collections.all')}</span>
							</button>
							<select
								className="collections-sort-select"
								value={sortBy}
								onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
							>
								<option value="newest">{t('collections.sortNewest')}</option>
								<option value="oldest">{t('collections.sortOldest')}</option>
								<option value="name">{t('collections.sortName')}</option>
								<option value="images">{t('collections.sortImages')}</option>
							</select>
						</div>
					</div>
				)}

				{collections.length === 0 ? (
					<div className="collections-empty">
						<Folder size={64} />
						<h2>{t('collections.empty')}</h2>
						<p>{t('collections.emptyHint')}</p>
						<button
							className="collections-empty-btn"
							onClick={() => navigate('/')}
						>
							{t('favorites.explore')}
						</button>
					</div>
				) : filteredCollections.length === 0 ? (
					<div className="collections-empty">
						<Folder size={64} />
						<h2>{t('collections.noCollectionsFound')}</h2>
						<p>
							{searchQuery 
								? t('collections.noMatchSearch', { query: searchQuery })
								: t('collections.noMatchFilter')}
						</p>
						{(searchQuery || showPublicOnly) && (
							<button
								className="collections-empty-btn"
							onClick={() => {
								clearFilters();
							}}
							>
								{t('collections.clearFilters')}
							</button>
						)}
					</div>
				) : (
					<>
						{searchQuery && (
							<div className="collections-results-info">
								{t('collections.foundCount', { count: filteredCollections.length })}
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
													title={t('collections.view')}
												>
													<Eye size={18} />
												</button>
												<button
													className={`collection-card-action-btn ${favoriteStatuses[collection._id] ? 'action-favorite' : ''}`}
													onClick={(e) => handleToggleFavorite(e, collection)}
													disabled={togglingFavoriteId === collection._id}
													title={favoriteStatuses[collection._id] ? t('collections.removeFromFavorites') : t('collections.addToFavorites')}
												>
													<Heart size={18} fill={favoriteStatuses[collection._id] ? 'currentColor' : 'none'} />
												</button>
												<div onClick={(e) => e.stopPropagation()}>
													<CollectionShare collection={collection} />
												</div>
												<button
													className="collection-card-action-btn"
													onClick={(e) => handleTogglePublic(e, collection)}
													title={collection.isPublic ? t('collections.makePrivate') : t('collections.makePublic')}
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
													title={t('collections.duplicate')}
												>
													<Copy size={18} />
												</button>
												<button
													className="collection-card-action-btn"
													onClick={(e) => handleEditCollection(e, collection)}
													title={t('collections.editCollection')}
												>
													<Edit2 size={18} />
												</button>
												<button
													className="collection-card-action-btn action-secondary"
													onClick={(e) => handleSaveAsTemplate(e, collection)}
													disabled={savingAsTemplate === collection._id}
													title={t('collections.saveAsTemplate')}
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
													title={t('common.delete')}
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
												{t('collections.imageCount', { count: collection.imageCount || 0 })}
											</span>
											{collection.views !== undefined && collection.views > 0 && (
												<span className="collection-card-views">
													{t('collections.viewCount', { count: collection.views })}
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
			{showEditModal && (
				<Suspense fallback={null}>
			<CollectionModal
				isOpen={showEditModal}
				onClose={() => {
					setShowEditModal(false);
					setEditingCollection(null);
				}}
				collectionToEdit={editingCollection || undefined}
				onCollectionUpdate={handleCollectionUpdated}
			/>
				</Suspense>
			)}
		</>
	);
}


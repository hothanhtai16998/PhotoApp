import { useState, useEffect, useCallback } from 'react';
import { X, Plus, Folder, Check, Edit2, Save } from 'lucide-react';
import { collectionService } from '@/services/collectionService';
import type { Collection } from '@/types/collection';
import { toast } from 'sonner';
import './CollectionModal.css';

interface CollectionModalProps {
	isOpen: boolean;
	onClose: () => void;
	imageId?: string; // Optional - if not provided, modal is in edit mode
	collectionToEdit?: Collection; // If provided, modal is in edit mode
	onCollectionUpdate?: () => void;
}

export default function CollectionModal({
	isOpen,
	onClose,
	imageId,
	collectionToEdit,
	onCollectionUpdate,
}: CollectionModalProps) {
	const isEditMode = !!collectionToEdit;
	const [collections, setCollections] = useState<Collection[]>([]);
	const [loading, setLoading] = useState(false);
	const [creating, setCreating] = useState(false);
	const [editing, setEditing] = useState(false);
	const [showCreateForm, setShowCreateForm] = useState(false);
	const [newCollectionName, setNewCollectionName] = useState('');
	const [newCollectionDescription, setNewCollectionDescription] = useState('');
	const [newCollectionPublic, setNewCollectionPublic] = useState(true);
	const [editCollectionName, setEditCollectionName] = useState('');
	const [editCollectionDescription, setEditCollectionDescription] = useState('');
	const [editCollectionPublic, setEditCollectionPublic] = useState(true);
	const [collectionsContainingImage, setCollectionsContainingImage] = useState<Set<string>>(
		new Set()
	);

	// Initialize edit form when collectionToEdit changes
	useEffect(() => {
		if (collectionToEdit) {
			setEditCollectionName(collectionToEdit.name || '');
			setEditCollectionDescription(collectionToEdit.description || '');
			setEditCollectionPublic(collectionToEdit.isPublic !== false);
			setShowCreateForm(false);
		}
	}, [collectionToEdit]);

	// Load collections and check which ones contain this image
	useEffect(() => {
		if (!isOpen) return;

		// If in edit mode, don't load collections list
		if (isEditMode) {
			setLoading(false);
			return;
		}

		if (!imageId) return;

		const loadData = async () => {
			setLoading(true);
			try {
				const [userCollections, containingCollections] = await Promise.all([
					collectionService.getUserCollections(),
					collectionService.getCollectionsContainingImage(imageId),
				]);

				setCollections(userCollections);
				const containingIds = new Set(
					containingCollections.map((c) => c._id)
				);
				setCollectionsContainingImage(containingIds);
			} catch (error: any) {
				console.error('Failed to load collections:', error);
				toast.error('Không thể tải danh sách bộ sưu tập');
			} finally {
				setLoading(false);
			}
		};

		loadData();
	}, [isOpen, imageId, isEditMode]);

	const handleToggleCollection = useCallback(
		async (collectionId: string, isInCollection: boolean) => {
			try {
				if (isInCollection) {
					await collectionService.removeImageFromCollection(collectionId, imageId);
					setCollectionsContainingImage((prev) => {
						const next = new Set(prev);
						next.delete(collectionId);
						return next;
					});
					toast.success('Đã xóa ảnh khỏi bộ sưu tập');
				} else {
					await collectionService.addImageToCollection(collectionId, imageId);
					setCollectionsContainingImage((prev) => {
						const next = new Set(prev);
						next.add(collectionId);
						return next;
					});
					toast.success('Đã thêm ảnh vào bộ sưu tập');
				}
				onCollectionUpdate?.();
			} catch (error: any) {
				console.error('Failed to toggle collection:', error);
				toast.error(
					error.response?.data?.message ||
						'Không thể cập nhật bộ sưu tập. Vui lòng thử lại.'
				);
			}
		},
		[imageId, onCollectionUpdate]
	);

	const handleCreateCollection = useCallback(async () => {
		if (!newCollectionName.trim()) {
			toast.error('Vui lòng nhập tên bộ sưu tập');
			return;
		}

		setCreating(true);
		try {
			const newCollection = await collectionService.createCollection({
				name: newCollectionName.trim(),
				description: newCollectionDescription.trim() || undefined,
				isPublic: newCollectionPublic,
			});

			// Add the image to the new collection if imageId is provided
			if (imageId) {
				await collectionService.addImageToCollection(newCollection._id, imageId);
			}

			setCollections((prev) => [newCollection, ...prev]);
			if (imageId) {
				setCollectionsContainingImage((prev) => {
					const next = new Set(prev);
					next.add(newCollection._id);
					return next;
				});
			}

			setNewCollectionName('');
			setNewCollectionDescription('');
			setNewCollectionPublic(true);
			setShowCreateForm(false);

			toast.success('Đã tạo bộ sưu tập' + (imageId ? ' và thêm ảnh' : ''));
			onCollectionUpdate?.();
		} catch (error: any) {
			console.error('Failed to create collection:', error);
			toast.error(
				error.response?.data?.message || 'Không thể tạo bộ sưu tập. Vui lòng thử lại.'
			);
		} finally {
			setCreating(false);
		}
	}, [
		newCollectionName,
		newCollectionDescription,
		newCollectionPublic,
		imageId,
		onCollectionUpdate,
	]);

	const handleUpdateCollection = useCallback(async () => {
		if (!collectionToEdit || !editCollectionName.trim()) {
			toast.error('Vui lòng nhập tên bộ sưu tập');
			return;
		}

		setEditing(true);
		try {
			await collectionService.updateCollection(collectionToEdit._id, {
				name: editCollectionName.trim(),
				description: editCollectionDescription.trim() || undefined,
				isPublic: editCollectionPublic,
			});

			toast.success('Đã cập nhật bộ sưu tập');
			onCollectionUpdate?.();
			onClose();
		} catch (error: any) {
			console.error('Failed to update collection:', error);
			toast.error(
				error.response?.data?.message || 'Không thể cập nhật bộ sưu tập. Vui lòng thử lại.'
			);
		} finally {
			setEditing(false);
		}
	}, [
		collectionToEdit,
		editCollectionName,
		editCollectionDescription,
		editCollectionPublic,
		onCollectionUpdate,
		onClose,
	]);

	if (!isOpen) return null;

	return (
		<>
			<div className="collection-modal-overlay" onClick={onClose} />
			<div className="collection-modal" onClick={(e) => e.stopPropagation()}>
				<div className="collection-modal-header">
					<h2>{isEditMode ? 'Chỉnh sửa bộ sưu tập' : 'Lưu vào bộ sưu tập'}</h2>
					<button className="collection-modal-close" onClick={onClose} aria-label="Đóng">
						<X size={20} />
					</button>
				</div>

				<div className="collection-modal-content">
					{isEditMode ? (
						<div className="collection-modal-create-form">
							<h3>Chỉnh sửa bộ sưu tập</h3>
							<div className="collection-modal-form-group">
								<label htmlFor="edit-collection-name">Tên bộ sưu tập *</label>
								<input
									id="edit-collection-name"
									type="text"
									value={editCollectionName}
									onChange={(e) => setEditCollectionName(e.target.value)}
									placeholder="Ví dụ: Ảnh phong cảnh đẹp"
									maxLength={100}
									autoFocus
								/>
							</div>
							<div className="collection-modal-form-group">
								<label htmlFor="edit-collection-description">Mô tả (tùy chọn)</label>
								<textarea
									id="edit-collection-description"
									value={editCollectionDescription}
									onChange={(e) => setEditCollectionDescription(e.target.value)}
									placeholder="Mô tả ngắn về bộ sưu tập này..."
									maxLength={500}
									rows={3}
								/>
							</div>
							<div className="collection-modal-form-group">
								<label className="collection-modal-checkbox-label">
									<input
										type="checkbox"
										checked={editCollectionPublic}
										onChange={(e) => setEditCollectionPublic(e.target.checked)}
									/>
									<span>Công khai (mọi người có thể xem)</span>
								</label>
							</div>
							<div className="collection-modal-form-actions">
								<button
									className="collection-modal-cancel-btn"
									onClick={onClose}
									disabled={editing}
								>
									Hủy
								</button>
								<button
									className="collection-modal-submit-btn"
									onClick={handleUpdateCollection}
									disabled={editing || !editCollectionName.trim()}
								>
									{editing ? 'Đang lưu...' : 'Lưu thay đổi'}
								</button>
							</div>
						</div>
					) : loading ? (
						<div className="collection-modal-loading">
							<p>Đang tải...</p>
						</div>
					) : (
						<>
							{!showCreateForm ? (
								<>
									<button
										className="collection-modal-create-btn"
										onClick={() => setShowCreateForm(true)}
									>
										<Plus size={18} />
										Tạo bộ sưu tập mới
									</button>

									{collections.length === 0 ? (
										<div className="collection-modal-empty">
											<Folder size={48} />
											<p>Bạn chưa có bộ sưu tập nào</p>
											<p className="collection-modal-empty-hint">
												Tạo bộ sưu tập đầu tiên của bạn để lưu ảnh yêu thích
											</p>
										</div>
									) : (
										<div className="collection-modal-list">
											{collections.map((collection) => {
												const isInCollection = collectionsContainingImage.has(
													collection._id
												);
												return (
													<button
														key={collection._id}
														className={`collection-modal-item ${
															isInCollection ? 'selected' : ''
														}`}
														onClick={() =>
															handleToggleCollection(
																collection._id,
																isInCollection
															)
														}
													>
														<div className="collection-modal-item-info">
															{collection.coverImage &&
															typeof collection.coverImage === 'object' ? (
																<img
																	src={
																		collection.coverImage.thumbnailUrl ||
																		collection.coverImage.smallUrl ||
																		collection.coverImage.imageUrl
																	}
																	alt={collection.name}
																	className="collection-modal-item-cover"
																/>
															) : (
																<div className="collection-modal-item-placeholder">
																	<Folder size={24} />
																</div>
															)}
															<div className="collection-modal-item-details">
																<h3>{collection.name}</h3>
																{collection.description && (
																	<p className="collection-modal-item-description">
																		{collection.description}
																	</p>
																)}
																<p className="collection-modal-item-count">
																	{collection.imageCount || 0} ảnh
																</p>
															</div>
														</div>
														{isInCollection && (
															<Check
																size={20}
																className="collection-modal-item-check"
															/>
														)}
													</button>
												);
											})}
										</div>
									)}
								</>
							) : (
								<div className="collection-modal-create-form">
									<h3>Tạo bộ sưu tập mới</h3>
									<div className="collection-modal-form-group">
										<label htmlFor="collection-name">Tên bộ sưu tập *</label>
										<input
											id="collection-name"
											type="text"
											value={newCollectionName}
											onChange={(e) => setNewCollectionName(e.target.value)}
											placeholder="Ví dụ: Ảnh phong cảnh đẹp"
											maxLength={100}
											autoFocus
										/>
									</div>
									<div className="collection-modal-form-group">
										<label htmlFor="collection-description">Mô tả (tùy chọn)</label>
										<textarea
											id="collection-description"
											value={newCollectionDescription}
											onChange={(e) =>
												setNewCollectionDescription(e.target.value)
											}
											placeholder="Mô tả ngắn về bộ sưu tập này..."
											maxLength={500}
											rows={3}
										/>
									</div>
									<div className="collection-modal-form-group">
										<label className="collection-modal-checkbox-label">
											<input
												type="checkbox"
												checked={newCollectionPublic}
												onChange={(e) => setNewCollectionPublic(e.target.checked)}
											/>
											<span>Công khai (mọi người có thể xem)</span>
										</label>
									</div>
									<div className="collection-modal-form-actions">
										<button
											className="collection-modal-cancel-btn"
											onClick={() => {
												setShowCreateForm(false);
												setNewCollectionName('');
												setNewCollectionDescription('');
											}}
											disabled={creating}
										>
											Hủy
										</button>
										<button
											className="collection-modal-submit-btn"
											onClick={handleCreateCollection}
											disabled={creating || !newCollectionName.trim()}
										>
											{creating ? 'Đang tạo...' : 'Tạo bộ sưu tập'}
										</button>
									</div>
								</div>
							)}
						</>
					)}
				</div>
			</div>
		</>
	);
}


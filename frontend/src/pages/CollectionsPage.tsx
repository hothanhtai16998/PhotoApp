import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { collectionService } from '@/services/collectionService';
import type { Collection } from '@/types/collection';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/useAuthStore';
import { Folder, Plus, Trash2, Edit2, Eye } from 'lucide-react';
import { generateImageSlug } from '@/lib/utils';
import ProgressiveImage from '@/components/ProgressiveImage';
import CollectionModal from '@/components/CollectionModal';
import './CollectionsPage.css';

export default function CollectionsPage() {
	const { user, accessToken } = useAuthStore();
	const navigate = useNavigate();
	const [collections, setCollections] = useState<Collection[]>([]);
	const [loading, setLoading] = useState(true);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
	const [showEditModal, setShowEditModal] = useState(false);

	useEffect(() => {
		if (!accessToken) {
			toast.info('Vui lòng đăng nhập để xem bộ sưu tập');
			navigate('/');
			return;
		}

		const loadCollections = async () => {
			try {
				setLoading(true);
				const data = await collectionService.getUserCollections();
				setCollections(data);
			} catch (error: any) {
				console.error('Failed to load collections:', error);
				toast.error('Không thể tải danh sách bộ sưu tập');
			} finally {
				setLoading(false);
			}
		};

		loadCollections();
	}, [accessToken, navigate]);

	const handleDeleteCollection = async (collectionId: string) => {
		if (!confirm('Bạn có chắc chắn muốn xóa bộ sưu tập này?')) {
			return;
		}

		setDeletingId(collectionId);
		try {
			await collectionService.deleteCollection(collectionId);
			setCollections((prev) => prev.filter((c) => c._id !== collectionId));
			toast.success('Đã xóa bộ sưu tập');
		} catch (error: any) {
			console.error('Failed to delete collection:', error);
			toast.error('Không thể xóa bộ sưu tập. Vui lòng thử lại.');
		} finally {
			setDeletingId(null);
		}
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
		const reloadCollections = async () => {
			try {
				const data = await collectionService.getUserCollections();
				setCollections(data);
			} catch (error: any) {
				console.error('Failed to reload collections:', error);
			}
		};
		reloadCollections();
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
				) : (
					<div className="collections-grid">
						{collections.map((collection) => {
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
													className="collection-card-action-btn"
													onClick={(e) => {
														e.stopPropagation();
														handleCollectionClick(collection);
													}}
													title="Xem bộ sưu tập"
												>
													<Eye size={18} />
												</button>
												<button
													className="collection-card-action-btn"
													onClick={(e) => handleEditCollection(e, collection)}
													title="Chỉnh sửa bộ sưu tập"
												>
													<Edit2 size={18} />
												</button>
												<button
													className="collection-card-action-btn"
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


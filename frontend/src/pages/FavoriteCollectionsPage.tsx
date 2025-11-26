import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/useAuthStore';
import { collectionFavoriteService } from '@/services/collectionFavoriteService';
import Header from '@/components/Header';
import { Folder, Heart } from 'lucide-react';
import type { Collection } from '@/types/collection';
import ProgressiveImage from '@/components/ProgressiveImage';
import { toast } from 'sonner';
import './FavoriteCollectionsPage.css';

export default function FavoriteCollectionsPage() {
	const { user, accessToken } = useAuthStore();
	const navigate = useNavigate();
	const [collections, setCollections] = useState<Collection[]>([]);
	const [loading, setLoading] = useState(true);
	const [pagination, setPagination] = useState<{
		page: number;
		limit: number;
		total: number;
		pages: number;
	} | null>(null);
	const [currentPage, setCurrentPage] = useState(1);

	const fetchFavoriteCollections = useCallback(async (page = 1) => {
		if (!accessToken || !user?._id) {
			navigate('/signin');
			return;
		}

		try {
			setLoading(true);
			const response = await collectionFavoriteService.getFavoriteCollections({
				page,
				limit: 20,
			});
			setCollections(response.collections || []);
			setPagination(response.pagination || null);
			setCurrentPage(page);
		} catch (error) {
			console.error('Failed to fetch favorite collections:', error);
			toast.error('Không thể tải bộ sưu tập yêu thích');
		} finally {
			setLoading(false);
		}
	}, [accessToken, user, navigate]);

	useEffect(() => {
		if (!accessToken || !user?._id) {
			navigate('/signin');
			return;
		}

		fetchFavoriteCollections(1);
	}, [accessToken, user, navigate, fetchFavoriteCollections]);

	const handleCollectionClick = (collection: Collection) => {
		navigate(`/collections/${collection._id}`);
	};

	if (loading) {
		return (
			<>
				<Header />
				<div className="favorite-collections-page">
					<div className="favorite-collections-loading">
						<div className="loading-spinner" />
						<p>Đang tải bộ sưu tập yêu thích...</p>
					</div>
				</div>
			</>
		);
	}

	return (
		<>
			<Header />
			<div className="favorite-collections-page">
				<div className="favorite-collections-header">
					<h1>
						<Heart size={28} fill="currentColor" />
						Bộ sưu tập yêu thích
					</h1>
					{pagination && (
						<p className="favorite-collections-count">
							{pagination.total} bộ sưu tập
						</p>
					)}
				</div>

				{collections.length === 0 ? (
					<div className="favorite-collections-empty">
						<Folder size={64} />
						<h2>Chưa có bộ sưu tập yêu thích nào</h2>
						<p>Bắt đầu thêm bộ sưu tập vào yêu thích để dễ dàng truy cập sau này</p>
						<button
							className="favorite-collections-empty-btn"
							onClick={() => navigate('/collections')}
						>
							Khám phá bộ sưu tập
						</button>
					</div>
				) : (
					<>
						<div className="favorite-collections-grid">
							{collections.map((collection) => {
								const coverImage =
									collection.coverImage &&
									typeof collection.coverImage === 'object'
										? collection.coverImage
										: null;

								return (
									<div
										key={collection._id}
										className="favorite-collection-card"
										onClick={() => handleCollectionClick(collection)}
									>
										<div className="favorite-collection-card-cover">
											{coverImage ? (
												<ProgressiveImage
													src={coverImage.imageUrl}
													thumbnailUrl={coverImage.thumbnailUrl}
													smallUrl={coverImage.smallUrl}
													regularUrl={coverImage.regularUrl}
													alt={collection.name}
												/>
											) : (
												<div className="favorite-collection-card-placeholder">
													<Folder size={48} />
												</div>
											)}
										</div>
										<div className="favorite-collection-card-info">
											<h3>{collection.name}</h3>
											{collection.description && (
												<p className="favorite-collection-card-description">
													{collection.description}
												</p>
											)}
											<div className="favorite-collection-card-meta">
												<span className="favorite-collection-card-count">
													{collection.imageCount || 0} ảnh
												</span>
												{typeof collection.createdBy === 'object' &&
													collection.createdBy && (
														<span className="favorite-collection-card-author">
															bởi {collection.createdBy.displayName || collection.createdBy.username}
														</span>
													)}
											</div>
										</div>
									</div>
								);
							})}
						</div>

						{pagination && pagination.pages > 1 && (
							<div className="favorite-collections-pagination">
								<button
									className="pagination-btn"
									onClick={() => fetchFavoriteCollections(currentPage - 1)}
									disabled={currentPage === 1}
								>
									← Trước
								</button>
								<span className="pagination-info">
									Trang {currentPage} / {pagination.pages}
								</span>
								<button
									className="pagination-btn"
									onClick={() => fetchFavoriteCollections(currentPage + 1)}
									disabled={currentPage === pagination.pages}
								>
									Sau →
								</button>
							</div>
						)}
					</>
				)}
			</div>
		</>
	);
}


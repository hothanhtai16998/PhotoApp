import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Header from '@/components/Header';
import { collectionService } from '@/services/collectionService';
import type { Collection } from '@/types/collection';
import type { Image } from '@/types/image';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/useAuthStore';
import { generateImageSlug, extractIdFromSlug } from '@/lib/utils';
import ImageModal from '@/components/ImageModal';
import ProgressiveImage from '@/components/ProgressiveImage';
import api from '@/lib/axios';
import './CollectionDetailPage.css';

export default function CollectionDetailPage() {
	const { collectionId } = useParams<{ collectionId: string }>();
	const navigate = useNavigate();
	const [searchParams, setSearchParams] = useSearchParams();
	const { accessToken } = useAuthStore();
	const [collection, setCollection] = useState<Collection | null>(null);
	const [loading, setLoading] = useState(true);
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
				</div>

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
								return (
									<div
										key={image._id}
										className={`collection-image-item ${imageType}`}
										onClick={() => {
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


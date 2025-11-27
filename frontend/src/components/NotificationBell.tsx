import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, X, Check, CheckCheck, Trash2, Users, Image as ImageIcon, Shield, Folder, RefreshCw, Heart, Download, Share2, Upload, CheckCircle, XCircle, Loader2, Star, AlertTriangle, Ban, User, Eye, Key, Mail, Smartphone, LogIn, Megaphone, Wrench, FileText, Sparkles, Flag, UserPlus, UserMinus } from 'lucide-react';
import { notificationService, type Notification } from '@/services/notificationService';
import { useAuthStore } from '@/stores/useAuthStore';
import { useUserStore } from '@/stores/useUserStore';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import './NotificationBell.css';

export default function NotificationBell() {
	const { accessToken } = useAuthStore();
	const { user } = useUserStore();
	const navigate = useNavigate();
	const [notifications, setNotifications] = useState<Notification[]>([]);
	const [unreadCount, setUnreadCount] = useState(0);
	const [isOpen, setIsOpen] = useState(false);
	const [loading, setLoading] = useState(true);
	const [refreshing, setRefreshing] = useState(false);
	const [hasNewNotification, setHasNewNotification] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);
	const bellButtonRef = useRef<HTMLButtonElement>(null);
	const pollingIntervalRef = useRef<number | null>(null);
	const previousUnreadCountRef = useRef(0);

	// Get notification message helper
	const getNotificationMessage = useCallback((notification: Notification): string => {
		const actorName = notification.actor?.displayName || notification.actor?.username || 'Ai đó';
		const collectionName = notification.collection?.name || 'bộ sưu tập';

		const imageTitle = notification.image?.imageTitle || 'ảnh của bạn';

		switch (notification.type) {
			case 'collection_invited': {
				const permission = notification.metadata?.permission;
				const permissionText =
					permission === 'admin'
						? 'quản trị'
						: permission === 'edit'
						? 'chỉnh sửa'
						: 'xem';
				return `${actorName} đã mời bạn tham gia bộ sưu tập "${collectionName}" với quyền ${permissionText}`;
			}
			case 'collection_image_added':
				return `${actorName} đã thêm ảnh vào bộ sưu tập "${collectionName}"`;
			case 'collection_image_removed':
				return `${actorName} đã xóa ảnh khỏi bộ sưu tập "${collectionName}"`;
			case 'collection_permission_changed':
				return `${actorName} đã thay đổi quyền của bạn trong bộ sưu tập "${collectionName}"`;
			case 'collection_removed':
				return `Bạn đã bị xóa khỏi bộ sưu tập "${collectionName}"`;
			case 'image_favorited':
				return `${actorName} đã yêu thích ảnh "${imageTitle}"`;
			case 'image_downloaded':
				return `${actorName} đã tải xuống ảnh "${imageTitle}"`;
			case 'collection_favorited':
				return `${actorName} đã yêu thích bộ sưu tập "${collectionName}"`;
			case 'collection_shared':
				return `${actorName} đã chia sẻ bộ sưu tập "${collectionName}"`;
			case 'upload_completed':
				return `Ảnh "${notification.image?.imageTitle || notification.metadata?.imageTitle || 'của bạn'}" đã tải lên thành công`;
			case 'upload_failed':
				return `Tải lên ảnh "${notification.metadata?.imageTitle || 'của bạn'}" thất bại: ${notification.metadata?.error || 'Lỗi không xác định'}`;
			case 'upload_processing':
				return `Đã xử lý ảnh: nén và tạo thumbnail thành công`;
			case 'bulk_upload_completed': {
				const successCount = notification.metadata?.successCount || 0;
				const totalCount = notification.metadata?.totalCount || 0;
				const failedCount = notification.metadata?.failedCount || 0;
				if (failedCount === 0) {
					return `Đã tải lên thành công ${successCount}/${totalCount} ảnh`;
				} else {
					return `Đã tải lên ${successCount}/${totalCount} ảnh (${failedCount} thất bại)`;
				}
			}
			case 'collection_updated': {
				const changes = (notification.metadata?.changes as string[]) || [];
				const changeText = changes.length > 0 
					? changes.join(', ')
					: 'thông tin';
				return `${actorName} đã cập nhật ${changeText} của bộ sưu tập "${collectionName}"`;
			}
			case 'collection_cover_changed':
				return `${actorName} đã thay đổi ảnh bìa của bộ sưu tập "${collectionName}"`;
			case 'collection_reordered': {
				const imageCount = notification.metadata?.imageCount || 0;
				return `${actorName} đã sắp xếp lại ${imageCount} ảnh trong bộ sưu tập "${collectionName}"`;
			}
			case 'bulk_delete_completed': {
				const deletedCount = notification.metadata?.deletedCount || 0;
				return `Đã xóa thành công ${deletedCount} ảnh`;
			}
			case 'bulk_add_to_collection': {
				const addedCount = notification.metadata?.addedCount || 0;
				return `Đã thêm ${addedCount} ảnh vào bộ sưu tập "${collectionName}"`;
			}
			case 'image_featured':
				return `Ảnh "${imageTitle}" đã được đưa lên trang chủ`;
			case 'image_removed':
			case 'image_removed_admin': {
				const reason = notification.metadata?.reason || 'Lý do không xác định';
				return `Ảnh "${imageTitle}" đã bị xóa bởi quản trị viên: ${reason}`;
			}
			case 'account_verified':
				return `Tài khoản của bạn đã được xác minh`;
			case 'account_warning': {
				const warningReason = notification.metadata?.reason || 'Vi phạm quy tắc';
				return `Cảnh báo: ${warningReason}`;
			}
			case 'account_banned':
			case 'user_banned_admin': {
				const banReason = notification.metadata?.reason || 'Vi phạm quy tắc';
				const bannedBy = notification.metadata?.bannedBy || 'Quản trị viên';
				return `Tài khoản của bạn đã bị cấm bởi ${bannedBy}: ${banReason}`;
			}
			case 'user_unbanned_admin': {
				const unbannedBy = notification.metadata?.unbannedBy || 'Quản trị viên';
				return `Tài khoản của bạn đã được bỏ cấm bởi ${unbannedBy}`;
			}
			case 'profile_viewed':
				return `${actorName} đã xem hồ sơ của bạn`;
			case 'profile_updated': {
				const changedFields = (notification.metadata?.changedFields as string[]) || [];
				if (changedFields.length === 0) {
					return 'Hồ sơ của bạn đã được cập nhật';
				}
				
				// Map field names to user-friendly Vietnamese names
				const fieldNames: Record<string, string> = {
					displayName: 'tên hiển thị',
					firstName: 'tên',
					lastName: 'họ',
					email: 'email',
					bio: 'tiểu sử',
					location: 'địa điểm',
					phone: 'số điện thoại',
					website: 'trang web',
					instagram: 'Instagram',
					twitter: 'Twitter',
					facebook: 'Facebook',
				};
				
				const translatedFields = changedFields.map(field => fieldNames[field] || field);
				const fieldsText = translatedFields.join(', ');
				return `Hồ sơ của bạn đã được cập nhật: ${fieldsText}`;
			}
			case 'login_new_device': {
				const deviceUserAgent = (notification.metadata?.userAgent as string) || 'Thiết bị mới';
				const deviceIpAddress = (notification.metadata?.ipAddress as string) || 'IP không xác định';
				// Extract browser name from user agent
				const browserName = deviceUserAgent.includes('Chrome') ? 'Chrome' :
					deviceUserAgent.includes('Firefox') ? 'Firefox' :
					deviceUserAgent.includes('Safari') ? 'Safari' :
					deviceUserAgent.includes('Edge') ? 'Edge' :
					'Thiết bị mới';
				return `Đăng nhập từ ${browserName} (${deviceIpAddress})`;
			}
			case 'password_changed': {
				const changeIp = notification.metadata?.ipAddress || 'IP không xác định';
				return `Mật khẩu của bạn đã được thay đổi từ ${changeIp}`;
			}
			case 'email_changed': {
				const oldEmail = notification.metadata?.oldEmail || 'Email cũ';
				const newEmail = notification.metadata?.newEmail || 'Email mới';
				return `Email đã được thay đổi từ ${oldEmail} sang ${newEmail}`;
			}
			case 'two_factor_enabled':
				return `Xác thực hai yếu tố đã được bật cho tài khoản của bạn`;
			case 'system_announcement': {
				const announcementTitle = notification.metadata?.title || 'Thông báo hệ thống';
				return `${announcementTitle}: ${notification.metadata?.message || 'Bạn có thông báo mới'}`;
			}
			case 'feature_update': {
				const featureTitle = notification.metadata?.title || 'Tính năng mới';
				return `${featureTitle}: ${notification.metadata?.message || 'Có tính năng mới được cập nhật'}`;
			}
			case 'maintenance_scheduled': {
				const maintenanceTitle = notification.metadata?.title || 'Bảo trì hệ thống';
				return `${maintenanceTitle}: ${notification.metadata?.message || 'Hệ thống sẽ được bảo trì'}`;
			}
			case 'terms_updated': {
				const termsTitle = notification.metadata?.title || 'Cập nhật điều khoản';
				return `${termsTitle}: ${notification.metadata?.message || 'Điều khoản sử dụng đã được cập nhật'}`;
			}
			case 'image_reported': {
				const imageReportReason = notification.metadata?.reason || 'Lý do không xác định';
				const imageReportDescription = notification.metadata?.description ? ` - ${notification.metadata.description}` : '';
				return `Ảnh "${imageTitle}" đã được báo cáo: ${imageReportReason}${imageReportDescription}`;
			}
			case 'collection_reported': {
				const collectionReportReason = notification.metadata?.reason || 'Lý do không xác định';
				const collectionReportDescription = notification.metadata?.description ? ` - ${notification.metadata.description}` : '';
				return `Bộ sưu tập "${collectionName}" đã được báo cáo: ${collectionReportReason}${collectionReportDescription}`;
			}
			case 'user_reported': {
				const userReportReason = notification.metadata?.reason || 'Lý do không xác định';
				const userReportDescription = notification.metadata?.description ? ` - ${notification.metadata.description}` : '';
				return `Người dùng đã được báo cáo: ${userReportReason}${userReportDescription}`;
			}
			case 'user_followed':
				return `${actorName} đã bắt đầu theo dõi bạn`;
			case 'user_unfollowed':
				return `${actorName} đã ngừng theo dõi bạn`;
			default:
				return 'Bạn có thông báo mới';
		}
	}, []);


	// Fetch notifications
	const fetchNotifications = useCallback(async (showLoading = false) => {
		if (!accessToken || !user) return;

		if (showLoading) {
			setRefreshing(true);
		}

		try {
			const response = await notificationService.getNotifications({ limit: 20 });
			const newNotifications = response.notifications;
			const newUnreadCount = response.unreadCount;

			// Check for new notifications and trigger visual feedback
			if (previousUnreadCountRef.current > 0 && newUnreadCount > previousUnreadCountRef.current) {
				// New notification arrived - trigger bell animation
				setHasNewNotification(true);
				setTimeout(() => setHasNewNotification(false), 500);
			} else if (previousUnreadCountRef.current === 0 && newUnreadCount > 0) {
				// First notification after having none - trigger bell animation
				setHasNewNotification(true);
				setTimeout(() => setHasNewNotification(false), 500);
			}

			setNotifications(newNotifications);
			setUnreadCount(newUnreadCount);
			previousUnreadCountRef.current = newUnreadCount;
		} catch (error) {
			console.error('Failed to fetch notifications:', error);
		} finally {
			if (showLoading) {
				setRefreshing(false);
			}
			setLoading(false);
		}
	}, [accessToken, user]);

	// Poll for unread count - Option 3: Faster polling (5 seconds)
	useEffect(() => {
		if (!accessToken || !user) return;

		// Initial fetch
		fetchNotifications();

		// Poll for updates - Option 3: Faster polling (5 seconds)
		pollingIntervalRef.current = setInterval(() => {
			notificationService.getUnreadCount()
				.then(count => {
					// If count increased, fetch full notifications
					if (count > unreadCount) {
						fetchNotifications();
					} else {
						setUnreadCount(count);
					}
				})
				.catch(err => console.error('Failed to fetch unread count:', err));
		}, 5000); // Poll every 5 seconds (Option 3: Faster polling)

		return () => {
			if (pollingIntervalRef.current) {
				clearInterval(pollingIntervalRef.current);
			}
		};
	}, [accessToken, user, fetchNotifications, unreadCount]);

	// Listen for manual refresh triggers (Option 3: Optimistic update)
	useEffect(() => {
		const handleRefresh = () => {
			fetchNotifications();
		};

		window.addEventListener('notification:refresh', handleRefresh);
		return () => {
			window.removeEventListener('notification:refresh', handleRefresh);
		};
	}, [fetchNotifications]);

	// Close dropdown when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		};

		if (isOpen) {
			document.addEventListener('mousedown', handleClickOutside);
			return () => document.removeEventListener('mousedown', handleClickOutside);
		}
	}, [isOpen]);

	// Fetch notifications when dropdown opens
	useEffect(() => {
		if (isOpen && accessToken) {
			fetchNotifications();
		}
	}, [isOpen, accessToken, fetchNotifications]);

	const handleMarkAsRead = async (notificationId: string) => {
		try {
			const response = await notificationService.markAsRead(notificationId);
			setUnreadCount(response.unreadCount);
			setNotifications(prev =>
				prev.map(notif =>
					notif._id === notificationId
						? { ...notif, isRead: true, readAt: new Date().toISOString() }
						: notif
				)
			);
		} catch (error) {
			console.error('Failed to mark notification as read:', error);
			toast.error('Không thể đánh dấu đã đọc');
		}
	};

	const handleMarkAllAsRead = async () => {
		try {
			await notificationService.markAllAsRead();
			setUnreadCount(0);
			setNotifications(prev =>
				prev.map(notif => ({ ...notif, isRead: true, readAt: new Date().toISOString() }))
			);
			toast.success('Đã đánh dấu tất cả là đã đọc');
		} catch (error) {
			console.error('Failed to mark all as read:', error);
			toast.error('Không thể đánh dấu tất cả là đã đọc');
		}
	};

	const handleDelete = async (notificationId: string, e: React.MouseEvent) => {
		e.stopPropagation();
		try {
			const response = await notificationService.deleteNotification(notificationId);
			setUnreadCount(response.unreadCount);
			setNotifications(prev => prev.filter(notif => notif._id !== notificationId));
		} catch (error) {
			console.error('Failed to delete notification:', error);
			toast.error('Không thể xóa thông báo');
		}
	};

	const handleNotificationClick = (notification: Notification) => {
		if (!notification.isRead) {
			handleMarkAsRead(notification._id);
		}

		setIsOpen(false);

		// Navigate based on notification type
		if (notification.image?._id) {
			// For image-related notifications, navigate to the image
			const imageTitle = notification.image.imageTitle || '';
			const imageSlug = imageTitle 
				? `${imageTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${notification.image._id.slice(-12)}`
				: notification.image._id.slice(-12);
			navigate(`/?image=${imageSlug}`);
		} else if (notification.collection?._id) {
			// For collection-related notifications, navigate to the collection
			navigate(`/collections/${notification.collection._id}`);
		} else if (notification.type === 'user_followed' || notification.type === 'user_unfollowed') {
			// For follow notifications, navigate to the actor's profile (if we add profile viewing)
			// For now, just close the notification
		}
	};

	const getNotificationIcon = (type: Notification['type']) => {
		switch (type) {
			case 'collection_invited':
				return <Users size={16} />;
			case 'collection_image_added':
			case 'collection_image_removed':
				return <ImageIcon size={16} />;
			case 'collection_permission_changed':
				return <Shield size={16} />;
			case 'collection_removed':
				return <Folder size={16} />;
			case 'image_favorited':
			case 'collection_favorited':
				return <Heart size={16} />;
			case 'image_downloaded':
				return <Download size={16} />;
			case 'collection_shared':
				return <Share2 size={16} />;
			case 'upload_completed':
				return <CheckCircle size={16} />;
			case 'upload_failed':
				return <XCircle size={16} />;
			case 'upload_processing':
				return <Loader2 size={16} className="spinning" />;
			case 'bulk_upload_completed':
				return <Upload size={16} />;
			case 'collection_updated':
			case 'collection_cover_changed':
				return <Folder size={16} />;
			case 'collection_reordered':
				return <RefreshCw size={16} />;
			case 'bulk_delete_completed':
				return <Trash2 size={16} />;
			case 'bulk_add_to_collection':
				return <ImageIcon size={16} />;
			case 'image_featured':
				return <Star size={16} />;
			case 'image_removed':
				return <Trash2 size={16} />;
			case 'account_verified':
				return <CheckCircle size={16} />;
			case 'account_warning':
				return <AlertTriangle size={16} />;
			case 'account_banned':
			case 'user_banned_admin':
				return <Ban size={16} />;
			case 'user_unbanned_admin':
				return <CheckCircle size={16} />;
			case 'image_removed_admin':
				return <Trash2 size={16} />;
			case 'profile_viewed':
				return <Eye size={16} />;
			case 'profile_updated':
				return <User size={16} />;
			case 'login_new_device':
				return <LogIn size={16} />;
			case 'password_changed':
				return <Key size={16} />;
			case 'email_changed':
				return <Mail size={16} />;
			case 'two_factor_enabled':
				return <Smartphone size={16} />;
			case 'system_announcement':
				return <Megaphone size={16} />;
			case 'feature_update':
				return <Sparkles size={16} />;
			case 'maintenance_scheduled':
				return <Wrench size={16} />;
			case 'terms_updated':
				return <FileText size={16} />;
			case 'image_reported':
			case 'collection_reported':
			case 'user_reported':
				return <Flag size={16} />;
			case 'user_followed':
				return <UserPlus size={16} />;
			case 'user_unfollowed':
				return <UserMinus size={16} />;
			default:
				return <Bell size={16} />;
		}
	};

	// Manual refresh handler
	const handleManualRefresh = useCallback(async () => {
		await fetchNotifications(true);
		toast.success('Đã làm mới thông báo');
	}, [fetchNotifications]);

	if (!accessToken || !user) return null;

	return (
		<div className="notification-bell-wrapper" ref={dropdownRef}>
			<button
				ref={bellButtonRef}
				className={`notification-bell-btn ${hasNewNotification ? 'new-notification' : ''}`}
				onClick={() => setIsOpen(!isOpen)}
				aria-label="Thông báo"
				title="Thông báo"
			>
				<Bell size={20} />
				{unreadCount > 0 && (
					<span className="notification-bell-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
				)}
			</button>

			{isOpen && (
				<div className="notification-dropdown">
					<div className="notification-dropdown-header">
						<h3>Thông báo</h3>
						<div className="notification-dropdown-actions">
							<button
								className={`notification-action-btn ${refreshing ? 'refreshing' : ''}`}
								onClick={handleManualRefresh}
								title="Làm mới"
								disabled={refreshing}
							>
								<RefreshCw size={16} />
							</button>
							{unreadCount > 0 && (
								<button
									className="notification-action-btn"
									onClick={handleMarkAllAsRead}
									title="Đánh dấu tất cả là đã đọc"
								>
									<CheckCheck size={16} />
								</button>
							)}
							<button
								className="notification-action-btn"
								onClick={() => setIsOpen(false)}
								title="Đóng"
							>
								<X size={16} />
							</button>
						</div>
					</div>

					<div className="notification-dropdown-content">
						{loading ? (
							<div className="notification-loading">
								<p>Đang tải...</p>
							</div>
						) : notifications.length === 0 ? (
							<div className="notification-empty">
								<Bell size={32} />
								<p>Không có thông báo nào</p>
							</div>
						) : (
							<div className="notification-list">
								{notifications.map(notification => (
									<div
										key={notification._id}
										className={`notification-item ${!notification.isRead ? 'unread' : ''}`}
										onClick={() => handleNotificationClick(notification)}
									>
										<div className="notification-item-icon">
											{getNotificationIcon(notification.type)}
										</div>
										<div className="notification-item-content">
											<p className="notification-item-message">
												{getNotificationMessage(notification)}
											</p>
											<span className="notification-item-time">
												{formatNotificationTime(notification.createdAt)}
											</span>
										</div>
										<div className="notification-item-actions">
											{!notification.isRead && (
												<button
													className="notification-item-action-btn"
													onClick={(e) => {
														e.stopPropagation();
														handleMarkAsRead(notification._id);
													}}
													title="Đánh dấu đã đọc"
												>
													<Check size={14} />
												</button>
											)}
											<button
												className="notification-item-action-btn"
												onClick={(e) => handleDelete(notification._id, e)}
												title="Xóa"
											>
												<Trash2 size={14} />
											</button>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
}

function formatNotificationTime(dateString: string): string {
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

	// Format as date
	return date.toLocaleDateString('vi-VN', {
		day: 'numeric',
		month: 'short',
		year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
	});
}


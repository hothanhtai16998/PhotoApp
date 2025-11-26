import api from '@/lib/axios';

export interface Notification {
	_id: string;
	recipient: string;
	type: 
		| 'collection_invited' 
		| 'collection_image_added' 
		| 'collection_image_removed' 
		| 'collection_permission_changed' 
		| 'collection_removed'
		| 'image_favorited'
		| 'image_downloaded'
		| 'collection_favorited'
		| 'collection_shared'
		| 'upload_completed'
		| 'upload_failed'
		| 'upload_processing'
		| 'bulk_upload_completed'
		| 'collection_updated'
		| 'collection_cover_changed'
		| 'collection_reordered'
		| 'bulk_delete_completed'
		| 'bulk_add_to_collection'
		| 'image_featured'
		| 'image_removed'
		| 'account_verified'
		| 'account_warning'
		| 'account_banned'
		| 'profile_viewed'
		| 'profile_updated'
		| 'login_new_device'
		| 'password_changed'
		| 'email_changed'
		| 'two_factor_enabled'
		| 'system_announcement'
		| 'feature_update'
		| 'maintenance_scheduled'
		| 'terms_updated'
		| 'image_reported'
		| 'collection_reported'
		| 'user_reported';
	collection?: {
		_id: string;
		name: string;
		coverImage?: {
			_id: string;
			thumbnailUrl?: string;
			smallUrl?: string;
		};
	};
	actor?: {
		_id: string;
		username: string;
		displayName: string;
		avatarUrl?: string;
	};
	image?: {
		_id: string;
		imageTitle?: string;
		thumbnailUrl?: string;
		smallUrl?: string;
	};
	metadata?: {
		permission?: string;
		collectionName?: string;
		[key: string]: any;
	};
	isRead: boolean;
	readAt?: string;
	createdAt: string;
	updatedAt: string;
}

export interface NotificationsResponse {
	success: boolean;
	notifications: Notification[];
	unreadCount: number;
}

export interface UnreadCountResponse {
	success: boolean;
	unreadCount: number;
}

export const notificationService = {
	/**
	 * Get user's notifications
	 */
	getNotifications: async (params?: {
		unreadOnly?: boolean;
		limit?: number;
	}): Promise<NotificationsResponse> => {
		const queryParams = new URLSearchParams();
		if (params?.unreadOnly) {
			queryParams.append('unreadOnly', 'true');
		}
		if (params?.limit) {
			queryParams.append('limit', params.limit.toString());
		}

		const queryString = queryParams.toString();
		const url = queryString ? `/notifications?${queryString}` : '/notifications';

		const response = await api.get<NotificationsResponse>(url, {
			withCredentials: true,
		});
		return response.data;
	},

	/**
	 * Get unread notification count
	 */
	getUnreadCount: async (): Promise<number> => {
		const response = await api.get<UnreadCountResponse>('/notifications/unread-count', {
			withCredentials: true,
		});
		return response.data.unreadCount;
	},

	/**
	 * Mark notification as read
	 */
	markAsRead: async (notificationId: string): Promise<{ success: boolean; unreadCount: number }> => {
		const response = await api.patch(
			`/notifications/${notificationId}/read`,
			{},
			{
				withCredentials: true,
			}
		);
		return response.data;
	},

	/**
	 * Mark all notifications as read
	 */
	markAllAsRead: async (): Promise<{ success: boolean }> => {
		const response = await api.patch(
			'/notifications/read-all',
			{},
			{
				withCredentials: true,
			}
		);
		return response.data;
	},

	/**
	 * Delete notification
	 */
	deleteNotification: async (notificationId: string): Promise<{ success: boolean; unreadCount: number }> => {
		const response = await api.delete(`/notifications/${notificationId}`, {
			withCredentials: true,
		});
		return response.data;
	},
};


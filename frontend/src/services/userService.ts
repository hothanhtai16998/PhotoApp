import api from '@/lib/axios';

export interface UserSearchResult {
	_id: string;
	username: string;
	email: string;
	displayName: string;
	avatarUrl?: string;
}

export interface PublicUser {
	_id: string;
	username: string;
	displayName: string;
	avatarUrl?: string;
	bio?: string;
	createdAt: string;
}

export const userService = {
	changePassword: async (
		password: string,
		newPassword: string,
		newPasswordMatch: string
	) => {
		const res = await api.put(
			'/users/change-password',
			{
				password,
				newPassword,
				newPasswordMatch,
			},
			{ withCredentials: true }
		);
		return res.data;
	},

	updateProfile: async (
		formData: FormData
	) => {
		const res = await api.put(
			'/users/change-info',
			formData,
			{
				withCredentials: true,
				headers: {
					'Content-Type':
						'multipart/form-data',
				},
			}
		);
		return res.data;
	},

	searchUsers: async (
		search: string,
		limit?: number
	): Promise<{ users: UserSearchResult[] }> => {
		const res = await api.get('/users/search', {
			params: { search, limit },
			withCredentials: true,
		});
		return res.data;
	},

	/**
	 * Get public user data by username
	 * @param username Username to fetch
	 */
	getUserByUsername: async (username: string): Promise<PublicUser> => {
		const res = await api.get(`/users/username/${username}`, {
			withCredentials: true,
		});
		return res.data.user;
	},

	/**
	 * Get public user data by userId
	 * @param userId User ID to fetch
	 */
	getUserById: async (userId: string): Promise<PublicUser> => {
		const res = await api.get(`/users/${userId}`, {
			withCredentials: true,
		});
		return res.data.user;
	},
};

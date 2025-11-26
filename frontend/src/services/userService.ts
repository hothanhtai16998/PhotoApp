import api from '@/lib/axios';

export interface UserSearchResult {
	_id: string;
	username: string;
	email: string;
	displayName: string;
	avatarUrl?: string;
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

	searchUsers: async (search: string, limit = 10, signal?: AbortSignal): Promise<UserSearchResult[]> => {
		if (!search || search.length < 2) {
			return [];
		}
		const res = await api.get<{ users: UserSearchResult[] }>(
			`/users/search?search=${encodeURIComponent(search)}&limit=${limit}`,
			{ 
				withCredentials: true,
				signal, // Support request cancellation
			}
		);
		return res.data.users;
	},
};

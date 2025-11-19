import api from '@/lib/axios';

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
};

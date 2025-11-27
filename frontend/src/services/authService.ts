import api from '@/lib/axios';
import type {
	SignUpResponse,
	SignInResponse,
	SignOutResponse,
	RefreshTokenResponse,
	CheckEmailAvailabilityResponse,
	CheckUsernameAvailabilityResponse,
	FetchMeResponse,
} from '@/types/auth';
import type { User } from '@/types/user';

export const authService = {
	signUp: async (
		username: string,
		password: string,
		email: string,
		firstName: string,
		lastName: string,
		phone?: string,
		bio?: string
	): Promise<SignUpResponse> => {
		const res = await api.post<SignUpResponse>(
			'/auth/signup',
			{
				username,
				password,
				email,
				firstName,
				lastName,
				phone,
				bio,
			},
			{ withCredentials: true }
		);

		return res.data;
	},

	signIn: async (
		username: string,
		password: string
	): Promise<SignInResponse> => {
		const res = await api.post<SignInResponse>(
			'/auth/signin',
			{ username, password },
			{ withCredentials: true }
		);
		return res.data;
	},

	signOut: async (): Promise<SignOutResponse> => {
		const res = await api.post<SignOutResponse>(
			'/auth/signout',
			{},
			{ withCredentials: true }
		);
		return res.data;
	},

	fetchMe: async (): Promise<User> => {
		const res = await api.get<FetchMeResponse>(
			'/users/me',
			{ withCredentials: true }
		);
		return res.data.user;
	},

	refresh: async (): Promise<string> => {
		const res = await api.post<RefreshTokenResponse>(
			'/auth/refresh',
			{},
			{ withCredentials: true }
		);
		return res.data.accessToken;
	},

	checkEmailAvailability: async (email: string): Promise<CheckEmailAvailabilityResponse> => {
		const res = await api.get<CheckEmailAvailabilityResponse>(
			`/auth/check-email?email=${encodeURIComponent(email)}`,
			{ withCredentials: true }
		);
		return res.data;
	},

	checkUsernameAvailability: async (username: string): Promise<CheckUsernameAvailabilityResponse> => {
		const res = await api.get<CheckUsernameAvailabilityResponse>(
			`/auth/check-username?username=${encodeURIComponent(username)}`,
			{ withCredentials: true }
		);
		return res.data;
	},
};

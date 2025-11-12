import { create } from "zustand";
import { toast } from "sonner";
import { authService } from "@/services/authService";
import type { AuthState } from "@/types/store";

export const useAuthStore = create<AuthState>((set, get) => ({
	accessToken: null,
	user: null,
	loading: false,

	setAccessToken: (accessToken) => {
		set({ accessToken });
	}
	,
	clearState: () => {
        set({ accessToken: null, user: null, loading: false });
    },
    //...
	signUp: async (username, password, email, firstName, lastName) => {
		try {
			set({ loading: true });
			// gọi backend để đăng ký
            await authService.signUp(username, password, email, firstName, lastName);
			//...
			toast.success("Đăng ký thành công! Chuyển sang trang đăng nhập.");
		} catch (error) {
			console.error(error);
			toast.error("Đăng ký thất bại! Vui lòng thử lại.");
		} finally {
			set({ loading: false });
		}
	},

	signIn: async (username, password) => {
		try {
			set({ loading: true });
			const { accessToken } = await authService.signIn(username, password);
			get().setAccessToken(accessToken);
			await get().fetchMe(); // lấy thông tin người dùng vào store
			
			toast.success("Chào mừng bạn quay lại với PhotoShare 🎆🎆🎆");
		} catch (error) {
			console.error(error);
            toast.error("Đăng nhập không thành công");	
		}
		finally {
            set({ loading: false });
        }
	},

	signOut: async () => {
        try {
			get().clearState();
			await authService.signOut();
			toast.success("Logout thành công!");
		} catch (error) {
			console.error(error);
            toast.error("Lỗi xảy ra khi logout. Hãy thử lại!");
		}
    },

	fetchMe: async () => {
		try {
			set({ loading: true });
			const user = await authService.fetchMe();
			set({ user });
		} catch (error) {
			console.error(error);
			set({ user: null , accessToken: null});
			toast.error("Lỗi xảy ra khi lấy thông tin người dùng. Hãy thử lại!");
		}
		finally {
            set({ loading: false });
        }
	},

	refresh: async () => {
		try {
			set({ loading: true });
			const {user, fetchMe, setAccessToken} = get();
			const accessToken = await authService.refresh();

			setAccessToken(accessToken); // cập nhật token mới vào store
			
			if (!user) {
				await fetchMe(); // lấy thông tin người dùng vào store
			}
		} catch (error) {
			console.error(error);
            toast.error("Lỗi xảy ra khi refresh token. Hãy thử đăng nhập lại!");
			get().clearState();
		}
		finally{
			set({ loading: false });
		}
	}
}));

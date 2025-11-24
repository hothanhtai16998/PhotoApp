import type { AdminRolePermissions } from '@/services/adminService';

export interface User {
	_id: string;
	username: string;
	email: string;
	displayName: string;
	avatarUrl?: string;
	bio?: string;
	phone?: string;
	isOAuthUser?: boolean;
	isAdmin?: boolean;
	isSuperAdmin?: boolean;
	permissions?: AdminRolePermissions | null;
	createdAt?: string;
	updatedAt?: string;
}

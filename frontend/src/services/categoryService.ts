import api from '@/lib/axios';

export interface Category {
    _id: string;
    name: string;
    description?: string;
    isActive?: boolean;
    imageCount?: number;
}

export const categoryService = {
    fetchCategories: async (): Promise<Category[]> => {
        const res = await api.get('/categories', {
            withCredentials: true,
        });
        return res.data.categories || [];
    },

    getAllCategoriesAdmin: async (): Promise<Category[]> => {
        const res = await api.get('/categories/admin', {
            withCredentials: true,
        });
        return res.data.categories || [];
    },

    createCategory: async (data: { name: string; description?: string }): Promise<Category> => {
        const res = await api.post('/categories/admin', data, {
            withCredentials: true,
        });
        return res.data.category;
    },

    updateCategory: async (
        categoryId: string,
        data: { name?: string; description?: string; isActive?: boolean }
    ): Promise<Category> => {
        const res = await api.put(`/categories/admin/${categoryId}`, data, {
            withCredentials: true,
        });
        return res.data.category;
    },

    deleteCategory: async (categoryId: string): Promise<void> => {
        await api.delete(`/categories/admin/${categoryId}`, {
            withCredentials: true,
        });
    },
};


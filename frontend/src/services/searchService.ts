import { get } from '@/lib/api';

export interface SearchSuggestion {
  type: 'title' | 'tag' | 'location' | 'category';
  text: string;
  query: string;
}

export interface SearchSuggestionsResponse {
  suggestions: SearchSuggestion[];
  query?: string;
}

export interface PopularSearchesResponse {
  popular: SearchSuggestion[];
}

export const searchService = {
  /**
   * Get search suggestions based on query
   */
  getSuggestions: async (
    query: string,
    limit: number = 10
  ): Promise<SearchSuggestion[]> => {
    if (!query || query.trim().length < 1) {
      return [];
    }

    try {
      const res = await get(`/search/suggestions?q=${encodeURIComponent(query.trim())}&limit=${limit}`, {
        withCredentials: true,
      });

      return res.data.suggestions || [];
    } catch (error) {
      console.error('Failed to fetch search suggestions:', error);
      return [];
    }
  },

  /**
   * Get popular searches
   */
  getPopularSearches: async (): Promise<SearchSuggestion[]> => {
    try {
      const res = await get('/search/popular', {
        withCredentials: true,
      });

      return res.data.popular || [];
    } catch (error) {
      console.error('Failed to fetch popular searches:', error);
      return [];
    }
  },
};


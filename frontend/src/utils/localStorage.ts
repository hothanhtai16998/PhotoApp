/**
 * Centralized localStorage utilities
 * Provides type-safe access to localStorage with error handling
 */

export interface SearchFilters {
  orientation: 'all' | 'portrait' | 'landscape';
  color: 'all' | string;
  dateFrom: string;
  dateTo: string;
}

export interface SearchHistoryItem {
  query: string;
  timestamp: number;
}

const STORAGE_KEYS = {
  SEARCH_FILTERS: 'photoApp_searchFilters',
  SEARCH_HISTORY: 'photoApp_searchHistory',
  CONTACT_BUTTON_OPTION: 'contactButtonOption',
  ANIMATION_TYPE: 'photoApp_slideAnimationType',
} as const;

/**
 * Default search filters
 */
const DEFAULT_SEARCH_FILTERS: SearchFilters = {
  orientation: 'all',
  color: 'all',
  dateFrom: '',
  dateTo: '',
};

/**
 * Load search filters from localStorage
 */
export function loadSearchFilters(): SearchFilters {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SEARCH_FILTERS);
    if (stored) {
      return JSON.parse(stored) as SearchFilters;
    }
  } catch (error) {
    // Silently fail - return defaults
  }
  return { ...DEFAULT_SEARCH_FILTERS };
}

/**
 * Save search filters to localStorage
 */
export function saveSearchFilters(filters: SearchFilters): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SEARCH_FILTERS, JSON.stringify(filters));
  } catch (error) {
    // Silently fail - localStorage might be disabled
  }
}

/**
 * Load search history from localStorage
 */
export function loadSearchHistory(maxItems: number = 5): SearchHistoryItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.SEARCH_HISTORY);
    if (stored) {
      const history = JSON.parse(stored) as SearchHistoryItem[];
      return history.slice(0, maxItems);
    }
  } catch (error) {
    // Silently fail - return empty array
  }
  return [];
}

/**
 * Save search history to localStorage
 */
export function saveSearchHistory(history: SearchHistoryItem[], maxItems: number = 5): void {
  try {
    const limitedHistory = history.slice(0, maxItems);
    localStorage.setItem(STORAGE_KEYS.SEARCH_HISTORY, JSON.stringify(limitedHistory));
  } catch (error) {
    // Silently fail - localStorage might be disabled
  }
}

/**
 * Add a search query to history
 */
export function addToSearchHistory(query: string, maxItems: number = 5): SearchHistoryItem[] {
  if (!query.trim()) {
    return loadSearchHistory(maxItems);
  }

  try {
    const history = loadSearchHistory(maxItems);
    // Remove duplicates (case-insensitive)
    const filteredHistory = history.filter(
      (item) => item.query.toLowerCase() !== query.toLowerCase()
    );
    // Add to beginning
    const newHistory = [{ query: query.trim(), timestamp: Date.now() }, ...filteredHistory];
    saveSearchHistory(newHistory, maxItems);
    return newHistory;
  } catch (error) {
    return loadSearchHistory(maxItems);
  }
}

/**
 * Load contact button option from localStorage
 */
export function loadContactButtonOption(): 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'M' | 'N' {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.CONTACT_BUTTON_OPTION);
    if (stored && ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N'].includes(stored)) {
      return stored as 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'M' | 'N';
    }
  } catch (error) {
    // Silently fail
  }
  return 'A';
}

/**
 * Save contact button option to localStorage
 */
export function saveContactButtonOption(option: 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' | 'M' | 'N'): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CONTACT_BUTTON_OPTION, option);
  } catch (error) {
    // Silently fail
  }
}

/**
 * Load animation type from localStorage
 */
export function loadAnimationType(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.ANIMATION_TYPE);
  } catch (error) {
    return null;
  }
}

/**
 * Save animation type to localStorage
 */
export function saveAnimationType(animationType: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.ANIMATION_TYPE, animationType);
  } catch (error) {
    // Silently fail
  }
}


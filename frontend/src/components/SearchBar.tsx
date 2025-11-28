"use client"

import { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Search, X, Clock, TrendingUp, MapPin } from "lucide-react"
import axios from "axios"
import { useImageStore } from "@/stores/useImageStore"
import { categoryService, type Category } from "@/services/categoryService"
import { imageService } from "@/services/imageService"
import { searchService, type SearchSuggestion } from "@/services/searchService"
import { useRequestCancellationOnChange } from "@/hooks/useRequestCancellation"
import SearchFilters, { type SearchFilters as SearchFiltersType } from "./SearchFilters"
import { searchConfig } from '@/config/searchConfig';
import { appConfig } from '@/config/appConfig';
import './SearchBar.css'

export interface SearchBarRef {
  focus: () => void;
}

import { searchConfig } from '@/config/searchConfig';

interface SearchHistoryItem {
  query: string
  timestamp: number
}

export const SearchBar = forwardRef<SearchBarRef>((_props, ref) => {
  const { fetchImages, currentSearch } = useImageStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchQuery, setSearchQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [locations, setLocations] = useState<string[]>([])
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([])
  const [apiSuggestions, setApiSuggestions] = useState<SearchSuggestion[]>([])
  const [popularSearches, setPopularSearches] = useState<SearchSuggestion[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  // Load filters from localStorage
  const loadFiltersFromStorage = (): SearchFiltersType => {
    try {
      const stored = localStorage.getItem(searchConfig.filtersStorageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load filters:', error);
    }
    return {
      orientation: 'all',
      color: 'all',
      dateFrom: '',
      dateTo: '',
    };
  };

  const [filters, setFilters] = useState<SearchFiltersType>(loadFiltersFromStorage());
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suggestionsDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Expose focus method via ref
  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
    },
  }));

  // Load search history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(appConfig.storage.searchHistoryKey)
      if (stored) {
        const history = JSON.parse(stored) as SearchHistoryItem[]
        setSearchHistory(history.slice(0, searchConfig.maxHistoryItems))
      }
    } catch (error) {
      console.error('Failed to load search history:', error)
    }
  }, [])

  // Load categories and locations for suggestions
  useEffect(() => {
    const loadSuggestions = async () => {
      try {
        const [categories, locationsData, popular] = await Promise.all([
          categoryService.fetchCategories(),
          imageService.fetchLocations(),
          searchService.getPopularSearches()
        ])
        const categoryNames = categories.map((cat: Category) => cat.name)
        setSuggestions(categoryNames)
        setLocations(locationsData)
        setPopularSearches(popular)
      } catch (error) {
        console.error('Failed to load suggestions:', error)
      }
    }
    loadSuggestions()
  }, [])

  // Cancel previous requests when search query changes
  const cancelSignal = useRequestCancellationOnChange([searchQuery]);

  // Fetch API suggestions when user types (debounced)
  useEffect(() => {
    if (suggestionsDebounceRef.current) {
      clearTimeout(suggestionsDebounceRef.current)
    }

    const query = searchQuery.trim()
    
    if (query.length >= 1) {
      setLoadingSuggestions(true)
      suggestionsDebounceRef.current = setTimeout(async () => {
        try {
          // Pass cancellation signal to cancel if query changes
          const apiResults = await searchService.getSuggestions(query, 10, cancelSignal)
          setApiSuggestions(apiResults)
        } catch (error) {
          // Ignore cancelled requests
          if (axios.isCancel(error) || (error as { code?: string })?.code === 'ERR_CANCELED') {
            return; // Silently ignore
          }
          console.error('Failed to fetch API suggestions:', error)
          setApiSuggestions([])
        } finally {
          setLoadingSuggestions(false)
        }
      }, searchConfig.suggestionsDebounceMs)
    } else {
      setApiSuggestions([])
      setLoadingSuggestions(false)
    }

    return () => {
      if (suggestionsDebounceRef.current) {
        clearTimeout(suggestionsDebounceRef.current)
      }
    }
  }, [searchQuery, cancelSignal])

  // Sync with current search from store (only when not actively typing)
  useEffect(() => {
    // Only sync if user is not currently focused on input to avoid overwriting their typing
    if (currentSearch && currentSearch !== searchQuery && !isFocused) {
      setSearchQuery(currentSearch)
    }
  }, [currentSearch, searchQuery, isFocused])

  // Save to search history
  const saveToHistory = useCallback((query: string) => {
    if (!query.trim()) return

    try {
      const stored = localStorage.getItem(appConfig.storage.searchHistoryKey)
      let history: SearchHistoryItem[] = stored ? JSON.parse(stored) : []
      
      // Remove duplicates and add to beginning
      history = history.filter(item => item.query.toLowerCase() !== query.toLowerCase())
      history.unshift({ query: query.trim(), timestamp: Date.now() })
      
      // Keep only max history items
      history = history.slice(0, searchConfig.maxHistoryItems)
      
      localStorage.setItem(appConfig.storage.searchHistoryKey, JSON.stringify(history))
      setSearchHistory(history)
    } catch (error) {
      console.error('Failed to save search history:', error)
    }
  }, [])

  // Debounced search
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      if (location.pathname === '/') {
        if (searchQuery.trim()) {
          fetchImages({
            search: searchQuery.trim(),
          })
          saveToHistory(searchQuery.trim())
        } else {
          // Clear search if empty
          fetchImages({
            search: undefined,
          })
        }
      }
    }, searchConfig.searchDebounceMs)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, location.pathname])

  // Merge API suggestions with local suggestions
  const filteredSuggestions = (() => {
    const query = searchQuery.trim().toLowerCase()
    const seen = new Set<string>()
    const result: Array<{ type: string; value: string; apiType?: string }> = []

    if (query) {
      // When user is typing, prioritize API suggestions
      // 1. API suggestions (from backend - titles, tags, locations, categories)
      apiSuggestions.forEach(suggestion => {
        const key = suggestion.text.toLowerCase()
        if (!seen.has(key)) {
          result.push({
            type: suggestion.type === 'location' ? 'location' : 'api',
            value: suggestion.text,
            apiType: suggestion.type,
          })
          seen.add(key)
        }
      })

      // 2. Local matching locations (if not already in API suggestions)
      locations
        .filter(loc => 
          loc.toLowerCase().includes(query) &&
          !seen.has(loc.toLowerCase())
        )
        .forEach(loc => {
          result.push({ type: 'location', value: loc })
          seen.add(loc.toLowerCase())
        })

      // 3. Local matching categories (if not already in API suggestions)
      suggestions
        .filter(s => 
          s.toLowerCase().includes(query) &&
          !seen.has(s.toLowerCase())
        )
        .forEach(s => {
          result.push({ type: 'category', value: s })
          seen.add(s.toLowerCase())
        })

      // 4. Matching history (if not already shown)
      searchHistory
        .filter(item => 
          item.query.toLowerCase().includes(query) &&
          !seen.has(item.query.toLowerCase())
        )
        .forEach(item => {
          result.push({ type: 'history', value: item.query })
          seen.add(item.query.toLowerCase())
        })

      return result.slice(0, 10)
    } else {
      // When input is empty, show recent searches and popular
      // 1. Recent searches
      searchHistory.forEach(item => {
        if (!seen.has(item.query.toLowerCase())) {
          result.push({ type: 'history', value: item.query })
          seen.add(item.query.toLowerCase())
        }
      })

      // 2. Popular searches from API
      popularSearches.forEach(suggestion => {
        const key = suggestion.text.toLowerCase()
        if (!seen.has(key)) {
          result.push({
            type: suggestion.type === 'location' ? 'location' : 'popular',
            value: suggestion.text,
            apiType: suggestion.type,
          })
          seen.add(key)
        }
      })

      // 3. Popular locations
      locations.slice(0, 3).forEach(loc => {
        if (!seen.has(loc.toLowerCase())) {
          result.push({ type: 'location', value: loc })
          seen.add(loc.toLowerCase())
        }
      })

      // 4. Popular categories
      suggestions.slice(0, 5 - result.length).forEach(s => {
        if (!seen.has(s.toLowerCase())) {
          result.push({ type: 'category', value: s })
          seen.add(s.toLowerCase())
        }
      })

      return result.slice(0, 10)
    }
  })()

  const handleSearch = (query: string | { type: string; value: string }) => {
    const searchValue = typeof query === 'string' ? query : query.value
    setSearchQuery(searchValue)
    setShowSuggestions(false)
    setSelectedIndex(-1)
    inputRef.current?.blur()
    
    if (location.pathname !== '/') {
      navigate('/')
    }
    
    // Trigger search immediately
    // If it's a location, we can filter by location specifically
    const searchParams: { search?: string; location?: string } = {}
    if (typeof query !== 'string' && query.type === 'location') {
      // If user selects a location, filter by location
      searchParams.location = searchValue
    } else {
      // Otherwise, use general search (searches both title and location)
      searchParams.search = searchValue.trim() || undefined
    }
    
    fetchImages(searchParams)
    
    if (searchValue.trim()) {
      saveToHistory(searchValue.trim())
    }
  }

  const handleClear = () => {
    setSearchQuery('')
    setShowSuggestions(false)
    setSelectedIndex(-1)
    inputRef.current?.focus()
    
    if (location.pathname === '/') {
      fetchImages({
        search: undefined,
      })
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || filteredSuggestions.length === 0) {
      if (e.key === 'Enter') {
        handleSearch(searchQuery)
      }
      return
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < filteredSuggestions.length) {
          const selected = filteredSuggestions[selectedIndex]
          if (selected) {
            handleSearch(selected)
          }
        } else {
          handleSearch(searchQuery)
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        setSelectedIndex(-1)
        inputRef.current?.blur()
        break
    }
  }

  const handleFocus = () => {
    setIsFocused(true)
    setShowSuggestions(true)
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Delay to allow clicking on suggestions
    // The relatedTarget is where focus is moving to
    const relatedTarget = e.relatedTarget as HTMLElement | null;
    
    // If clicking on a suggestion, refocus input immediately
    if (relatedTarget && suggestionsRef.current?.contains(relatedTarget)) {
      // Keep input focused
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
      return;
    }
    
    // Otherwise, close suggestions after a delay
    setTimeout(() => {
      const currentActiveElement = document.activeElement;
      const isStillInSuggestions = suggestionsRef.current?.contains(currentActiveElement);
      const isStillInInput = inputRef.current === currentActiveElement;
      
      // Only close if focus is truly outside both input and suggestions
      if (!isStillInSuggestions && !isStillInInput) {
        setIsFocused(false)
        setShowSuggestions(false)
        setSelectedIndex(-1)
      }
    }, 200)
  }

  const clearHistory = () => {
    localStorage.removeItem(appConfig.storage.searchHistoryKey)
    setSearchHistory([])
  }

  return (
    <div className="search-bar-container">
      <form 
        onSubmit={(e) => {
          e.preventDefault()
          handleSearch(searchQuery)
        }} 
        className="header-search" 
        role="search" 
        aria-label="Tìm kiếm ảnh"
      >
        <div className="search-icon-left" aria-hidden="true">
          <Search size={20} />
        </div>
        <input
          ref={inputRef}
          type="text"
          placeholder="Tìm kiếm ảnh, minh họa..."
          value={searchQuery}
          onChange={(e) => {
            // Get the new value immediately
            const newValue = e.target.value;
            // Update state immediately - this should never be blocked
            setSearchQuery(newValue);
            setShowSuggestions(true);
            setSelectedIndex(-1);
            setIsFocused(true);
            // Ensure input stays focused
            if (document.activeElement !== e.target) {
              (e.target as HTMLInputElement).focus();
            }
          }}
          onInput={(e) => {
            // Backup handler in case onChange is blocked
            const newValue = (e.target as HTMLInputElement).value;
            if (newValue !== searchQuery) {
              setSearchQuery(newValue);
            }
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="search-input"
          aria-label="Tìm kiếm ảnh"
          aria-describedby="search-description"
          aria-expanded={showSuggestions}
          aria-autocomplete="list"
          autoComplete="off"
        />
        <span id="search-description" className="sr-only">
          Nhập từ khóa để tìm kiếm ảnh. Sử dụng phím mũi tên để điều hướng, Enter để chọn, Escape để đóng.
        </span>
        {searchQuery && (
          <button
            type="button"
            onClick={handleClear}
            className="search-clear"
            aria-label="Xóa tìm kiếm"
          >
            <X size={16} />
          </button>
        )}
        
        {/* Search Filters - Inside form for proper alignment */}
        <div className="search-filters-wrapper">
          <SearchFilters
            filters={filters}
            onFiltersChange={(newFilters) => {
              setFilters(newFilters);
              // Save to localStorage
              try {
                localStorage.setItem(searchConfig.filtersStorageKey, JSON.stringify(newFilters));
                // Dispatch custom event to notify ImageGrid of filter change
                window.dispatchEvent(new Event('filterChange'));
              } catch (error) {
                console.error('Failed to save filters:', error);
              }
              // Apply filters to current search - refetch images with new filters
              if (location.pathname === '/') {
                // Clear current images and refetch with new filters
                fetchImages({
                  search: searchQuery.trim() || undefined,
                  color: newFilters.color !== 'all' ? newFilters.color : undefined,
                  page: 1, // Reset to first page
                  _refresh: true, // Force refresh
                });
              }
            }}
            onReset={() => {
              const defaultFilters: SearchFiltersType = {
                orientation: 'all',
                color: 'all',
                dateFrom: '',
                dateTo: '',
              };
              setFilters(defaultFilters);
              try {
                localStorage.removeItem(searchConfig.filtersStorageKey);
                // Dispatch custom event to notify ImageGrid of filter change
                window.dispatchEvent(new Event('filterChange'));
              } catch (error) {
                console.error('Failed to clear filters:', error);
              }
            }}
          />
        </div>
      </form>

      {/* Search Suggestions Dropdown */}
      {showSuggestions && (isFocused || searchQuery) && (
        <div 
          ref={suggestionsRef}
          className="search-suggestions"
          role="listbox"
          aria-label="Gợi ý tìm kiếm"
        >
          {filteredSuggestions.length > 0 ? (
            <>
              {searchQuery.trim() ? (
                <div className="suggestions-header">
                  <TrendingUp size={14} />
                  <span>Gợi ý tìm kiếm</span>
                </div>
              ) : (
                <div className="suggestions-header">
                  <Clock size={14} />
                  <span>Tìm kiếm gần đây</span>
                  {searchHistory.length > 0 && (
                    <button
                      type="button"
                      onClick={clearHistory}
                      className="clear-history-btn"
                      aria-label="Xóa lịch sử"
                    >
                      Xóa
                    </button>
                  )}
                </div>
              )}
              <div className="suggestions-list">
                {loadingSuggestions && searchQuery.trim() ? (
                  <div className="suggestion-item" style={{ justifyContent: 'center', cursor: 'default' }}>
                    <span style={{ color: '#767676', fontSize: '0.875rem' }}>Đang tải gợi ý...</span>
                  </div>
                ) : (
                  filteredSuggestions.map((suggestion, index) => {
                    const suggestionValue = suggestion.value
                    const suggestionType = suggestion.type
                    const apiType = suggestion.apiType
                    const isHistory = searchHistory.some(
                      item => item.query.toLowerCase() === suggestionValue.toLowerCase()
                    ) || suggestionType === 'history'
                    
                    // Determine icon based on type
                    let icon = <Search size={16} className="suggestion-icon" />
                    if (suggestionType === 'location' || apiType === 'location') {
                      icon = <MapPin size={16} className="suggestion-icon" style={{ color: '#059669' }} />
                    } else if (isHistory) {
                      icon = <Clock size={16} className="suggestion-icon" />
                    } else if (suggestionType === 'popular' || apiType) {
                      icon = <TrendingUp size={16} className="suggestion-icon" style={{ color: '#2563eb' }} />
                    }
                    
                    return (
                      <button
                        key={`${suggestionValue}-${index}`}
                        type="button"
                        className={`suggestion-item ${selectedIndex === index ? 'selected' : ''}`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleSearch(suggestion);
                        }}
                        onMouseDown={(e) => {
                          // Prevent input blur when clicking suggestion
                          // This allows the click to register while keeping input focused
                          e.preventDefault();
                          // Immediately refocus input to prevent blur
                          setTimeout(() => {
                            inputRef.current?.focus();
                          }, 0);
                        }}
                        role="option"
                        aria-selected={selectedIndex === index}
                      >
                        {icon}
                        <span className="suggestion-text">{suggestionValue}</span>
                        {(suggestionType === 'location' || apiType === 'location') && (
                          <span style={{ fontSize: '11px', color: '#059669', marginLeft: 'auto', marginRight: '8px' }}>
                            Địa điểm
                          </span>
                        )}
                        {(suggestionType === 'popular' || apiType === 'tag') && (
                          <span style={{ fontSize: '11px', color: '#2563eb', marginLeft: 'auto', marginRight: '8px' }}>
                            {apiType === 'tag' ? 'Tag' : 'Phổ biến'}
                          </span>
                        )}
                        {selectedIndex === index && (
                          <div className="suggestion-hint">
                            <kbd>Enter</kbd>
                          </div>
                        )}
                      </button>
                    )
                  })
                )}
              </div>
            </>
          ) : searchQuery.trim() ? (
            <div className="suggestions-empty">
              <Search size={20} />
              <span>Không tìm thấy gợi ý</span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
});

SearchBar.displayName = 'SearchBar';


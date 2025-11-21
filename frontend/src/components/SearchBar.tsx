"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { Search, X, Clock, TrendingUp, MapPin } from "lucide-react"
import { useImageStore } from "@/stores/useImageStore"
import { categoryService, type Category } from "@/services/categoryService"
import { imageService } from "@/services/imageService"
import './SearchBar.css'

interface SearchHistoryItem {
  query: string
  timestamp: number
}

const MAX_HISTORY_ITEMS = 5
const SEARCH_DEBOUNCE_MS = 300

export function SearchBar() {
  const { fetchImages, currentSearch } = useImageStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchQuery, setSearchQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [locations, setLocations] = useState<string[]>([])
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Load search history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('photoApp_searchHistory')
      if (stored) {
        const history = JSON.parse(stored) as SearchHistoryItem[]
        setSearchHistory(history.slice(0, MAX_HISTORY_ITEMS))
      }
    } catch (error) {
      console.error('Failed to load search history:', error)
    }
  }, [])

  // Load categories and locations for suggestions
  useEffect(() => {
    const loadSuggestions = async () => {
      try {
        const [categories, locationsData] = await Promise.all([
          categoryService.fetchCategories(),
          imageService.fetchLocations()
        ])
        const categoryNames = categories.map((cat: Category) => cat.name)
        setSuggestions(categoryNames)
        setLocations(locationsData)
      } catch (error) {
        console.error('Failed to load suggestions:', error)
      }
    }
    loadSuggestions()
  }, [])

  // Sync with current search from store
  useEffect(() => {
    if (currentSearch && currentSearch !== searchQuery) {
      setSearchQuery(currentSearch)
    }
  }, [currentSearch])

  // Save to search history
  const saveToHistory = useCallback((query: string) => {
    if (!query.trim()) return

    try {
      const stored = localStorage.getItem('photoApp_searchHistory')
      let history: SearchHistoryItem[] = stored ? JSON.parse(stored) : []
      
      // Remove duplicates and add to beginning
      history = history.filter(item => item.query.toLowerCase() !== query.toLowerCase())
      history.unshift({ query: query.trim(), timestamp: Date.now() })
      
      // Keep only MAX_HISTORY_ITEMS
      history = history.slice(0, MAX_HISTORY_ITEMS)
      
      localStorage.setItem('photoApp_searchHistory', JSON.stringify(history))
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
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, location.pathname])

  // Filter suggestions based on input
  const filteredSuggestions = searchQuery.trim()
    ? [
        // Show matching locations first (with location icon)
        ...locations
          .filter(loc => 
            loc.toLowerCase().includes(searchQuery.toLowerCase())
          )
          .map(loc => ({ type: 'location', value: loc })),
        // Then matching categories
        ...suggestions
          .filter(s => 
            s.toLowerCase().includes(searchQuery.toLowerCase()) &&
            !locations.some(loc => loc.toLowerCase() === s.toLowerCase())
          )
          .map(s => ({ type: 'category', value: s })),
        // Then matching history
        ...searchHistory
          .filter(item => 
            item.query.toLowerCase().includes(searchQuery.toLowerCase()) &&
            !suggestions.some(s => s.toLowerCase() === item.query.toLowerCase()) &&
            !locations.some(loc => loc.toLowerCase() === item.query.toLowerCase())
          )
          .map(item => ({ type: 'history', value: item.query }))
      ].slice(0, 8)
    : [
        // Show recent searches when input is empty
        ...searchHistory.map(item => ({ type: 'history', value: item.query })),
        // Then popular locations
        ...locations.slice(0, 3).map(loc => ({ type: 'location', value: loc })),
        // Then popular categories
        ...suggestions.slice(0, 5 - searchHistory.length - Math.min(3, locations.length)).map(s => ({ type: 'category', value: s }))
      ].slice(0, 8)

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

  const handleBlur = (_e: React.FocusEvent) => {
    // Delay to allow clicking on suggestions
    setTimeout(() => {
      if (!suggestionsRef.current?.contains(document.activeElement)) {
        setIsFocused(false)
        setShowSuggestions(false)
        setSelectedIndex(-1)
      }
    }, 200)
  }

  const clearHistory = () => {
    localStorage.removeItem('photoApp_searchHistory')
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
            setSearchQuery(e.target.value)
            setShowSuggestions(true)
            setSelectedIndex(-1)
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="search-input"
          aria-label="Tìm kiếm ảnh"
          aria-describedby="search-description"
          aria-expanded={showSuggestions}
          aria-autocomplete="list"
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
                {filteredSuggestions.map((suggestion, index) => {
                  const suggestionValue = typeof suggestion === 'string' ? suggestion : suggestion.value
                  const suggestionType = typeof suggestion === 'string' ? 'history' : suggestion.type
                  const isHistory = searchHistory.some(
                    item => item.query.toLowerCase() === suggestionValue.toLowerCase()
                  ) || suggestionType === 'history'
                  
                  return (
                    <button
                      key={`${suggestionValue}-${index}`}
                      type="button"
                      className={`suggestion-item ${selectedIndex === index ? 'selected' : ''}`}
                      onClick={() => handleSearch(suggestion)}
                      role="option"
                      aria-selected={selectedIndex === index}
                    >
                      {suggestionType === 'location' ? (
                        <MapPin size={16} className="suggestion-icon" style={{ color: '#059669' }} />
                      ) : isHistory ? (
                        <Clock size={16} className="suggestion-icon" />
                      ) : (
                        <Search size={16} className="suggestion-icon" />
                      )}
                      <span className="suggestion-text">{suggestionValue}</span>
                      {suggestionType === 'location' && (
                        <span style={{ fontSize: '11px', color: '#059669', marginLeft: 'auto', marginRight: '8px' }}>
                          Địa điểm
                        </span>
                      )}
                      {selectedIndex === index && (
                        <div className="suggestion-hint">
                          <kbd>Enter</kbd>
                        </div>
                      )}
                    </button>
                  )
                })}
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
}


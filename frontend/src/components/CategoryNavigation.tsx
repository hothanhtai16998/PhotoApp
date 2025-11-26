"use client"

import { useState, useEffect, useRef, memo } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { useImageStore } from "@/stores/useImageStore"
import { categoryService, type Category } from "@/services/categoryService"
import './CategoryNavigation.css'

export const CategoryNavigation = memo(function CategoryNavigation() {
  const { fetchImages, currentCategory } = useImageStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [categories, setCategories] = useState<string[]>(['Tất cả'])
  const [headerHeight, setHeaderHeight] = useState(0)
  const [isSticky, setIsSticky] = useState(false)
  const [navHeight, setNavHeight] = useState(0)
  const categoryNavRef = useRef<HTMLDivElement>(null)
  const initialNavTopRef = useRef<number | null>(null)
  const activeCategory = currentCategory || 'Tất cả'

  // Calculate header height for sticky positioning
  useEffect(() => {
    const updateHeaderHeight = () => {
      const header = document.querySelector('.unsplash-header') as HTMLElement
      if (header) {
        const height = header.offsetHeight
        setHeaderHeight(height)
        // Set CSS variable for use in CSS - use requestAnimationFrame to prevent flash
        requestAnimationFrame(() => {
          document.documentElement.style.setProperty('--header-height', `${height}px`)
        })
      }
    }

    // Initial calculation
    updateHeaderHeight()

    // Update on window resize - debounce to prevent excessive updates
    let resizeTimer: NodeJS.Timeout | null = null
    const handleResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer)
      resizeTimer = setTimeout(updateHeaderHeight, 100)
    }
    window.addEventListener('resize', handleResize)

    // Use ResizeObserver to watch for header size changes
    const header = document.querySelector('.unsplash-header')
    let resizeObserver: ResizeObserver | null = null
    if (header) {
      resizeObserver = new ResizeObserver(() => {
        // Debounce ResizeObserver updates too
        if (resizeTimer) clearTimeout(resizeTimer)
        resizeTimer = setTimeout(updateHeaderHeight, 100)
      })
      resizeObserver.observe(header)
    }

    return () => {
      window.removeEventListener('resize', handleResize)
      if (resizeTimer) clearTimeout(resizeTimer)
      if (resizeObserver) {
        resizeObserver.disconnect()
      }
    }
  }, [])

  // Store nav height for spacer - measure when not sticky
  useEffect(() => {
    if (categoryNavRef.current && !isSticky) {
      const height = categoryNavRef.current.offsetHeight
      if (height > 0) {
        setNavHeight(height)
      }
    }
  }, [categories, isSticky])

  // Preserve sticky state when modal opens
  useEffect(() => {
    const checkModalState = () => {
      if (document.body.classList.contains('image-modal-open')) {
        // Modal is open - preserve current sticky state, don't let it change
        // The scroll handler will skip updates, so we just need to ensure state is preserved
      }
    }
    
    // Check immediately
    checkModalState()
    
    // Watch for modal state changes
    const observer = new MutationObserver(checkModalState)
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] })
    
    return () => observer.disconnect()
  }, [])

  // Handle scroll to make category nav stick to header
  useEffect(() => {
    if (!categoryNavRef.current || headerHeight === 0) return
    
    const nav = categoryNavRef.current
    let lastStickyState = isSticky // Initialize with current state
    
    // Store initial nav position once
    const storeInitialPosition = () => {
      if (initialNavTopRef.current === null) {
        const rect = nav.getBoundingClientRect()
        const scrollY = window.scrollY || window.pageYOffset
        initialNavTopRef.current = rect.top + scrollY
      }
    }
    
    const handleScroll = () => {
      // Don't update sticky state when image modal is open
      if (document.body.classList.contains('image-modal-open')) {
        return
      }
      
      const scrollY = window.scrollY || window.pageYOffset
      
      // Store initial position on first scroll or if not stored
      if (initialNavTopRef.current === null) {
        storeInitialPosition()
        if (initialNavTopRef.current === null) return
      }
      
      // If at top, don't stick
      if (scrollY === 0) {
        if (lastStickyState !== false) {
          setIsSticky(false)
          lastStickyState = false
        }
        return
      }
      
      // Calculate: when would the header (at top of viewport) reach the nav's original position?
      // The nav's original top minus header height = scroll position where they meet
      const scrollPositionWhereHeaderReachesNav = initialNavTopRef.current - headerHeight
      
      // Nav should stick only when we've scrolled past that point
      const shouldStick = scrollY >= scrollPositionWhereHeaderReachesNav
      
      if (shouldStick !== lastStickyState) {
        setIsSticky(shouldStick)
        lastStickyState = shouldStick
      }
    }
    
    // Throttled scroll handler
    let rafId: number | null = null
    const throttledScroll = () => {
      if (rafId) return
      rafId = requestAnimationFrame(() => {
        handleScroll()
        rafId = null
      })
    }
    
    window.addEventListener('scroll', throttledScroll, { passive: true })
    
    // Initial setup
    const initCheck = () => {
      storeInitialPosition()
      handleScroll()
    }
    
    setTimeout(initCheck, 150)
    
    return () => {
      window.removeEventListener('scroll', throttledScroll)
      if (rafId) {
        cancelAnimationFrame(rafId)
      }
    }
  }, [headerHeight])

  // Fetch categories from backend
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const fetchedCategories = await categoryService.fetchCategories()
        // Map to category names and add 'Tất cả' at the beginning
        const categoryNames = ['Tất cả', ...fetchedCategories.map((cat: Category) => cat.name)]
        setCategories(categoryNames)
      } catch (error) {
        console.error('Failed to load categories:', error)
        // Fallback to default categories if API fails
        setCategories(['Tất cả'])
      }
    }
    loadCategories()
  }, [])

  const handleCategoryClick = (category: string) => {
    if (location.pathname !== '/') {
      navigate('/')
    }
    
    // Dispatch event to save images before category change
    // This allows ImageGrid to capture images before store clears them
    window.dispatchEvent(new CustomEvent('beforeCategoryChange', {
      detail: { category: category !== 'Tất cả' ? category : undefined }
    }));
    
    // Small delay to ensure event is processed
    setTimeout(() => {
      fetchImages({
        category: category !== 'Tất cả' ? category : undefined,
      });
    }, 10);
  }

  // Only show on homepage
  if (location.pathname !== '/') {
    return null
  }

  return (
    <>
      {/* Spacer to prevent layout shift when sticky */}
      {isSticky && navHeight > 0 && (
        <div 
          style={{ 
            height: `${navHeight}px`,
            flexShrink: 0,
            pointerEvents: 'none'
          }} 
          aria-hidden="true"
        />
      )}
      <div
        className={`category-navigation-container ${isSticky ? 'is-sticky' : ''}`}
        ref={categoryNavRef}
        onTouchMove={(e) => {
          // Prevent scrolling in category navigation on mobile
          if (window.innerWidth <= 768) {
            e.preventDefault();
          }
        }}
        onTouchStart={(e) => {
          // Prevent scrolling in category navigation on mobile
          if (window.innerWidth <= 768) {
            e.stopPropagation();
          }
        }}
      >
        <div className="category-navigation-wrapper">
        <nav 
          className="category-navigation"
          onTouchMove={(e) => {
            // Prevent scrolling in category navigation on mobile
            if (window.innerWidth <= 768) {
              e.preventDefault();
            }
          }}
        >
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => handleCategoryClick(category)}
              className={`category-nav-link ${activeCategory === category ? 'active' : ''}`}
            >
              {category}
            </button>
          ))}
        </nav>
      </div>
    </div>
    </>
  )
})

export default CategoryNavigation


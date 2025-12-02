import { useImageStore } from "@/stores/useImageStore"
import { useNavigate, useLocation, useSearchParams, useParams } from "react-router-dom"
import { useState, useEffect, useRef, memo, useCallback } from "react"
import { categoryService, type Category } from "@/services/categoryService"
import { appConfig } from '@/config/appConfig';
import { timingConfig } from '@/config/timingConfig';
import { categoryNameToSlug, getCategoryNameFromSlug } from '@/utils/categorySlug';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './CategoryNavigation.css'

export const CategoryNavigation = memo(function CategoryNavigation() {
  const { fetchImages, currentCategory } = useImageStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams();
  const { categorySlug } = useParams<{ categorySlug?: string }>();
  const [categoryNames, setCategoryNames] = useState<string[]>(['Tất cả'])
  const [categoryObjects, setCategoryObjects] = useState<Category[]>([])
  const [headerHeight, setHeaderHeight] = useState(0)
  const [isSticky, setIsSticky] = useState(false)
  const [navHeight, setNavHeight] = useState(0)
  const categoryNavRef = useRef<HTMLDivElement>(null)
  const categoryNavElementRef = useRef<HTMLElement>(null)
  const initialNavTopRef = useRef<number | null>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  
  // Determine active category from URL (route param) or fallback to store
  const activeCategoryFromUrl = categorySlug 
    ? (getCategoryNameFromSlug(categorySlug, categoryObjects) || null)
    : null;
  const activeCategory = activeCategoryFromUrl || currentCategory || 'Tất cả'

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
    let resizeTimer: number | null = null
    const handleResize = () => {
      if (resizeTimer) clearTimeout(resizeTimer)
      resizeTimer = setTimeout(updateHeaderHeight, timingConfig.ui.resizeDebounceMs)
    }
    window.addEventListener('resize', handleResize)

    // Use ResizeObserver to watch for header size changes
    const header = document.querySelector('.unsplash-header')
    let resizeObserver: ResizeObserver | null = null
    if (header) {
      resizeObserver = new ResizeObserver(() => {
        // Debounce ResizeObserver updates too
        if (resizeTimer) clearTimeout(resizeTimer)
        resizeTimer = setTimeout(updateHeaderHeight, timingConfig.ui.resizeDebounceMs)
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
  }, [categoryNames, isSticky])

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

    setTimeout(initCheck, timingConfig.ui.initCheckDelayMs)

    return () => {
      window.removeEventListener('scroll', throttledScroll)
      if (rafId) {
        cancelAnimationFrame(rafId)
      }
    }
  }, [headerHeight, isSticky])

  // Check if mobile and update scroll button visibility
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= appConfig.mobileBreakpoint)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Check scroll position and update button visibility
  const checkScrollButtons = useCallback(() => {
    if (!categoryNavElementRef.current || !isMobile) {
      setCanScrollLeft(false)
      setCanScrollRight(false)
      return
    }

    const nav = categoryNavElementRef.current
    const { scrollLeft, scrollWidth, clientWidth } = nav
    setCanScrollLeft(scrollLeft > 0)
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 1) // -1 for rounding
  }, [isMobile])

  // Update scroll button visibility when categories change or on scroll
  useEffect(() => {
    if (!categoryNavElementRef.current) return

    checkScrollButtons()

    const nav = categoryNavElementRef.current
    nav.addEventListener('scroll', checkScrollButtons)
    
    // Also check on resize
    const handleResize = () => {
      checkScrollButtons()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      nav.removeEventListener('scroll', checkScrollButtons)
      window.removeEventListener('resize', handleResize)
    }
  }, [categoryNames, checkScrollButtons])

  // Scroll handlers
  const scrollLeft = useCallback(() => {
    if (!categoryNavElementRef.current) return
    const nav = categoryNavElementRef.current
    const scrollAmount = nav.clientWidth * 0.8 // Scroll 80% of visible width
    nav.scrollBy({ left: -scrollAmount, behavior: 'smooth' })
  }, [])

  const scrollRight = useCallback(() => {
    if (!categoryNavElementRef.current) return
    const nav = categoryNavElementRef.current
    const scrollAmount = nav.clientWidth * 0.8 // Scroll 80% of visible width
    nav.scrollBy({ left: scrollAmount, behavior: 'smooth' })
  }, [])

  // Fetch categories from backend
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const fetchedCategories = await categoryService.fetchCategories()
        setCategoryObjects(fetchedCategories)
        // Map to category names and add 'Tất cả' at the beginning
        const names = ['Tất cả', ...fetchedCategories.map((cat: Category) => cat.name)]
        setCategoryNames(names)
      } catch (error) {
        console.error('Failed to load categories:', error)
        // Fallback to default categories if API fails
        setCategoryNames(['Tất cả'])
        setCategoryObjects([])
      }
    }
    loadCategories()
  }, [])

  const handleCategoryClick = (category: string) => {
    const isTestPage = location.pathname.includes('UnsplashGridTestPage');
    
    // For test page, use query params (backward compatibility)
    if (isTestPage) {
      const newCategory = category !== 'Tất cả' ? category : undefined;
      setSearchParams({ category: newCategory || 'all' });
      return;
    }

    // For normal pages, navigate to route-based URLs
    if (category === 'Tất cả') {
      // Navigate to homepage
      navigate('/');
    } else {
      // Navigate to category page: /t/{slug}
      const slug = categoryNameToSlug(category);
      navigate(`/t/${slug}`);
    }
  }

  // Show on homepage, category pages (/t/:slug), and test page
  const isHomePage = location.pathname === '/';
  const isCategoryPage = location.pathname.startsWith('/t/');
  const isTestPage = location.pathname.includes('UnsplashGridTestPage');
  
  if (!isHomePage && !isCategoryPage && !isTestPage) {
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
      >
        <div className="category-navigation-wrapper">
          {/* Left scroll button - only on mobile */}
          {isMobile && canScrollLeft && (
            <button
              className="category-scroll-btn category-scroll-btn-left"
              onClick={scrollLeft}
              aria-label="Scroll left"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          
          <nav
            ref={categoryNavElementRef}
            className="category-navigation"
          >
            {categoryNames.map((category) => (
              <button
                key={category}
                onClick={() => handleCategoryClick(category)}
                className={`category-nav-link ${activeCategory === category ? 'active' : ''}`}
              >
                {category}
              </button>
            ))}
          </nav>

          {/* Right scroll button - only on mobile */}
          {isMobile && canScrollRight && (
            <button
              className="category-scroll-btn category-scroll-btn-right"
              onClick={scrollRight}
              aria-label="Scroll right"
            >
              <ChevronRight size={20} />
            </button>
          )}
        </div>
      </div>
    </>
  )
})

export default CategoryNavigation


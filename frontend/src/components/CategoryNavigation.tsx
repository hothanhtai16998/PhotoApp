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
  const categoryNavRef = useRef<HTMLDivElement>(null)
  const activeCategory = currentCategory || 'Tất cả'

  // Calculate header height for sticky positioning
  useEffect(() => {
    const updateHeaderHeight = () => {
      const header = document.querySelector('.unsplash-header') as HTMLElement
      if (header) {
        const height = header.offsetHeight
        setHeaderHeight(height)
        // Set CSS variable for use in CSS
        document.documentElement.style.setProperty('--header-height', `${height}px`)
      }
    }

    // Initial calculation
    updateHeaderHeight()

    // Update on window resize
    window.addEventListener('resize', updateHeaderHeight)

    // Use ResizeObserver to watch for header size changes
    const header = document.querySelector('.unsplash-header')
    let resizeObserver: ResizeObserver | null = null
    if (header) {
      resizeObserver = new ResizeObserver(updateHeaderHeight)
      resizeObserver.observe(header)
    }

    return () => {
      window.removeEventListener('resize', updateHeaderHeight)
      if (resizeObserver) {
        resizeObserver.disconnect()
      }
    }
  }, [])

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
    <div
      className="category-navigation-container"
      ref={categoryNavRef}
      style={{
        top: `${headerHeight}px`
      }}
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
  )
})

export default CategoryNavigation



import { useImageStore } from "@/stores/useImageStore"
import { useNavigate, useLocation, useSearchParams } from "react-router-dom"
import { useState, useEffect, useRef, memo } from "react"
import { categoryService, type Category } from "@/services/categoryService"
import { appConfig } from '@/config/appConfig';
import { timingConfig } from '@/config/timingConfig';
import './CategoryNavigation.css'

// ... existing code

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
    const isTestPage = location.pathname.includes('UnsplashGridTestPage');
    const newCategory = category !== 'Tất cả' ? category : undefined;

    if (isTestPage) {
      setSearchParams({ category: newCategory || 'all' });
      return;
    }

    if (location.pathname !== '/') {
      navigate('/');
    }

    // Directly fetch images for the new category.
    // The store's fetchImages implementation should handle resetting state.
    fetchImages({
      category: newCategory,
      page: 1, // Explicitly reset to page 1
      search: undefined, // Clear search term
    });
  }

  // Only show on homepage or test page
  if (location.pathname !== '/' && !location.pathname.includes('UnsplashGridTestPage')) {

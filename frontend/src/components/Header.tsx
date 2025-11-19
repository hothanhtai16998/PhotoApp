"use client"

import { memo, useState, useEffect, useRef } from "react"
import { Link, useNavigate, useLocation } from "react-router-dom"
import { Search, X, Shield, Heart } from "lucide-react"
import { useAuthStore } from "@/stores/useAuthStore"
import { useImageStore } from "@/stores/useImageStore"
import UploadModal from "./UploadModal"
import './Header.css'

export const Header = memo(function Header() {
  const { accessToken, signOut, user } = useAuthStore()
  const { fetchImages, currentCategory } = useImageStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchQuery, setSearchQuery] = useState('')
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced search effect
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      if (location.pathname === '/') {
        fetchImages({
          search: searchQuery || undefined,
        })
      }
    }, 500)

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, location.pathname])

  // Listen for refresh event after image upload and re-fetch with current category
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    
    const handleRefresh = () => {
      if (location.pathname === '/') {
        // After upload, the image is already in the store (added by uploadImage)
        // Refresh without category filter first to ensure uploaded image is preserved
        // Then re-apply category filter if needed
        timeoutId = setTimeout(() => {
          // First, refresh without category filter to get all images
          // This ensures the uploaded image is in the backend response
          fetchImages({
            page: 1,
            _refresh: true,
            search: searchQuery || undefined,
            category: undefined, // No category filter initially
          }).then(() => {
            // If user had a category filter, re-apply it after a short delay
            // The preservation logic will keep the uploaded image visible even if it doesn't match
            if (currentCategory) {
              setTimeout(() => {
                fetchImages({
                  page: 1,
                  category: currentCategory,
                }).catch(() => {
                  // Silently fail
                });
              }, 500);
            }
          }).catch((error) => {
            console.error('Error refreshing images after upload:', error);
            // Silently fail - don't show error toast as this is just a refresh
            // The uploaded image is already in the store and visible
          });
        }, 3000) // Increased delay to ensure backend has fully processed and indexed
      }
    }

    window.addEventListener('refreshImages', handleRefresh)
    return () => {
      window.removeEventListener('refreshImages', handleRefresh)
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, location.pathname, currentCategory])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (location.pathname !== '/') {
      navigate('/')
    }
    fetchImages({
      search: searchQuery || undefined,
    })
  }

  const handleLogoClick = () => {
    setSearchQuery('')
    if (location.pathname !== '/') {
      navigate('/')
    } else {
      // If already on homepage, refresh images
      fetchImages()
    }
  }

  const handleSignOut = async () => {
    await signOut()
    navigate("/")
  }

  return (
    <header className="unsplash-header">
      <div className="header-top">
        <div className="header-container">
          {/* Logo */}
          <Link to="/" className="header-logo" onClick={handleLogoClick}>
            <span>PhotoApp</span>
          </Link>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="header-search" role="search" aria-label="Tìm kiếm ảnh">
            <div className="search-icon-left" aria-hidden="true">
              <Search size={20} />
            </div>
            <input
              type="text"
              placeholder="Tìm ảnh hoặc bản vẻ illustration"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
              aria-label="Tìm kiếm ảnh"
              aria-describedby="search-description"
            />
            <span id="search-description" className="sr-only">
              Nhập từ khóa để tìm kiếm ảnh
            </span>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="search-clear"
                aria-label="Xóa tìm kiếm"
              >
                <X size={16} />
              </button>
            )}
            <button 
              type="button" 
              className="search-visual" 
              title="Visual search"
              aria-label="Tìm kiếm bằng hình ảnh"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <rect x="2" y="2" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 2" fill="none" />
                <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
              </svg>
            </button>
          </form>

          {/* Right Actions */}
          <div className="header-actions">
            {accessToken ? (
              <>
                <button onClick={() => setUploadModalOpen(true)} className="header-link">Thêm ảnh</button>
                <Link to="/favorites" className="header-link" title="Ảnh yêu thích" aria-label="Xem ảnh yêu thích">
                  <Heart size={18} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                  Yêu thích
                </Link>
                {user?.isAdmin && (
                  <Link to="/admin" className="header-link" title="Admin Panel">
                    <Shield size={18} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                    Admin
                  </Link>
                )}
                <Link to="/profile" className="header-link">Tài khoản</Link>
                <button onClick={handleSignOut} className="header-link">Đăng xuất</button>
              </>
            ) : (
              <>
                <Link to="/signin" className="header-link">Đăng nhập</Link>
                <button onClick={() => navigate('/signin')} className="header-button">Thêm ảnh</button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      <UploadModal isOpen={uploadModalOpen} onClose={() => setUploadModalOpen(false)} />
    </header>
  )
})

export default Header

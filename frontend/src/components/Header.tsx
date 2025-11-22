"use client"

import { memo, useState, useRef } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Shield, Heart, Menu, X } from "lucide-react"
import { useAuthStore } from "@/stores/useAuthStore"
import { useImageStore } from "@/stores/useImageStore"
import UploadModal from "./UploadModal"
import { SearchBar, type SearchBarRef } from "./SearchBar"
import './Header.css'

export const Header = memo(function Header() {
  const { accessToken, signOut, user } = useAuthStore()
  const { fetchImages } = useImageStore()
  const navigate = useNavigate()
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const searchBarRef = useRef<SearchBarRef>(null)

  const handleLogoClick = () => {
    if (window.location.pathname !== '/') {
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

          {/* Mobile Menu Button */}
          <button 
            className="mobile-menu-button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          {/* Search Bar */}
          <SearchBar ref={searchBarRef} />

          {/* Right Actions - Desktop */}
          <div className="header-actions desktop-only">
            {accessToken ? (
              <>
                <button onClick={() => setUploadModalOpen(true)} className="header-link">Thêm ảnh</button>
                <Link to="/favorites" className="header-link" title="Ảnh yêu thích" aria-label="Xem ảnh yêu thích">
                  <Heart size={18} />
                  Yêu thích
                </Link>
                {user?.isAdmin && (
                  <Link to="/admin" className="header-link" title="Admin Panel">
                    <Shield size={18} />
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

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="mobile-menu">
          <div className="mobile-menu-content">
            {accessToken ? (
              <>
                <button onClick={() => { setUploadModalOpen(true); setMobileMenuOpen(false); }} className="mobile-menu-link">
                  Thêm ảnh
                </button>
                <Link to="/favorites" className="mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>
                  <Heart size={18} />
                  <span>Yêu thích</span>
                </Link>
                {user?.isAdmin && (
                  <Link to="/admin" className="mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>
                    <Shield size={18} />
                    <span>Admin</span>
                  </Link>
                )}
                <Link to="/profile" className="mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>
                  Tài khoản
                </Link>
                <button onClick={() => { handleSignOut(); setMobileMenuOpen(false); }} className="mobile-menu-link">
                  Đăng xuất
                </button>
              </>
            ) : (
              <>
                <Link to="/signin" className="mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>
                  Đăng nhập
                </Link>
                <button onClick={() => { navigate('/signin'); setMobileMenuOpen(false); }} className="mobile-menu-button-action">
                  Thêm ảnh
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Upload Modal */}
      <UploadModal isOpen={uploadModalOpen} onClose={() => setUploadModalOpen(false)} />
    </header>
  )
})

export default Header

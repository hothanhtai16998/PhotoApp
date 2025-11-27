"use client"

import { memo, useState, useRef, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Shield, Heart, Menu, X, User, LogOut, Info, Palette } from "lucide-react"
import { useAuthStore } from "@/stores/useAuthStore"
import { useImageStore } from "@/stores/useImageStore"
import UploadModal from "./UploadModal"
import { SearchBar, type SearchBarRef } from "./SearchBar"
import { Avatar } from "./Avatar"
import NotificationBell from "./NotificationBell"
import { Logo, type LogoStyle } from "./Logo"
import { LogoSelector, getStoredLogoStyle } from "./LogoSelector"
import { updateFavicon } from "@/utils/faviconUpdater"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import './Header.css'

export const Header = memo(function Header() {
  const { accessToken, signOut, user } = useAuthStore()
  const { fetchImages } = useImageStore()
  const navigate = useNavigate()
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [logoStyle, setLogoStyle] = useState<LogoStyle>(getStoredLogoStyle())
  const [logoSelectorOpen, setLogoSelectorOpen] = useState(false)
  const searchBarRef = useRef<SearchBarRef>(null)

  useEffect(() => {
    // Update favicon on initial load
    updateFavicon(logoStyle)
    
    const handleLogoStyleChange = (event: CustomEvent) => {
      const newStyle = event.detail as LogoStyle
      setLogoStyle(newStyle)
      updateFavicon(newStyle)
    }

    window.addEventListener('logoStyleChanged', handleLogoStyleChange as EventListener)
    return () => {
      window.removeEventListener('logoStyleChanged', handleLogoStyleChange as EventListener)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
          <div className="header-logo-container">
            <Link to="/" className="header-logo" onClick={handleLogoClick}>
              <Logo size={28} style={logoStyle} />
            </Link>
            <button
              className="header-logo-selector-btn"
              onClick={() => setLogoSelectorOpen(true)}
              aria-label="Change logo style"
              title="Change logo style"
            >
              <Palette size={14} />
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="mobile-menu-button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Chuyển đổi menu"
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
                <button onClick={() => setUploadModalOpen(true)} className="header-link header-upload-button">Thêm ảnh</button>
                <NotificationBell />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="header-link user-menu-trigger" aria-label="Menu người dùng">
                      {user ? (
                        <Avatar 
                          user={user} 
                          size={32}
                          className="header-user-avatar"
                          fallbackClassName="header-user-avatar-placeholder"
                        />
                      ) : (
                        <User size={18} />
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="user-menu-content">
                    <DropdownMenuItem asChild>
                      <Link to="/favorites" className="user-menu-item">
                        <Heart size={16} />
                        Yêu thích
                      </Link>
                    </DropdownMenuItem>
                    {user?.isAdmin && (
                      <DropdownMenuItem asChild>
                        <Link to="/admin" className="user-menu-item">
                          <Shield size={16} />
                          Admin
                        </Link>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/about" className="user-menu-item">
                        <Info size={16} />
                        Về chúng tôi
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="user-menu-item">
                        <User size={16} />
                        Tài khoản
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={handleSignOut}
                      className="user-menu-item"
                      variant="destructive"
                    >
                      <LogOut size={16} />
                      Đăng xuất
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
            <Link to="/about" className="mobile-menu-link" onClick={() => setMobileMenuOpen(false)}>
              Về chúng tôi
            </Link>
            {accessToken ? (
              <>
                <button onClick={() => { setUploadModalOpen(true); setMobileMenuOpen(false); }} className="mobile-menu-link">
                  Thêm ảnh
                </button>
                <div className="mobile-menu-notification-wrapper" onClick={(e) => e.stopPropagation()}>
                  <NotificationBell />
                </div>
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

      {/* Logo Selector Modal */}
      {logoSelectorOpen && (
        <LogoSelector onClose={() => setLogoSelectorOpen(false)} />
      )}
    </header>
  )
})

export default Header

import { memo, useState, useRef, useEffect } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Shield, Heart, Menu, X, User, LogOut, Info, Building2, Monitor, Users, Compass, FileText, ChevronDown } from "lucide-react"
import { useAuthStore } from "@/stores/useAuthStore"
import { useUserStore } from "@/stores/useUserStore"
import { useImageStore } from "@/stores/useImageStore"
import UploadModal from "./UploadModal"
import { SearchBar, type SearchBarRef } from "./SearchBar"
import { Avatar } from "./Avatar"
import NotificationBell from "./NotificationBell"
import { LanguageSwitcher } from "./LanguageSwitcher"
import LOGO_CONFIG from "@/config/logo"
import { updateFaviconWithImage } from "@/utils/faviconUpdater"
import { t } from "@/i18n"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import './Header.css'

export const Header = memo(function Header() {
  const { accessToken, signOut } = useAuthStore()
  const { user } = useUserStore()
  const { fetchImages } = useImageStore()
  const navigate = useNavigate()
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const searchBarRef = useRef<SearchBarRef>(null)

  useEffect(() => {
    // Update favicon with configured logo on initial load
    updateFaviconWithImage(LOGO_CONFIG.faviconLogo)
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
              <img
                src={LOGO_CONFIG.mainLogo}
                alt={LOGO_CONFIG.altText}
                className="header-logo-image"
                style={{ height: `${LOGO_CONFIG.headerHeight}px`, width: 'auto' }}
              />
            </Link>
          </div>

          {/* Mobile Header Actions - Icons visible on mobile */}
          <div className="mobile-header-actions">
            {accessToken ? (
              <>
                {/* User Icon/Avatar */}
                <Link to="/profile" className="mobile-header-icon" aria-label={t('header.account')}>
                  {user ? (
                    <Avatar
                      user={user}
                      size={32}
                      className="mobile-header-avatar"
                      fallbackClassName="mobile-header-avatar-placeholder"
                    />
                  ) : (
                    <User size={20} />
                  )}
                </Link>
                {/* Notification Bell */}
                <div className="mobile-header-icon-wrapper">
                  <NotificationBell />
                </div>
              </>
            ) : (
              <>
                {/* User Icon for Sign In */}
                <Link to="/signin" className="mobile-header-icon" aria-label={t('auth.signIn')}>
                  <User size={20} />
                </Link>
              </>
            )}
            {/* Mobile Menu Button */}
            <button
              className="mobile-menu-button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={t('header.toggleMenu')}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Search Bar */}
          <SearchBar ref={searchBarRef} />

          {/* Right Actions - Desktop */}
          <div className="header-actions desktop-only">
            {accessToken ? (
              <>
                <button onClick={() => setUploadModalOpen(true)} className="header-link header-upload-button">{t('header.addImage')}</button>
                <NotificationBell />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="header-link user-menu-trigger" aria-label={t('header.userMenu')}>
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
                        {t('header.favorites')}
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
                        {t('header.about')}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="user-menu-item">
                        <User size={16} />
                        {t('header.account')}
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <LanguageSwitcher variant="menu-item" />
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleSignOut}
                      className="user-menu-item"
                      variant="destructive"
                    >
                      <LogOut size={16} />
                      {t('auth.signOut')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link to="/signin" className="header-link">{t('auth.signIn')}</Link>
                <button onClick={() => navigate('/signin')} className="header-button">{t('header.addImage')}</button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Menu Modal - Unsplash Style */}
      {mobileMenuOpen && (
          <div className="mobile-menu-modal">
            {/* Close Button */}
            <button
              className="mobile-menu-close"
              onClick={() => setMobileMenuOpen(false)}
              aria-label={t('a11y.closeMenu')}
            >
              <X size={24} />
            </button>
            <div className="mobile-menu-content">
              {/* Navigation Sections */}
              <div className="mobile-menu-section">
                <Link to="/about" className="mobile-menu-nav-item" onClick={() => setMobileMenuOpen(false)}>
                  <Building2 size={18} />
                  <span>{t('header.company')}</span>
                  <ChevronDown size={16} className="mobile-menu-arrow" />
                </Link>
                <Link to="/" className="mobile-menu-nav-item" onClick={() => setMobileMenuOpen(false)}>
                  <Monitor size={18} />
                  <span>{t('header.products')}</span>
                  <ChevronDown size={16} className="mobile-menu-arrow" />
                </Link>
                <Link to="/" className="mobile-menu-nav-item" onClick={() => setMobileMenuOpen(false)}>
                  <Users size={18} />
                  <span>{t('header.community')}</span>
                  <ChevronDown size={16} className="mobile-menu-arrow" />
                </Link>
                <Link to="/" className="mobile-menu-nav-item" onClick={() => setMobileMenuOpen(false)}>
                  <Compass size={18} />
                  <span>{t('header.explore')}</span>
                  <ChevronDown size={16} className="mobile-menu-arrow" />
                </Link>
                <Link to="/about" className="mobile-menu-nav-item" onClick={() => setMobileMenuOpen(false)}>
                  <FileText size={18} />
                  <span>{t('header.legal')}</span>
                  <ChevronDown size={16} className="mobile-menu-arrow" />
                </Link>
                <LanguageSwitcher 
                  variant="menu-item" 
                  className="mobile-menu-nav-item mobile-language-switcher"
                  onSwitch={() => setMobileMenuOpen(false)}
                />
              </div>

              {/* Action Buttons */}
              <div className="mobile-menu-actions">
                {accessToken ? (
                  <>
                    <button 
                      onClick={() => { setUploadModalOpen(true); setMobileMenuOpen(false); }} 
                      className="mobile-menu-button-primary"
                    >
                      {t('header.submitImage')}
                    </button>
                    <Link 
                      to="/profile" 
                      className="mobile-menu-button-secondary"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {t('header.account')}
                    </Link>
                  </>
                ) : (
                  <>
                    <button 
                      onClick={() => { navigate('/signin'); setMobileMenuOpen(false); }} 
                      className="mobile-menu-button-primary"
                    >
                      {t('header.submitImage')}
                    </button>
                    <Link 
                      to="/signin" 
                      className="mobile-menu-button-secondary"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {t('header.logIn')}
                    </Link>
                    <p className="mobile-menu-signup-text">
                      {t('header.newToUnsplash')} <Link to="/signup" onClick={() => setMobileMenuOpen(false)}>{t('header.signUpFree')}</Link>
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
      )}

      {/* Upload Modal */}
      <UploadModal isOpen={uploadModalOpen} onClose={() => setUploadModalOpen(false)} />

    </header >
  )
})

export default Header
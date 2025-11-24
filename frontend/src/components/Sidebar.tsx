"use client"

import { memo, useState } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { 
  ChevronLeft, 
  ChevronRight, 
  Grid3x3, 
  FolderOpen, 
  Upload, 
  Image as ImageIcon, 
  PenTool, 
  FolderStack, 
  Heart, 
  Bell, 
  Menu,
  User
} from "lucide-react"
import { useAuthStore } from "@/stores/useAuthStore"
import UploadModal from "./UploadModal"
import './Sidebar.css'

export const Sidebar = memo(function Sidebar() {
  const { user, accessToken } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const isHomePage = location.pathname === '/'
  const isCollectionsPage = location.pathname.startsWith('/collections')
  const isFavoritesPage = location.pathname === '/favorites'
  const isProfilePage = location.pathname.startsWith('/profile')

  const handleNavigateBack = () => {
    window.history.back()
  }

  const handleNavigateForward = () => {
    window.history.forward()
  }

  const handlePhotosClick = () => {
    navigate('/')
  }

  const handleCollectionsClick = () => {
    if (accessToken) {
      navigate('/collections')
    }
  }

  const handleFavoritesClick = () => {
    if (accessToken) {
      navigate('/favorites')
    }
  }

  const handleProfileClick = () => {
    if (accessToken) {
      navigate('/profile')
    } else {
      navigate('/signin')
    }
  }

  const handleUploadClick = () => {
    if (accessToken) {
      setUploadModalOpen(true)
    } else {
      navigate('/signin')
    }
  }

  // Get user avatar or default
  const userAvatar = user?.avatar || (user?.username ? `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=111&color=fff` : null)

  return (
    <>
      <aside className="unsplash-sidebar">
        {/* Top Navigation */}
        <div className="sidebar-top-nav">
          <button 
            className="sidebar-nav-button" 
            onClick={handleNavigateBack}
            aria-label="Go back"
          >
            <ChevronLeft size={20} />
          </button>
          <button 
            className="sidebar-nav-button" 
            onClick={handleNavigateForward}
            aria-label="Go forward"
          >
            <ChevronRight size={20} />
          </button>
          <div className="sidebar-separator-vertical" />
          <button 
            className="sidebar-nav-button" 
            onClick={handlePhotosClick}
            aria-label="Grid view"
            title="Grid view"
          >
            <Grid3x3 size={18} />
          </button>
          <div className="sidebar-separator-vertical" />
          <button 
            className="sidebar-nav-button" 
            onClick={handleCollectionsClick}
            aria-label="Collections"
            title="Collections"
          >
            <FolderOpen size={18} />
          </button>
          {accessToken && user && (
            <button 
              className="sidebar-nav-button sidebar-profile-button" 
              onClick={handleProfileClick}
              aria-label="Profile"
              title="Profile"
            >
              {userAvatar ? (
                <img src={userAvatar} alt={user.username} className="sidebar-profile-avatar" />
              ) : (
                <User size={18} />
              )}
            </button>
          )}
        </div>

        {/* Main Navigation Icons */}
        <nav className="sidebar-main-nav">
          {/* Upload Icon */}
          <button
            className="sidebar-icon-button"
            onClick={handleUploadClick}
            aria-label="Upload photo"
            title="Upload photo"
          >
            <div className="sidebar-icon-upload">
              <span className="sidebar-upload-u">U</span>
              <span className="sidebar-upload-dot">•</span>
            </div>
          </button>

          {/* Photos Icon */}
          <button
            className={`sidebar-icon-button ${isHomePage ? 'active' : ''}`}
            onClick={handlePhotosClick}
            aria-label="Photos"
            title="Photos"
          >
            <div className="sidebar-icon-photos">
              <ImageIcon size={20} />
            </div>
          </button>

          {/* Pen Tool Icon */}
          <button
            className="sidebar-icon-button"
            onClick={() => navigate('/upload')}
            aria-label="Create"
            title="Create"
          >
            <PenTool size={20} />
          </button>

          {/* Separator */}
          <div className="sidebar-separator" />

          {/* Collections Icon */}
          <button
            className={`sidebar-icon-button ${isCollectionsPage ? 'active' : ''}`}
            onClick={handleCollectionsClick}
            aria-label="Collections"
            title="Collections"
            disabled={!accessToken}
          >
            <FolderStack size={20} />
          </button>

          {/* Favorites Icon */}
          <button
            className={`sidebar-icon-button ${isFavoritesPage ? 'active' : ''}`}
            onClick={handleFavoritesClick}
            aria-label="Favorites"
            title="Favorites"
            disabled={!accessToken}
          >
            <Heart size={20} />
          </button>

          {/* Separator */}
          <div className="sidebar-separator" />

          {/* Thumbnail with notification count */}
          {accessToken && (
            <div className="sidebar-thumbnail-container">
              <div className="sidebar-thumbnail">
                <div className="sidebar-thumbnail-badge">1</div>
              </div>
            </div>
          )}

          {/* Bell Icon */}
          {accessToken && (
            <button
              className="sidebar-icon-button"
              aria-label="Notifications"
              title="Notifications"
            >
              <Bell size={20} />
            </button>
          )}

          {/* Profile Picture */}
          {accessToken && user && (
            <button
              className="sidebar-icon-button sidebar-profile-icon"
              onClick={handleProfileClick}
              aria-label="Profile"
              title="Profile"
            >
              {userAvatar ? (
                <img src={userAvatar} alt={user.username} className="sidebar-icon-avatar" />
              ) : (
                <div className="sidebar-icon-avatar-placeholder">
                  <User size={16} />
                </div>
              )}
            </button>
          )}

          {/* Hamburger Menu */}
          <button
            className="sidebar-icon-button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
            title="Menu"
          >
            <Menu size={20} />
          </button>
        </nav>
      </aside>

      {/* Upload Modal */}
      <UploadModal isOpen={uploadModalOpen} onClose={() => setUploadModalOpen(false)} />
    </>
  )
})

export default Sidebar


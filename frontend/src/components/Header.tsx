"use client"

import { memo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Shield, Heart } from "lucide-react"
import { useAuthStore } from "@/stores/useAuthStore"
import { useImageStore } from "@/stores/useImageStore"
import UploadModal from "./UploadModal"
import { SearchBar } from "./SearchBar"
import './Header.css'

export const Header = memo(function Header() {
  const { accessToken, signOut, user } = useAuthStore()
  const { fetchImages } = useImageStore()
  const navigate = useNavigate()
  const [uploadModalOpen, setUploadModalOpen] = useState(false)

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

          {/* Search Bar */}
          <SearchBar />

          {/* Right Actions */}
          <div className="header-actions">
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

      {/* Upload Modal */}
      <UploadModal isOpen={uploadModalOpen} onClose={() => setUploadModalOpen(false)} />
    </header>
  )
})

export default Header

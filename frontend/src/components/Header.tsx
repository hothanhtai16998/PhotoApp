
import { Link } from 'react-router';
import './Header.css';
import Logout from './auth/Logout';

const Header = () => {
  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo">
          <svg
            width="28"
            height="28"
            viewBox="0 0 32 32"
            className="logo-icon"
            aria-hidden="true"
          >
            <path
              d="M16 32C24.8366 32 32 24.8366 32 16C32 7.16344 24.8366 0 16 0C7.16344 0 0 7.16344 0 16C0 24.8366 7.16344 32 16 32ZM16 28C22.6274 28 28 22.6274 28 16C28 9.37258 22.6274 4 16 4C9.37258 4 4 9.37258 4 16C4 22.6274 9.37258 28 16 28ZM16 22C19.3137 22 22 19.3137 22 16C22 12.6863 19.3137 10 16 10C12.6863 10 10 12.6863 10 16C10 19.3137 12.6863 22 16 22Z"
              fill="currentColor"
            ></path>
          </svg>
          <span>Photo Sharing</span>
        </Link>
        <div className="header-right">
          <nav className="nav-links">
            <Link to="/">Trang chủ</Link>
            <Link to="/signin">Đăng nhập</Link>
            <Link to="/signup">Đăng ký</Link>
            <Link to="/upload">Tải ảnh lên</Link>
            <Link to="/profile">profile</Link>
            <Link to="/"><Logout /></Link>
            
          </nav>
          <div className="header-actions">
            <button className="join-button">Join</button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

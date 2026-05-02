import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, GraduationCap, Menu, X } from 'lucide-react';
import { clearStoredSession } from '../lib/session';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const syncAuth = () => {
      setIsLoggedIn(Boolean(localStorage.getItem('token')));
    };

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 24);
    };

    syncAuth();
    handleScroll();

    window.addEventListener('storage', syncAuth);
    window.addEventListener('scroll', handleScroll);

    const intervalId = window.setInterval(syncAuth, 1000);

    return () => {
      window.removeEventListener('storage', syncAuth);
      window.removeEventListener('scroll', handleScroll);
      window.clearInterval(intervalId);
    };
  }, []);

  // Close menu on route change / outside click
  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [menuOpen]);

  const handleLogout = () => {
    clearStoredSession();
    setIsLoggedIn(false);
    setMenuOpen(false);
    navigate('/login');
  };

  return (
    <header className={`site-header ${isScrolled ? 'is-scrolled' : ''}`}>
      <div className="nav-content">
        {/* Brand */}
        <Link to="/" className="brand-mark" onClick={() => setMenuOpen(false)}>
          <div className="brand-icon">
            <GraduationCap size={22} strokeWidth={2.2} />
          </div>
          <div className="brand-copy" style={{ display: 'flex', alignItems: 'center' }}>
            <span className="brand-text">CampusIQ</span>
          </div>
        </Link>

        {/* Desktop nav links removed */}
        <nav className="nav-links">
        </nav>

        {/* Desktop actions */}
        <div className="nav-actions nav-actions-desktop">
          {isLoggedIn ? (
            <>
              <Link className="btn btn-secondary" to="/dashboard">Dashboard</Link>
              <button className="btn btn-primary" onClick={handleLogout} type="button">Sign Out</button>
            </>
          ) : (
            <>
              <Link className="btn btn-ghost" to="/login">Login</Link>
              <Link className="btn btn-primary" to="/register">
                Join CampusIQ <ArrowRight size={16} />
              </Link>
            </>
          )}
        </div>

        {/* Hamburger button (mobile only) */}
        <button
          className="nav-hamburger"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
          type="button"
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className="nav-mobile-drawer" onClick={(e) => e.stopPropagation()}>
          {/* Mobile nav links removed */}
          <nav className="nav-mobile-links">
          </nav>
          <div className="nav-mobile-actions">
            {isLoggedIn ? (
              <>
                <Link className="btn btn-secondary btn-block" to="/dashboard" onClick={() => setMenuOpen(false)}>Dashboard</Link>
                <button className="btn btn-primary btn-block" onClick={handleLogout} type="button">Sign Out</button>
              </>
            ) : (
              <>
                <Link className="btn btn-ghost btn-block" to="/login" onClick={() => setMenuOpen(false)}>Login</Link>
                <Link className="btn btn-primary btn-block" to="/register" onClick={() => setMenuOpen(false)}>
                  Join CampusIQ <ArrowRight size={16} />
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;

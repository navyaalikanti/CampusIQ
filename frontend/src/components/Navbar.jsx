import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, GraduationCap } from 'lucide-react';
import { clearStoredSession } from '../lib/session';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
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

  const handleLogout = () => {
    clearStoredSession();
    setIsLoggedIn(false);
    navigate('/login');
  };

  return (
    <header className={`site-header ${isScrolled ? 'is-scrolled' : ''}`}>
      <div className="nav-content">
        <Link to="/" className="brand-mark">
          <div className="brand-icon">
            <GraduationCap size={22} strokeWidth={2.2} />
          </div>
          <div className="brand-copy" style={{ display: 'flex', alignItems: 'center' }}>
            <span className="brand-text">
              CampusIQ
            </span>
          </div>
        </Link>

        <nav className="nav-links">
          <Link className="nav-link" to="/">
            Platform
          </Link>
          <a className="nav-link" href="#features">
            Features
          </a>
          <a className="nav-link" href="#impact">
            Impact
          </a>
        </nav>

        <div className="nav-actions">
          {isLoggedIn ? (
            <>
              <Link className="btn btn-secondary" to="/dashboard">
                Dashboard
              </Link>
              <button className="btn btn-primary" onClick={handleLogout} type="button">
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link className="btn btn-ghost" to="/login">
                Login
              </Link>
              <Link className="btn btn-primary" to="/register">
                Join CampusIQ <ArrowRight size={16} />
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;

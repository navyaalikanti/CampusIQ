import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="footer-wrap">
      <div className="footer-panel">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link to="/" className="brand-mark" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center' }}>
              <div className="brand-icon">
                <GraduationCap size={22} strokeWidth={2.2} />
              </div>
              <div className="brand-copy" style={{ display: 'flex', alignItems: 'center' }}>
                <span className="brand-text">
                  Campus<span className="brand-highlight">IQ</span>
                </span>
              </div>
            </Link>
            <p>
              CampusIQ turns scattered academic data into a premium student experience with AI
              summaries, trusted peer collaboration, and real-time learning guidance.
            </p>
          </div>

          <div className="footer-column">
            <h3>Platform</h3>
            <a href="#features">Intelligent search</a>
            <a href="#impact">Hackathon impact</a>
            <Link to="/dashboard">Student dashboard</Link>
          </div>

          <div className="footer-column">
            <h3>Access</h3>
            <Link to="/login">Login</Link>
            <Link to="/register">Create account</Link>
            <Link to="/register">Request demo</Link>
          </div>

          <div className="footer-column">
            <h3>Pitch Line</h3>
            <p>
              Designed to look investor-ready, presenter-ready, and unforgettable in a live
              hackathon demo.
            </p>
          </div>
        </div>

        <div className="footer-bottom">
          © 2026 CampusIQ. Premium campus intelligence for modern learners.
        </div>
      </div>
    </footer>
  );
};

export default Footer;

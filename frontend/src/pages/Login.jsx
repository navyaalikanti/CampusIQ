import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, LockKeyhole, Sparkles, Users } from 'lucide-react';
import api from '../lib/api';
import { getMentorProfile } from '../lib/mentorSystem';
import { setStoredSession } from '../lib/session';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onChange = (event) => {
    setFormData((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/api/auth/login', formData);

      setStoredSession({ token: response.data.token, user: response.data.user });

      if (['faculty', 'graduate'].includes(String(response.data.user?.role || '').toLowerCase())) {
        const mentorProfile = await getMentorProfile().catch(() => null);
        navigate(mentorProfile ? '/dashboard' : '/complete-profile');
        return;
      }

      navigate('/dashboard');
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'CampusIQ backend is not reachable. Start the backend server and try again.',
      );
      setLoading(false);
    }
  };

  return (
    <section className="premium-grid-base" style={{ height: '100vh', padding: '64px', background: 'var(--bg)', display: 'grid', gridTemplateColumns: '1.2fr 1fr', alignItems: 'center', gap: '80px' }}>
      
      {/* Left-Aligned Branding Section */}
      <div className="flex-column gap-32 fade-in">
        <div className="flex-column gap-16">
          <div className="flex-row gap-8" style={{ color: 'var(--accent)' }}>
            <Sparkles size={20} />
            <span className="premium-text-meta" style={{ letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700 }}>AI Intelligence Layer</span>
          </div>
          <h1 className="premium-text-hero" style={{ fontSize: '56px', lineHeight: '1.1', maxWidth: '600px' }}>
            Welcome back to your <span style={{ color: 'var(--accent)' }}>smarter</span> campus workspace.
          </h1>
          <p className="premium-text-body" style={{ fontSize: '18px', opacity: 0.6, maxWidth: '500px', lineHeight: '1.6' }}>
            Sign in as a student, faculty mentor, or graduate mentor to enter the right dashboard, continue conversations, and pick up exactly where you left off.
          </p>
        </div>

        <div className="flex-column gap-24 mt-24">
          <div className="flex-row gap-20 items-center">
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(46, 230, 166, 0.1)', display: 'grid', placeItems: 'center', color: 'var(--accent)' }}>
              <LockKeyhole size={22} />
            </div>
            <div className="flex-column">
              <span className="premium-text-h3" style={{ fontSize: '16px' }}>Secure by Role</span>
              <span className="premium-text-meta">Students, faculty, and graduates each land in their own workflow.</span>
            </div>
          </div>
          <div className="flex-row gap-20 items-center">
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(46, 230, 166, 0.1)', display: 'grid', placeItems: 'center', color: 'var(--accent)' }}>
              <Users size={22} />
            </div>
            <div className="flex-column">
              <span className="premium-text-h3" style={{ fontSize: '18px' }}>Collaboration First</span>
              <span className="premium-text-meta" style={{ fontSize: '14px' }}>Mentor chats, study spaces, and academic coordination in one place.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right-Aligned Minimalist Form Section */}
      <div className="flex-column gap-48 fade-in" style={{ padding: '40px', maxWidth: '480px' }}>
        <div className="flex-column gap-12">
          <h2 className="premium-text-h2" style={{ fontSize: '40px', margin: 0 }}>Login</h2>
          <p className="premium-text-meta" style={{ fontSize: '14px' }}>Use your campus credentials to enter.</p>
        </div>

        {error && (
          <div className="premium-card" style={{ padding: '12px 20px', background: 'rgba(255, 107, 107, 0.1)', borderColor: 'rgba(255, 107, 107, 0.2)', color: '#ff6b6b', fontSize: '13px' }}>
            {error}
          </div>
        )}

        <form className="flex-column gap-32" onSubmit={onSubmit}>
          <div className="flex-column gap-12">
            <label className="premium-text-meta" style={{ letterSpacing: '0.1em', fontSize: '12px', color: 'var(--accent)' }}>EMAIL ADDRESS</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder=""
              value={formData.email}
              onChange={onChange}
              required
              style={{ 
                background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)', 
                padding: '12px 0', color: '#fff', fontSize: '18px', outline: 'none', transition: 'all 0.3s'
              }}
              onFocus={(e) => e.target.style.borderBottomColor = 'var(--accent)'}
              onBlur={(e) => e.target.style.borderBottomColor = 'rgba(255,255,255,0.1)'}
            />
          </div>

          <div className="flex-column gap-12">
            <label className="premium-text-meta" style={{ letterSpacing: '0.1em', fontSize: '12px', color: 'var(--accent)' }}>PASSWORD</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder=""
              value={formData.password}
              onChange={onChange}
              required
              minLength="6"
              style={{ 
                background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)', 
                padding: '12px 0', color: '#fff', fontSize: '18px', outline: 'none', transition: 'all 0.3s'
              }}
              onFocus={(e) => e.target.style.borderBottomColor = 'var(--accent)'}
              onBlur={(e) => e.target.style.borderBottomColor = 'rgba(255,255,255,0.1)'}
            />
          </div>

          <button 
            className="premium-button" 
            style={{ width: '100%', padding: '16px', marginTop: '12px', fontSize: '16px' }} 
            type="submit" 
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Enter CampusIQ'}
            <ArrowRight size={18} style={{ marginLeft: '8px' }} />
          </button>
        </form>

        <p className="premium-text-meta" style={{ textAlign: 'center' }}>
          New to CampusIQ? <Link to="/register" style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>Create your account</Link>
        </p>
      </div>

    </section>
  );
};

export default Login;

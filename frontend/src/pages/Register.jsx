import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Sparkles, Target } from 'lucide-react';
import api from '../lib/api';
import { setStoredSession } from '../lib/session';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onChange = (event) => {
    setFormData((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post('/auth/register', {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      });

      setStoredSession({ token: response.data.token, user: response.data.user });

      if (['faculty', 'graduate'].includes(formData.role)) {
        navigate('/complete-profile');
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
            <span className="premium-text-meta" style={{ letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 700 }}>Launch Your Workspace</span>
          </div>
          <h1 className="premium-text-hero" style={{ fontSize: '56px', lineHeight: '1.1', maxWidth: '600px' }}>
            Create the account that powers your <span style={{ color: 'var(--accent)' }}>CampusIQ</span> story.
          </h1>
          <p className="premium-text-body" style={{ fontSize: '18px', opacity: 0.6, maxWidth: '500px', lineHeight: '1.6' }}>
            Choose the role that matches your journey. Students enter the full campus platform, while faculty and graduates unlock a mentor-first experience with profile setup and guided chat.
          </p>
        </div>

        <div className="flex-column gap-24 mt-24">
          <div className="flex-row gap-20 items-center">
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(46, 230, 166, 0.1)', display: 'grid', placeItems: 'center', color: 'var(--accent)' }}>
              <BadgeCheck size={22} />
            </div>
            <div className="flex-column">
              <span className="premium-text-h3" style={{ fontSize: '18px' }}>Clean first impression</span>
              <span className="premium-text-meta" style={{ fontSize: '14px' }}>From registration to dashboard, the role flow stays consistent.</span>
            </div>
          </div>
          <div className="flex-row gap-20 items-center">
            <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'rgba(46, 230, 166, 0.1)', display: 'grid', placeItems: 'center', color: 'var(--accent)' }}>
              <Target size={22} />
            </div>
            <div className="flex-column">
              <span className="premium-text-h3" style={{ fontSize: '18px' }}>Built for momentum</span>
              <span className="premium-text-meta" style={{ fontSize: '14px' }}>Mentors continue into profile completion before going live for students.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right-Aligned Minimalist Form Section */}
      <div className="flex-column gap-32 fade-in" style={{ padding: '0 40px', maxWidth: '480px' }}>
        <div className="flex-column gap-12">
          <h2 className="premium-text-h2" style={{ fontSize: '40px', margin: 0 }}>Create Account</h2>
          <p className="premium-text-meta" style={{ fontSize: '14px' }}>Set up your profile to enter the experience.</p>
        </div>

        {error && (
          <div className="premium-card" style={{ padding: '12px 20px', background: 'rgba(255, 107, 107, 0.1)', borderColor: 'rgba(255, 107, 107, 0.2)', color: '#ff6b6b', fontSize: '13px' }}>
            {error}
          </div>
        )}

        <form className="flex-column gap-24" onSubmit={onSubmit}>
          <div className="flex-column gap-8">
            <label className="premium-text-meta" style={{ letterSpacing: '0.1em', fontSize: '12px', color: 'var(--accent)' }}>FULL NAME</label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder=""
              value={formData.name}
              onChange={onChange}
              required
              style={{ 
                background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)', 
                padding: '8px 0', color: '#fff', fontSize: '18px', outline: 'none', transition: 'all 0.3s'
              }}
              onFocus={(e) => e.target.style.borderBottomColor = 'var(--accent)'}
              onBlur={(e) => e.target.style.borderBottomColor = 'rgba(255,255,255,0.1)'}
            />
          </div>

          <div className="flex-column gap-8">
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
                padding: '8px 0', color: '#fff', fontSize: '18px', outline: 'none', transition: 'all 0.3s'
              }}
              onFocus={(e) => e.target.style.borderBottomColor = 'var(--accent)'}
              onBlur={(e) => e.target.style.borderBottomColor = 'rgba(255,255,255,0.1)'}
            />
          </div>

          <div className="flex-column gap-8">
            <label className="premium-text-meta" style={{ letterSpacing: '0.1em', fontSize: '12px', color: 'var(--accent)' }}>ROLE</label>
            <select 
               id="role" 
               name="role" 
               value={formData.role} 
               onChange={onChange}
               style={{ 
                background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)', 
                padding: '8px 0', color: '#fff', fontSize: '18px', outline: 'none', cursor: 'pointer'
              }}
            >
              <option value="student" style={{ background: '#000' }}>Student</option>
              <option value="faculty" style={{ background: '#000' }}>Faculty</option>
              <option value="graduate" style={{ background: '#000' }}>Graduate</option>
            </select>
            <span className="premium-text-meta" style={{ fontSize: '12px' }}>
              Faculty and graduates will complete a public mentor profile after sign up.
            </span>
          </div>

          <div className="grid-2-col gap-24">
            <div className="flex-column gap-8">
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
                  padding: '8px 0', color: '#fff', fontSize: '18px', outline: 'none', transition: 'all 0.3s'
                }}
                onFocus={(e) => e.target.style.borderBottomColor = 'var(--accent)'}
                onBlur={(e) => e.target.style.borderBottomColor = 'rgba(255,255,255,0.1)'}
              />
            </div>
            <div className="flex-column gap-8">
              <label className="premium-text-meta" style={{ letterSpacing: '0.1em', fontSize: '12px', color: 'var(--accent)' }}>CONFIRM PASSWORD</label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder=""
                value={formData.confirmPassword}
                onChange={onChange}
                required
                minLength="6"
                style={{ 
                  background: 'none', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)', 
                  padding: '8px 0', color: '#fff', fontSize: '18px', outline: 'none', transition: 'all 0.3s'
                }}
                onFocus={(e) => e.target.style.borderBottomColor = 'var(--accent)'}
                onBlur={(e) => e.target.style.borderBottomColor = 'rgba(255,255,255,0.1)'}
              />
            </div>
          </div>

          <button 
            className="premium-button" 
            style={{ width: '100%', padding: '16px', marginTop: '12px', fontSize: '16px' }} 
            type="submit" 
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create CampusIQ Account'}
            <ArrowRight size={18} style={{ marginLeft: '8px' }} />
          </button>
        </form>

        <p className="premium-text-meta" style={{ textAlign: 'center' }}>
          Already registered? <Link to="/login" style={{ color: 'var(--accent)', fontWeight: 700, textDecoration: 'none' }}>Sign in here</Link>
        </p>
      </div>

    </section>
  );
};

export default Register;

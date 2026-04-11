import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { ArrowRight, LockKeyhole, ShieldCheck, Sparkles, Users, X } from 'lucide-react';

const trustPoints = [
  {
    icon: Sparkles,
    title: 'AI-ready learning workspace',
    text: 'Notes, PYQs, summaries, and recommendations stay connected in one elegant surface.',
  },
  {
    icon: ShieldCheck,
    title: 'Trusted academic access',
    text: 'Role-based onboarding keeps students, teachers, and admins inside a secure campus flow.',
  },
  {
    icon: Users,
    title: 'Built for collaboration',
    text: 'Study circles, saved resources, and discussion threads continue without friction.',
  },
];

const initialRegisterForm = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  role: 'Student',
};

const AuthOverlay = ({ mode, onClose, onModeChange, onAuthSuccess }) => {
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState(initialRegisterForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const isRegister = mode === 'register';

  const heading = useMemo(
    () =>
      isRegister
        ? {
            title: 'Launch your CampusIQ workspace',
            subtitle: 'Create your profile and step into a premium academic intelligence layer.',
          }
        : {
            title: 'Welcome back to CampusIQ',
            subtitle: 'Enter your AI-powered campus workspace with one smooth premium flow.',
          },
    [isRegister],
  );

  const updateLoginForm = (event) => {
    setLoginForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const updateRegisterForm = (event) => {
    setRegisterForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  };

  const handleLogin = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post(
        'http://localhost:5000/api/auth/login',
        JSON.stringify(loginForm),
        { headers: { 'Content-Type': 'application/json' } },
      );

      onAuthSuccess(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to login');
      setLoading(false);
    }
  };

  const handleRegister = async (event) => {
    event.preventDefault();
    setError('');

    if (registerForm.password !== registerForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        'http://localhost:5000/api/auth/register',
        JSON.stringify({
          name: registerForm.name,
          email: registerForm.email,
          password: registerForm.password,
          role: registerForm.role,
        }),
        { headers: { 'Content-Type': 'application/json' } },
      );

      onAuthSuccess(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
      setLoading(false);
    }
  };

  return (
    <div className="auth-overlay" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <div className="auth-overlay-backdrop" onClick={onClose} />
      <section className="auth-modal">
        <button className="auth-close" type="button" onClick={onClose} aria-label="Close auth">
          <X size={18} />
        </button>

        <div className="auth-modal-trust">
          <div className="landing-kicker">Immersive Onboarding</div>
          <h2 id="auth-title">{heading.title}</h2>
          <p>{heading.subtitle}</p>

          <div className="auth-modal-points">
            {trustPoints.map((point) => {
              const Icon = point.icon;

              return (
                <article className="auth-modal-point" key={point.title}>
                  <div className="auth-modal-icon">
                    <Icon size={18} />
                  </div>
                  <div>
                    <strong>{point.title}</strong>
                    <span>{point.text}</span>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="auth-modal-signal">
            <LockKeyhole size={16} />
            <span>Secure campus access with elegant low-friction onboarding</span>
          </div>
        </div>

        <div className="auth-modal-form">
          <div className="auth-modal-tabs">
            <button
              className={`auth-tab ${!isRegister ? 'is-active' : ''}`}
              type="button"
              onClick={() => {
                setError('');
                onModeChange('login');
              }}
            >
              Login
            </button>
            <button
              className={`auth-tab ${isRegister ? 'is-active' : ''}`}
              type="button"
              onClick={() => {
                setError('');
                onModeChange('register');
              }}
            >
              Register
            </button>
          </div>

          <div className="auth-form-heading">
            <strong>{isRegister ? 'Create account' : 'Sign in'}</strong>
            <span>{isRegister ? 'Start your product journey here.' : 'Continue into your dashboard.'}</span>
          </div>

          {error ? <div className="error-msg">{error}</div> : null}

          {isRegister ? (
            <form className="auth-overlay-form" onSubmit={handleRegister}>
              <div className="auth-grid auth-grid-two">
                <div className="form-row">
                  <label htmlFor="overlay-name">Full Name</label>
                  <input
                    id="overlay-name"
                    name="name"
                    type="text"
                    placeholder="Enter your name"
                    value={registerForm.name}
                    onChange={updateRegisterForm}
                    required
                  />
                </div>
                <div className="form-row">
                  <label htmlFor="overlay-role">Role</label>
                  <select
                    id="overlay-role"
                    name="role"
                    value={registerForm.role}
                    onChange={updateRegisterForm}
                  >
                    <option value="Student">Student</option>
                    <option value="Teacher">Teacher</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <label htmlFor="overlay-register-email">Email Address</label>
                <input
                  id="overlay-register-email"
                  name="email"
                  type="email"
                  placeholder="you@campusiq.edu"
                  value={registerForm.email}
                  onChange={updateRegisterForm}
                  required
                />
              </div>

              <div className="auth-grid auth-grid-two">
                <div className="form-row">
                  <label htmlFor="overlay-register-password">Password</label>
                  <input
                    id="overlay-register-password"
                    name="password"
                    type="password"
                    placeholder="Create password"
                    value={registerForm.password}
                    onChange={updateRegisterForm}
                    minLength="6"
                    required
                  />
                </div>
                <div className="form-row">
                  <label htmlFor="overlay-confirm-password">Confirm Password</label>
                  <input
                    id="overlay-confirm-password"
                    name="confirmPassword"
                    type="password"
                    placeholder="Repeat password"
                    value={registerForm.confirmPassword}
                    onChange={updateRegisterForm}
                    minLength="6"
                    required
                  />
                </div>
              </div>

              <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
                {loading ? 'Creating account...' : 'Create CampusIQ Account'}
                {!loading ? <ArrowRight size={16} /> : null}
              </button>
            </form>
          ) : (
            <form className="auth-overlay-form" onSubmit={handleLogin}>
              <div className="form-row">
                <label htmlFor="overlay-login-email">Email Address</label>
                <input
                  id="overlay-login-email"
                  name="email"
                  type="email"
                  placeholder="student@campusiq.edu"
                  value={loginForm.email}
                  onChange={updateLoginForm}
                  required
                />
              </div>

              <div className="form-row">
                <label htmlFor="overlay-login-password">Password</label>
                <input
                  id="overlay-login-password"
                  name="password"
                  type="password"
                  placeholder="Enter password"
                  value={loginForm.password}
                  onChange={updateLoginForm}
                  minLength="6"
                  required
                />
              </div>

              <button className="btn btn-primary btn-block" type="submit" disabled={loading}>
                {loading ? 'Authenticating...' : 'Enter CampusIQ'}
                {!loading ? <ArrowRight size={16} /> : null}
              </button>
            </form>
          )}
        </div>
      </section>
    </div>
  );
};

export default AuthOverlay;

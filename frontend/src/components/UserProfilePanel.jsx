import { useEffect, useState } from 'react';
import { X, Star, MessageCircle, BookOpen, Award, GraduationCap, Calendar } from 'lucide-react';
import api from '../lib/api';
import './UserProfilePanel.css';

const UserProfilePanel = ({ userId, onClose, onMessageClick }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    setProfile(null);

    api.get(`/users/${userId}/profile`)
      .then((res) => setProfile(res.data.profile))
      .catch(() => setError('Could not load profile'))
      .finally(() => setLoading(false));
  }, [userId]);

  const handleConnect = async () => {
    try {
      await api.post(`/community/connections/${userId}/connect`);
      alert('Growth Link request sent!');
    } catch (err) {
      alert('Failed to send request');
    }
  };

  const getInitials = (name = '') =>
    name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  const getRoleColor = (role = '') => {
    const r = role.toLowerCase();
    if (r === 'faculty' || r === 'mentor') return '#f59e0b';
    if (r === 'admin') return '#ef4444';
    return '#10b981';
  };

  return (
    <>
      <div className="profile-panel-backdrop" onClick={onClose} />
      <aside className="profile-panel">
        {/* Close */}
        <button className="profile-panel-close" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>

        {loading && (
          <div className="profile-panel-loading">
            <div className="pp-spinner" />
            <span>Loading profile…</span>
          </div>
        )}

        {error && (
          <div className="profile-panel-error">{error}</div>
        )}

        {profile && !loading && (
          <>
            {/* Hero */}
            <div className="pp-hero">
              <div className="pp-banner" />
              <div className="pp-avatar-wrap">
                {profile.avatar ? (
                  <img src={profile.avatar} alt={profile.name} className="pp-avatar-img" />
                ) : (
                  <div className="pp-avatar-initials">
                    {getInitials(profile.name)}
                  </div>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="pp-body">
              <div className="pp-name-row">
                <h2 className="pp-name">{profile.name}</h2>
                <span
                  className="pp-role-badge"
                  style={{ background: `${getRoleColor(profile.role)}22`, color: getRoleColor(profile.role) }}
                >
                  {profile.role}
                </span>
              </div>

              {profile.headline && (
                <p className="pp-headline">{profile.headline}</p>
              )}

              {/* Meta chips */}
              <div className="pp-meta-row">
                {profile.branch && (
                  <span className="pp-meta-chip">
                    <GraduationCap size={13} /> {profile.branch}
                  </span>
                )}
                {profile.year && (
                  <span className="pp-meta-chip">
                    <Calendar size={13} /> Year {profile.year}
                  </span>
                )}
                {profile.joinedAt && (
                  <span className="pp-meta-chip">
                    <Calendar size={13} /> Joined {new Date(profile.joinedAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>

              {/* Score */}
              <div className="pp-score-card">
                <Award size={20} />
                <div>
                  <div className="pp-score-value">{profile.contributionScore}</div>
                  <div className="pp-score-label">Contribution Score</div>
                </div>
              </div>

              {/* Skills */}
              {profile.skills?.length > 0 && (
                <div className="pp-section">
                  <h4 className="pp-section-title">
                    <BookOpen size={14} /> Skills & Interests
                  </h4>
                  <div className="pp-skills">
                    {profile.skills.map((skill, i) => (
                      <span key={i} className="pp-skill-tag">{skill}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="pp-actions" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  className="pp-msg-btn"
                  onClick={() => onMessageClick(profile)}
                  style={{ width: '100%' }}
                >
                  <MessageCircle size={16} />
                  Send Message
                </button>
                <button
                  className="pp-msg-btn"
                  style={{ width: '100%', background: 'rgba(46, 230, 166, 0.1)', color: 'var(--accent)', border: '1px solid var(--accent)' }}
                  onClick={handleConnect}
                >
                  <Star size={16} />
                  Growth Link
                </button>
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );
};

export default UserProfilePanel;

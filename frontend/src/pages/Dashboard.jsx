import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Activity,
  BookOpen,
  BrainCircuit,
  Compass,
  MessageSquareText,
  Trophy,
  Upload,
  Users,
  Video,
  GraduationCap,
  MessagesSquare,
  Hash,
  Handshake,
} from 'lucide-react';
import api from '../lib/api';
import useApiResource from '../hooks/useApiResource';
import useRealtimeRefresh from '../hooks/useRealtimeRefresh';
import DataStatePanel from '../components/DataStatePanel';
import { getStoredUser } from '../lib/session';
import { fetchUserChats, getMentorProfile, loadMentorPreview } from '../lib/mentorSystem';
import NetworkRequestsNotification from '../components/NetworkRequestsNotification';

const moduleCatalog = [
  {
    title: 'Interactions',
    to: '/community',
    icon: MessageSquareText,
    key: 'activeDiscussions',
    color: 'var(--accent)',
    description: 'Real-time peer discussions & doubt solving',
  },
  {
    title: 'Live Classes',
    to: '/live-classes',
    icon: Video,
    key: 'liveClassesCount',
    color: '#3B82F6',
    description: 'Expert-led sessions & workshops',
  },
  {
    title: 'Study Genie',
    to: '/summaries',
    icon: BrainCircuit,
    key: 'aiSummariesCount',
    color: '#8B5CF6',
    description: 'AI-powered PDF intelligence & revision',
  },
  {
    title: 'Resource Hub',
    to: '/resources',
    icon: BookOpen,
    key: 'uploadedCount',
    color: 'var(--gold)',
    description: 'Premium notes, PYQs & materials',
  },
  {
    title: 'Career Roadmap',
    to: '/roadmap',
    icon: Compass,
    key: 'aiSummariesCount',
    color: '#EC4899',
    description: 'Personalized academic momentum',
  },
  {
    title: 'Mentors',
    to: '/mentors',
    icon: Users,
    key: 'onlineUsers',
    color: 'var(--warm-accent)',
    description: 'Connect with campus leaders',
  },
];

const getInitials = (name = '') =>
  name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const getFirstName = (name = '') => String(name || '').trim().split(' ')[0] || 'there';

const Dashboard = () => {
  const navigate = useNavigate();
  const [globalSearch, setGlobalSearch] = useState('');
  const [mentorPreview, setMentorPreview] = useState([]);
  const [mentorChats, setMentorChats] = useState([]);
  const [mentorProfile, setMentorProfile] = useState(null);
  const currentUser = useMemo(() => getStoredUser(), []);
  const role = String(currentUser?.role || '').toLowerCase();
  const isMentorRole = role === 'faculty' || role === 'graduate';

  const loadDashboard = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      throw new Error('Authentication required');
    }
    const response = await api.get('/dashboard/home');
    return response.data;
  }, [navigate]);

  const { data: dashboard, loading, error, reload } = useApiResource(loadDashboard, [loadDashboard]);
  const firstName = getFirstName(dashboard?.user?.name);
  const mentorDisplayUser = dashboard?.user || currentUser || {};
  const mentorFirstName = getFirstName(mentorDisplayUser?.name);

  useRealtimeRefresh({
    channels: ['dashboard', 'discussions', 'live-classes', 'notifications'],
    onRefresh: reload,
    enabled: Boolean(localStorage.getItem('token')),
  });

  useEffect(() => {
    if (isMentorRole && currentUser?.id) {
      getMentorProfile().then(setMentorProfile).catch(() => setMentorProfile(null));
      fetchUserChats().then(setMentorChats).catch(() => setMentorChats([]));
      const intervalId = window.setInterval(() => {
        fetchUserChats().then(setMentorChats).catch(() => setMentorChats([]));
      }, 5000);

      return () => window.clearInterval(intervalId);
    }

    loadMentorPreview(3).then(setMentorPreview).catch(() => setMentorPreview([]));
    return undefined;
  }, [currentUser?.id, isMentorRole]);

  const filteredModules = useMemo(() => {
    if (!dashboard) return [];
    const queryText = globalSearch.trim().toLowerCase();
    if (!queryText) return moduleCatalog;
    return moduleCatalog.filter(
      (module) =>
        module.title.toLowerCase().includes(queryText)
        || module.description.toLowerCase().includes(queryText),
    );
  }, [dashboard, globalSearch]);

  if (!isMentorRole && (loading || error || !dashboard)) {
    return (
      <div className="premium-grid-base">
        <div style={{ gridColumn: 'span 12' }}>
          <DataStatePanel
            loading={loading}
            error={error}
            empty={!loading && !error && !dashboard}
            onRetry={reload}
            loadingLabel="Initializing Command Center..."
          />
        </div>
      </div>
    );
  }

  if (isMentorRole) {
    const mentorExpertise = (mentorProfile?.subjects || mentorProfile?.skills || []).slice(0, 6);
    const mentorHighlights = [
      { label: 'Institution', value: mentorProfile?.college },
      { label: 'Role', value: mentorProfile?.currentJob },
      { label: 'Organization', value: mentorProfile?.company },
      { label: 'Class', value: mentorProfile?.graduationYear ? `Class of ${mentorProfile.graduationYear}` : null },
    ].filter((h) => h.value);

    return (
      <div className="premium-grid-base db-mentor-dashboard">
        {/* --- Hero Section --- */}
        <header className="premium-card db-mentor-hero" style={{ gridColumn: 'span 12', background: 'var(--hero-gradient)', position: 'relative' }}>
          <div className="flex-row db-hero-content">
            <div className="flex-row gap-28 db-hero-info">
              <div
                style={{
                  width: '100px',
                  height: '100px',
                  borderRadius: '30px',
                  overflow: 'hidden',
                  background: 'var(--surface-elevated)',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: '32px',
                  fontWeight: 900,
                  color: 'var(--accent)',
                  border: '2px solid rgba(46, 230, 166, 0.2)',
                  boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)',
                }}
              >
                {mentorProfile?.profilePic ? (
                  <img src={mentorProfile.profilePic} alt={mentorDisplayUser.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  getInitials(mentorDisplayUser.name || 'Mentor')
                )}
              </div>

              <div className="flex-column gap-12">
                <div className="flex-row gap-10 items-center" style={{ color: 'var(--accent)' }}>
                  <GraduationCap size={18} />
                  <span className="premium-text-meta" style={{ letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 800 }}>
                    Mentor Intelligence Console
                  </span>
                </div>
                <h1 className="premium-text-hero" style={{ margin: 0, fontSize: '48px' }}>
                  Welcome back, <span style={{ color: 'var(--accent)' }}>{mentorFirstName}</span>
                </h1>
                <p className="premium-text-body subdued" style={{ maxWidth: '680px', fontSize: '18px', opacity: 0.9 }}>
                  Your current status is <strong style={{ color: 'var(--text)' }}>{mentorProfile?.availableForMentorship ? 'Active & Visible' : 'Inactive'}</strong>. Manage your student interactions and profile highlights from this dashboard.
                </p>
                <div className="flex-row gap-12 flex-wrap mt-8">
                  <span className="premium-chip" style={{ background: 'rgba(46, 230, 166, 0.15)', padding: '8px 16px' }}>
                    {role === 'faculty' ? 'Faculty Expert' : 'Graduate Alumni'}
                  </span>
                  {mentorProfile?.graduationYear && (
                    <span className="premium-chip-outline" style={{ padding: '8px 16px' }}>
                      Batch of {mentorProfile.graduationYear}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-column gap-16 db-hero-actions">
              <div className="flex-column gap-10">
                <Link className="premium-button" style={{ width: '100%', justifyContent: 'center', padding: '16px' }} to="/messages">
                  <MessagesSquare size={18} />
                  Go to Chat Center
                </Link>
                <Link className="premium-button-secondary" style={{ width: '100%', justifyContent: 'center', padding: '16px' }} to="/profile">
                  Update Mentor Profile
                </Link>
              </div>
              <div className="premium-card" style={{ background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="flex-row justify-between items-center">
                  <span className="premium-text-meta">Reachability</span>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: mentorProfile?.availableForMentorship ? 'var(--accent)' : '#ff5a5f', boxShadow: `0 0 12px ${mentorProfile?.availableForMentorship ? 'var(--accent)' : '#ff5a5f'}` }} />
                </div>
                <strong style={{ display: 'block', marginTop: '4px', fontSize: '15px' }}>
                  {mentorProfile?.availableForMentorship ? 'Discovery Mode: ON' : 'Hidden from students'}
                </strong>
              </div>
            </div>
          </div>
        </header>

        {/* --- Stats and Profile Brief --- */}
        <section className="premium-card flex-column gap-24" style={{ gridColumn: 'span 7', background: 'var(--surface-dark)' }}>
          <div className="flex-row justify-between items-center">
            <div className="flex-column gap-4">
              <h3 className="premium-text-h3" style={{ margin: 0 }}>Public Profile Persona</h3>
              <span className="premium-text-meta">How students perceive your expertise</span>
            </div>
            <Link to="/profile" className="premium-text-meta" style={{ color: 'var(--accent)' }}>Preview Profile</Link>
          </div>

          <div className="premium-card" style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed rgba(255,255,255,0.1)' }}>
            <p className="premium-text-body" style={{ margin: 0, fontSize: '15px', fontStyle: 'italic', lineHeight: 1.6 }}>
              "{mentorProfile?.bio || 'You haven\'t set a bio yet. A strong bio helps students understand how you can help them.'}"
            </p>
          </div>

          <div className="flex-column gap-12">
            <span className="premium-text-meta" style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>Key Credentials</span>
            <div className="grid-6-6 gap-16">
              {mentorHighlights.map((item) => (
                <div key={item.label} className="flex-column gap-4" style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <span className="premium-text-meta" style={{ fontSize: '11px' }}>{item.label}</span>
                  <strong style={{ color: 'var(--text)', fontSize: '14px' }}>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="flex-column gap-12">
            <span className="premium-text-meta" style={{ textTransform: 'uppercase', letterSpacing: '0.1em' }}>Core Expertise</span>
            <div className="flex-row flex-wrap gap-8">
              {mentorExpertise.map((item) => (
                <span key={item} className="premium-chip-outline" style={{ background: 'rgba(46, 230, 166, 0.05)', borderColor: 'rgba(46, 230, 166, 0.12)', color: 'var(--accent)' }}>
                  {item}
                </span>
              ))}
              {mentorExpertise.length === 0 && <span className="premium-text-meta">No expertise tags added.</span>}
            </div>
          </div>
        </section>

        <section className="premium-card flex-column gap-24" style={{ gridColumn: 'span 5', minHeight: '100%' }}>
          <h3 className="premium-text-h3" style={{ margin: 0 }}>Performance Overview</h3>
          
          <div className="flex-column gap-16">
            <div className="premium-card flex-row justify-between items-center" style={{ background: 'rgba(46, 230, 166, 0.08)', border: '1px solid rgba(46, 230, 166, 0.15)', padding: '20px' }}>
              <div className="flex-column gap-4">
                <span className="premium-text-meta">Active Conversations</span>
                <strong style={{ fontSize: '28px', color: 'var(--text)' }}>{mentorChats.length}</strong>
              </div>
              <div style={{ padding: '12px', background: 'rgba(46, 230, 166, 0.1)', borderRadius: '12px', color: 'var(--accent)' }}>
                <MessagesSquare size={24} />
              </div>
            </div>

            <div className="premium-card flex-row justify-between items-center" style={{ background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.15)', padding: '20px' }}>
              <div className="flex-column gap-4">
                <span className="premium-text-meta">Total Contributions</span>
                <strong style={{ fontSize: '28px', color: 'var(--text)' }}>{mentorDisplayUser?.contributionScore || 0}</strong>
              </div>
              <div style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '12px', color: '#3B82F6' }}>
                <Activity size={24} />
              </div>
            </div>

            <div className="premium-card" style={{ background: 'var(--surface-elevated)', marginTop: '8px' }}>
              <h4 className="premium-text-meta" style={{ color: 'var(--text)', fontWeight: 700, marginBottom: '12px' }}>AI Match Intelligence</h4>
              <p className="premium-text-meta" style={{ margin: 0, lineHeight: 1.6 }}>
                Students are currently seeing your profile based on their skills and your expertise. 
                <strong style={{ color: 'var(--accent)' }}> {mentorChats.length > 5 ? 'High demand' : 'Normal volume'}</strong> detected for your profile this week.
              </p>
            </div>
          </div>
        </section>

        {/* --- Activity Center --- */}
        <section className="premium-card flex-column gap-24" style={{ gridColumn: 'span 12' }}>
          <div className="flex-row justify-between items-center">
            <div className="flex-column gap-4">
              <h3 className="premium-text-h3" style={{ margin: 0 }}>Active Student Enquiries</h3>
              <span className="premium-text-meta">Recent chat activity and mentorship requests</span>
            </div>
            <Link to="/messages" className="premium-button-secondary" style={{ padding: '8px 16px', fontSize: '13px' }}>
              Full Conversation Manager
            </Link>
          </div>

          {mentorChats.length ? (
            <div className="premium-grid-base" style={{ padding: 0, gap: '20px' }}>
              {mentorChats.slice(0, 3).map((chat) => (
                <div
                  key={chat.id}
                  className="premium-card hover-lift"
                  style={{ gridColumn: 'span 4', padding: '24px', cursor: 'pointer', background: 'rgba(255,255,255,0.02)' }}
                  onClick={() => navigate(`/messages?user=${chat.withUserId}`)}
                >
                  <div className="flex-column gap-20">
                    <div className="flex-row justify-between items-start">
                      <div className="flex-row gap-12 items-center">
                        <div style={{ width: 44, height: 44, borderRadius: '14px', overflow: 'hidden', background: 'var(--surface-elevated)', display: 'grid', placeItems: 'center', fontWeight: 800, border: '1px solid rgba(255,255,255,0.08)' }}>
                          {chat.withUserAvatar ? (
                            <img src={chat.withUserAvatar} alt={chat.withUserName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            getInitials(chat.withUserName)
                          )}
                        </div>
                        <div className="flex-column gap-2">
                          <strong style={{ color: 'var(--text)' }}>{chat.withUserName}</strong>
                          <span className="premium-text-meta">{chat.withUserRole}</span>
                        </div>
                      </div>
                      <span className="premium-chip" style={{ fontSize: '10px', padding: '4px 8px' }}>Active</span>
                    </div>

                    <div className="premium-card" style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '12px' }}>
                      <p className="premium-text-meta" style={{ margin: 0, color: 'var(--text)', fontSize: '13px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {chat.lastMessage || 'Initial connection established.'}
                      </p>
                    </div>

                    <div className="flex-row justify-between items-center mt-4">
                      <span className="premium-text-meta" style={{ fontSize: '11px' }}>{chat.lastMessageAt ? new Date(chat.lastMessageAt).toLocaleDateString() : 'Recent'}</span>
                      <span style={{ color: 'var(--accent)', fontSize: '12px', fontWeight: 700 }}>Resume Chat →</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="premium-card" style={{ textAlign: 'center', padding: '60px', background: 'rgba(255,255,255,0.01)', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <MessagesSquare size={48} style={{ color: 'var(--muted)', marginBottom: '16px', opacity: 0.3 }} />
              <h4 className="premium-text-h3" style={{ opacity: 0.6 }}>No active conversations</h4>
              <p className="premium-text-meta">Once students discover your profile and reach out, their messages will appear here.</p>
            </div>
          )}
        </section>

        {/* --- Quick Tips --- */}
        <section className="premium-card flex-row justify-between items-center" style={{ gridColumn: 'span 12', padding: '24px 32px', border: '1px solid rgba(46, 230, 166, 0.1)' }}>
          <div className="flex-row gap-20 items-center">
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(46, 230, 166, 0.1)', color: 'var(--accent)', display: 'grid', placeItems: 'center' }}>
              <BrainCircuit size={24} />
            </div>
            <div className="flex-column gap-4">
              <h4 className="premium-text-h3" style={{ margin: 0, fontSize: '16px' }}>Pro-Tip: Respond within 24 hours</h4>
              <p className="premium-text-meta" style={{ margin: 0 }}>Mentors with faster response times are prioritized 3x more in the discovery algorithmic feed.</p>
            </div>
          </div>
          <button className="premium-button-secondary" style={{ padding: '10px 20px', fontSize: '13px' }}>View Best Practices</button>
        </section>
      </div>
    );
  }


  const statsMetrics = [
    { label: 'Conducted Classes', value: dashboard.stats.liveClassesCount, icon: Video, color: 'var(--accent)' },
    { label: 'Resources Uploaded', value: dashboard.stats.uploadedCount, icon: BookOpen, color: 'var(--accent)' },
    { label: 'Active Discussions', value: dashboard.stats.activeDiscussions, icon: MessageSquareText, color: 'var(--accent)' },
    { label: 'Contribution Score', value: dashboard.stats.contributionScore, icon: Trophy, color: 'var(--accent)' },
  ];

  return (
    <div className="premium-grid-base db-student-dashboard" style={{ position: 'relative' }}>
      <NetworkRequestsNotification />
      <main className="flex-column gap-32" style={{ gridColumn: 'span 12' }}>
        <header className="flex-column gap-16" style={{ marginBottom: '20px' }}>
          <div className="flex-column gap-8">
            <div className="flex-row gap-8" style={{ color: 'var(--accent)' }}>
              <Activity size={16} />
              <span className="premium-text-meta" style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>Intelligence Hub</span>
            </div>
            <h1 className="premium-text-hero" style={{ marginBottom: '8px' }}>Welcome {firstName}</h1>
            <p className="premium-text-body" style={{ opacity: 0.8, fontStyle: 'italic' }}>
              "Empowering your academic journey with intelligence and community collaboration."
            </p>
          </div>
        </header>

        <section className="db-stats-grid">
          {statsMetrics.map((metric) => (
            <div key={metric.label} className="premium-card flex-row gap-16" style={{ gridColumn: 'span 3', padding: '20px' }}>
              <div style={{ width: '44px', height: '44px', minWidth: '44px', background: `${metric.color}15`, borderRadius: '12px', color: metric.color, display: 'grid', placeItems: 'center' }}>
                <metric.icon size={22} />
              </div>
              <div className="flex-column gap-4" style={{ gap: '4px' }}>
                <span className="premium-text-meta" style={{ fontSize: '12px' }}>{metric.label}</span>
                <strong style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text)' }}>{metric.value}</strong>
              </div>
            </div>
          ))}
        </section>

        <div className="mt-20">
          <h2 className="premium-text-h2" style={{ marginBottom: '24px', fontSize: '26px', fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.02em', fontWeight: '800' }}>Quick Links</h2>
          <section className="db-links-grid">
            {[
              { label: 'Resource Hub', to: '/resources', icon: BookOpen, desc: 'Premium materials' },
              { label: 'Study Genie', to: '/summaries', icon: BrainCircuit, desc: 'AI Intelligence' },
              { label: 'Mentors', to: '/mentors', icon: Users, desc: 'Expert guidance' },
              { label: 'Social', to: '/community', icon: MessageSquareText, desc: 'Community feed' },
              { label: 'Learn Together', to: '/study-rooms', icon: Hash, desc: 'Group study' },
              { label: 'Collaborate', to: '/team-finder', icon: Handshake, desc: 'Team finder' },
            ].map((item) => (
              <Link
                key={item.label}
                to={item.to}
                className="premium-card hover-lift db-link-card"
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(46, 230, 166, 0.15)';
                  e.currentTarget.style.borderColor = 'rgba(46, 230, 166, 0.6)';
                  e.currentTarget.style.boxShadow = '0 0 40px rgba(46, 230, 166, 0.25), 0 12px 30px rgba(0, 0, 0, 0.5)';
                  if (window.innerWidth > 768) e.currentTarget.style.transform = 'translateY(-8px)';
                  
                  const iconContainer = e.currentTarget.querySelector('.icon-container');
                  if (iconContainer) {
                    iconContainer.style.background = 'rgba(46, 230, 166, 0.25)';
                    iconContainer.style.transform = 'scale(1.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--interactive-card-bg)';
                  e.currentTarget.style.borderColor = 'transparent';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
                  
                  const iconContainer = e.currentTarget.querySelector('.icon-container');
                  if (iconContainer) {
                    iconContainer.style.background = 'rgba(46, 230, 166, 0.1)';
                    iconContainer.style.transform = 'scale(1)';
                  }
                }}
                style={{
                  gridColumn: 'span 4',
                  background: 'var(--interactive-card-bg)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '20px',
                  border: '1px solid transparent',
                  transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                  padding: '32px 24px'
                }}
              >
                <div 
                  className="icon-container"
                  style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '18px',
                  background: 'rgba(46, 230, 166, 0.1)',
                  color: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(46, 230, 166, 0.15)',
                  transition: 'all 0.3s ease'
                }}>
                  <item.icon size={32} />
                </div>
                <div className="flex-column" style={{ gap: '6px', alignItems: 'center' }}>
                  <h3 className="premium-text-h3" style={{ margin: 0, fontSize: '22px', fontWeight: '800', fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.01em', color: 'var(--text)' }}>{item.label}</h3>
                  <span className="premium-text-meta" style={{ fontSize: '14px', fontFamily: "'Outfit', sans-serif", opacity: 0.7 }}>{item.desc}</span>
                </div>
              </Link>
            ))}
          </section>
        </div>

        <section className="premium-card flex-column gap-20" style={{ marginTop: '12px' }}>
          <div className="flex-row db-mentor-spotlight-header">
            <div className="flex-column gap-6">
              <div className="flex-row gap-8" style={{ color: 'var(--accent)' }}>
                <Users size={16} />
                <span className="premium-text-meta" style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  Mentor Spotlight
                </span>
              </div>
              <h2 className="premium-text-h2" style={{ margin: 0, fontSize: '22px' }}>Start mentorship from your dashboard</h2>
              <p className="premium-text-meta" style={{ maxWidth: '720px' }}>
                Browse the best-fit mentors, open an AI mentor brief, and start a structured request without leaving your core student workflow.
              </p>
            </div>
            <Link className="premium-button" to="/mentors">
              Open mentor hub
            </Link>
          </div>

          {mentorPreview.length ? (
            <div className="premium-grid-base db-mentor-preview-grid" style={{ padding: 0 }}>
              {mentorPreview.map((mentor) => (
                <article
                  key={mentor.id}
                  className="premium-card flex-column gap-16"
                  style={{ gridColumn: 'span 4', background: 'linear-gradient(180deg, rgba(14, 22, 36, 0.98) 0%, rgba(10, 17, 29, 0.96) 100%)' }}
                >
                  <div className="flex-row justify-between items-start gap-16">
                    <div className="flex-row gap-12 items-center">
                      <div style={{ width: '56px', height: '56px', borderRadius: '18px', overflow: 'hidden', background: 'var(--surface-elevated)', display: 'grid', placeItems: 'center', fontWeight: 800 }}>
                        {mentor.profilePic ? (
                          <img src={mentor.profilePic} alt={mentor.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          getInitials(mentor.name)
                        )}
                      </div>
                      <div className="flex-column gap-4">
                        <strong>{mentor.name}</strong>
                        <span className="premium-text-meta" style={{ textTransform: 'capitalize' }}>{mentor.role}</span>
                      </div>
                    </div>
                    <span className="premium-chip">{mentor.matchScore || 72}% fit</span>
                  </div>

                  <p className="premium-text-meta" style={{ minHeight: '44px' }}>
                    {mentor.bio || 'Available for guided academic and career mentorship.'}
                  </p>

                  <div className="flex-row gap-8 flex-wrap">
                    {(mentor.matchReasons || []).slice(0, 2).map((reason) => (
                      <span key={reason} className="premium-chip-outline">{reason}</span>
                    ))}
                  </div>

                  <div className="flex-row gap-10 mt-auto">
                    <Link className="premium-button-secondary" style={{ flex: 1, justifyContent: 'center' }} to="/mentors">
                      View details
                    </Link>
                    <Link className="premium-button" style={{ flex: 1, justifyContent: 'center' }} to={`/messages?user=${mentor.id}&compose=request`}>
                      Start request
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="premium-text-meta">Mentor matches will appear here once the directory is ready.</p>
          )}
        </section>
      </main>
    </div>
  );
};

export default Dashboard;

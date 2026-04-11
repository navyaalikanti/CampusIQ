import { useEffect, useState, useMemo } from 'react';
import { X, UserPlus, CheckCircle2, MessageCircle, Send, Plus, Zap, Star, ShieldCheck, Flame, Award, Activity, Bot } from 'lucide-react';
import api from '../lib/api';
import { SkillHexagon, Heatmap, ActivityBarChart, SubjectDonutChart } from '../pages/ProfilePage';
import './UserProfileDrawer.css';

const UserProfileDrawer = ({ userId, isOpen, onClose, onStartDM }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && userId) {
      fetchProfile();
    }
  }, [isOpen, userId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/users/${userId}/profile`);
      setProfile(res.data);
    } catch (err) {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      await api.post(`/community/connections/${userId}/connect`);
      fetchProfile();
    } catch (err) {
      alert('Failed to send request');
    }
  };

  const getInitials = (name = '') =>
    name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  const activityDates = useMemo(() => {
    const map = {};
    const add = (d) => { if (d) { const k = new Date(d).toISOString().slice(0, 10); map[k] = (map[k] || 0) + 1; } };
    (profile?.recentPosts || []).forEach(r => add(r.createdAt));
    (profile?.uploads || []).forEach(r => add(r.createdAt));
    (profile?.summaries || []).forEach(r => add(r.createdAt));
    return map;
  }, [profile]);

  const score = profile?.profile?.contributionScore || profile?.profile?.collabScore || 0;
  const recentPostsNum = profile?.recentPosts?.length || 0;
  
  const skills = [
    { label: 'Intelligence', pct: Math.min(100, 50 + score / 5) },
    { label: 'Contribution', pct: Math.min(100, 35 + recentPostsNum * 10) },
    { label: 'Networking', pct: Math.min(100, 40 + recentPostsNum * 8) },
    { label: 'Curation', pct: Math.min(100, 45 + recentPostsNum * 5) },
    { label: 'AI Fluency', pct: Math.min(100, 35 + recentPostsNum * 15) },
    { label: 'Consistency', pct: Math.min(100, 40 + Object.keys(activityDates).length * 5) }
  ];

  const barData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const now = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      const iso = d.toISOString().slice(0, 10);
      return { label: days[d.getDay()], value: activityDates[iso] || 0 };
    });
  }, [activityDates]);

  const uploadsNum = profile?.uploads?.length || 0;
  const summariesNum = profile?.summaries?.length || 0;

  const donutData = useMemo(() => [
    { label: 'Resources', value: uploadsNum, color: 'var(--accent)' },
    { label: 'Summaries', value: summariesNum, color: '#8B5CF6' },
    { label: 'Discussions', value: recentPostsNum, color: 'var(--gold)' }
  ], [uploadsNum, summariesNum, recentPostsNum]);

  const myId = useMemo(() => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      return JSON.parse(atob(token.split('.')[1])).user.id;
    } catch { return null; }
  }, []);

  if (!isOpen) return null;

  return (
    <div className="profile-drawer-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
      <div className={`profile-drawer ${isOpen ? 'open' : ''}`} onClick={(e) => e.stopPropagation()} style={{ width: '450px', maxWidth: '100%', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '24px', padding: '24px', overflowY: 'auto', paddingBottom: '100px' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div className="flex-row gap-16 items-center">
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%)', display: 'grid', placeItems: 'center', fontSize: '24px', fontWeight: 'bold', color: '#000', border: '3px solid rgba(255,255,255,0.05)' }}>
              {profile?.profile?.avatar ? <img src={profile.profile.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : getInitials(profile?.profile?.name)}
            </div>
            <div className="flex-column gap-4">
              <h1 className="premium-text-h2" style={{ margin: 0 }}>{profile?.profile?.name}</h1>
              <div className="flex-row gap-8">
                 <span className="premium-chip" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--muted)', fontSize: '10px' }}>{profile?.profile?.branch} • Year {profile?.profile?.year}</span>
                 <span className="premium-chip" style={{ background: 'rgba(46, 230, 166, 0.1)', color: 'var(--accent)', fontSize: '10px' }}><Bot size={10} style={{marginRight: 4}}/> Verified</span>
              </div>
            </div>
          </div>
          <button className="profile-close-btn" style={{ background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', padding: '6px', cursor: 'pointer', color: 'var(--muted)' }} onClick={onClose}><X size={18} /></button>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          <div className="premium-card" style={{ padding: '14px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <span style={{ opacity: 0.5, fontSize: '9px', letterSpacing: '1px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)' }}>CONTRIBUTION</span>
            <strong style={{ color: 'var(--accent)', margin: 0, fontSize: '22px', fontWeight: 800, lineHeight: 1 }}>{score}</strong>
          </div>
          <div className="premium-card" style={{ padding: '14px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <span style={{ opacity: 0.5, fontSize: '9px', letterSpacing: '1px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)' }}>GLOBAL RANK</span>
            <strong style={{ color: 'var(--gold)', margin: 0, fontSize: '22px', fontWeight: 800, lineHeight: 1 }}>#--</strong>
          </div>
          <div className="premium-card" style={{ padding: '14px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <span style={{ opacity: 0.5, fontSize: '9px', letterSpacing: '1px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)' }}>STREAK</span>
            <strong style={{ color: 'var(--accent)', margin: 0, fontSize: '22px', fontWeight: 800, lineHeight: 1, display: 'flex', alignItems: 'center', gap: '4px' }}><Flame size={16} />{Object.keys(activityDates).length}</strong>
          </div>
        </div>



        {/* Skill Hexagon */}
        <section className="premium-card flex-column" style={{ padding: '24px 0', overflow: 'visible' }}>
           <h3 className="premium-text-h3 mb-24" style={{ fontSize: '14px', alignSelf: 'flex-start', paddingLeft: '24px', margin: '0 0 24px 0' }}>Skill DNA</h3>
           <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
             <SkillHexagon skills={skills} />
           </div>
        </section>

        {/* Identity Badges */}
        <section className="premium-card flex-column gap-12" style={{ padding: '20px' }}>
           <h3 className="premium-text-h3" style={{ margin: 0, fontSize: '14px' }}>Identity Badges</h3>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                 {recentPostsNum > 0 ? (
                    <span className="premium-chip" style={{ background: 'rgba(46, 230, 166, 0.1)', color: 'var(--accent)', whiteSpace: 'nowrap' }}><Star size={12}/> First Publish</span>
                 ) : (
                    <span className="premium-chip" style={{ background: 'transparent', opacity: 0.6, border: '1px dashed rgba(255,255,255,0.4)', color: 'var(--muted)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}><Star size={12} style={{marginRight: 6}}/> 1st Publish Milestone</span>
                 )}
                 {recentPostsNum > 4 ? (
                    <span className="premium-chip" style={{ background: 'rgba(212, 175, 55, 0.1)', color: 'var(--gold)', whiteSpace: 'nowrap' }}><Award size={12}/> Knowledge Pillar (5+)</span>
                 ) : (
                    <span className="premium-chip" style={{ background: 'transparent', opacity: 0.6, border: '1px dashed rgba(255,255,255,0.4)', color: 'var(--muted)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}><Award size={12} style={{marginRight: 6}}/> Knowledge Pillar</span>
                 )}
                 {recentPostsNum > 9 ? (
                    <span className="premium-chip" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6', whiteSpace: 'nowrap' }}><MessageCircle size={12}/> Helpful Peer (10+ Doubts)</span>
                 ) : (
                    <span className="premium-chip" style={{ background: 'transparent', opacity: 0.6, border: '1px dashed rgba(255,255,255,0.4)', color: 'var(--muted)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}><MessageCircle size={12} style={{marginRight: 6}}/> Solved 10 Doubts</span>
                 )}
                 {recentPostsNum > 24 ? (
                    <span className="premium-chip" style={{ background: 'rgba(46, 230, 166, 0.1)', color: 'var(--accent)', whiteSpace: 'nowrap' }}><Flame size={12}/> Community Expert (25+)</span>
                 ) : (
                    <span className="premium-chip" style={{ background: 'transparent', opacity: 0.6, border: '1px dashed rgba(255,255,255,0.4)', color: 'var(--muted)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}><Flame size={12} style={{marginRight: 6}}/> Solved 25 Doubts</span>
                 )}
                 {recentPostsNum > 2 ? (
                    <span className="premium-chip" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8B5CF6', whiteSpace: 'nowrap' }}><Zap size={12}/> AI Prodigy (3+)</span>
                 ) : (
                    <span className="premium-chip" style={{ background: 'transparent', opacity: 0.6, border: '1px dashed rgba(255,255,255,0.4)', color: 'var(--muted)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}><Zap size={12} style={{marginRight: 6}}/> AI Prodigy (3+ Insights)</span>
                 )}
                 {Object.keys(activityDates).length > 6 ? (
                    <span className="premium-chip" style={{ background: 'rgba(46, 230, 166, 0.1)', color: 'var(--accent)', whiteSpace: 'nowrap' }}><Activity size={12}/> Consistency Pro (7 Days)</span>
                 ) : (
                    <span className="premium-chip" style={{ background: 'transparent', opacity: 0.6, border: '1px dashed rgba(255,255,255,0.4)', color: 'var(--muted)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}><Activity size={12} style={{marginRight: 6}}/> 7-Day Streak</span>
                 )}
                 <span className="premium-chip" style={{ background: 'transparent', opacity: 0.6, border: '1px solid rgba(255,255,255,0.4)', color: 'var(--muted)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>Beta Explorer</span>
           </div>
        </section>

        {/* Heatmap */}
        <section className="premium-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px', overflowX: 'auto', minHeight: '200px' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="premium-text-h3" style={{ margin: 0, fontSize: '14px' }}>Contribution Matrix</h3>
              <span className="premium-text-meta" style={{ opacity: 0.5 }}>Last 24 Weeks</span>
           </div>
           <div style={{ minWidth: '100%', width: '100%', height: '140px', display: 'flex', flexDirection: 'column' }}>
             <Heatmap activityDates={activityDates} />
           </div>
        </section>

        {/* Bar & Donut Mini Grid */}
        <section className="flex-column gap-16">
           <div className="premium-card" style={{ padding: '20px' }}>
              <h3 className="premium-text-h3 mb-16" style={{ margin: 0, fontSize: '14px' }}>Weekly Activity Trends</h3>
              <ActivityBarChart data={barData} />
           </div>
           <div className="premium-card" style={{ padding: '20px' }}>
              <h3 className="premium-text-h3 mb-24" style={{ margin: 0, fontSize: '14px' }}>Type Distribution</h3>
              <div style={{ display: 'grid', placeItems: 'center', transform: 'scale(0.9)', transformOrigin: 'center left' }}>
                 <SubjectDonutChart data={donutData} />
              </div>
           </div>
        </section>

        {/* Recent Posts List */}
        <section className="premium-card flex-column gap-16" style={{ padding: '20px' }}>
           <h3 className="premium-text-h3" style={{ margin: 0, fontSize: '14px' }}>Recent Public Discussions</h3>
           <div className="flex-column gap-12">
             {(profile?.recentPosts || []).map(post => (
               <article key={post.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                 <div style={{ fontSize: '10px', color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '4px' }}>
                   {post.type}
                 </div>
                 <h4 style={{ margin: '0 0 6px', fontSize: '13px', fontWeight: 600 }}>{post.title}</h4>
                 <p className="premium-text-meta subdued" style={{ fontSize: '12px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                   {post.content}
                 </p>
               </article>
             ))}
             {(!profile?.recentPosts || profile.recentPosts.length === 0) && (
               <p className="premium-text-meta subdued" style={{ textAlign: 'center', marginTop: '10px' }}>No recent public posts.</p>
             )}
           </div>
        </section>

        {/* Actions */}
        <div className="flex-column gap-12" style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            {profile?.connectionStatus === 'connected' && (
               <button className="premium-button" style={{ width: '100%', padding: '10px' }} onClick={() => { onStartDM(profile.profile); onClose(); }}>
                 <MessageCircle size={16} /> Direct Message
               </button>
            )}
            {profile?.connectionStatus === 'pending' && (
              <span className="profile-status-badge pending" style={{ width: '100%', textAlign: 'center', padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', fontSize: '12px' }}>Request Sent</span>
            )}
            {(!profile?.connectionStatus || profile.connectionStatus === 'none') && userId !== myId && (
              <button className="premium-button-secondary" style={{ width: '100%', padding: '10px', borderColor: 'var(--accent)', color: 'var(--accent)' }} onClick={handleConnect}>
                <UserPlus size={16} /> Growth Link
              </button>
            )}
        </div>

      </div>
    </div>
  );
};

export default UserProfileDrawer;

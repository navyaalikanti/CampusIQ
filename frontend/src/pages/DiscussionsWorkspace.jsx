import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useSearchParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  FileText,
  Handshake,
  Link as LinkIcon,
  MessageSquareText,
  Plus,
  Radio,
  Search,
  Send,
  Sparkles,
  Trophy,
  Users,
  Video,
  WandSparkles,
  X,
  BookOpen,
  UserPlus,
  ChevronDown,
  ChevronUp,
  ThumbsUp,
  MessageCircle,
  Clock,
  Star,
  Zap,
  Shield,
  Lightbulb,
  ArrowRight,
  Target,
  UserCheck,
  TrendingUp,
  TrendingDown,
  CheckCheck,
  Megaphone
} from 'lucide-react';
import { JitsiMeeting } from '@jitsi/react-sdk';
import api from '../lib/api';
import useApiResource from '../hooks/useApiResource';
import useRealtimeRefresh from '../hooks/useRealtimeRefresh';
import DataStatePanel from '../components/DataStatePanel';
import DMPanel from '../components/DMPanel';
import UserProfileDrawer from '../components/UserProfileDrawer';
import './DiscussionsWorkspace.css';

const TABS = [
  { id: 'feed',         label: 'Campus Feed',  icon: MessageSquareText },
  { id: 'network',      label: 'Peer Network', icon: Users },
  { id: 'teams',        label: 'Project Teams', icon: Handshake },
  { id: 'resources',    label: 'Resource Hub', icon: BookOpen },
];

const POST_TYPES = [
  { id: 'announcement', label: 'Announcement', desc: 'Important news & hackathons', icon: Megaphone },
  { id: 'doubt',        label: 'Doubt',           desc: 'Ask the community', icon: Lightbulb },
  { id: 'project-collab', label: 'Project Collab', desc: 'Find teammates', icon: Users },
  { id: 'achievement',  label: 'Achievement',      desc: 'Share a win', icon: Trophy },
];

const POST_TYPE_COLORS = {
  announcement:   { bg: 'rgba(168, 85, 247, 0.12)',  color: '#c084fc' },
  doubt:          { bg: 'rgba(239, 68, 68, 0.12)',   color: '#f87171' },
  'project-collab': { bg: 'rgba(34, 197, 94, 0.12)',   color: '#4ade80' },
  achievement:    { bg: 'rgba(234, 179, 8, 0.12)',    color: '#facc15' },
  'resource-discussion': { bg: 'rgba(59, 130, 246, 0.12)', color: '#60a5fa' },
  poll:           { bg: 'rgba(168, 85, 247, 0.12)',  color: '#c084fc' }
};

const DiscussionsWorkspace = () => {
  const [activeTab, setActiveTab] = useState('feed');
  const [activeFilter, setActiveFilter] = useState('all');
  const [composerMode, setComposerMode] = useState(''); // 'post' or ''
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState({ type: 'announcement', title: '', content: '', tags: '', resourceIds: '', pollOptions: '', requiredSkills: '', slotsNeeded: '3', isAnonymous: false });
  const [liveRoomName, setLiveRoomName] = useState(null);
  const [dmTarget, setDmTarget] = useState(null);
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [openedProfileId, setOpenedProfileId] = useState(null);
  const [expandedPosts, setExpandedPosts] = useState({}); // { postId: boolean }
  const [commentDrafts, setCommentDrafts] = useState({}); // { postId: string }

  const myId = (() => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload?.user?.id || null;
    } catch { return null; }
  })();

  const loadWorkspace = useCallback(async () => {
    const res = await api.get('/community/workspace');
    return res.data;
  }, []);

  const { data, loading, error, reload } = useApiResource(loadWorkspace, [loadWorkspace]);

  useRealtimeRefresh({
    channels: ['community', 'dashboard', 'notifications'],
    onRefresh: () => {
      // Intentionally bypassed: Unbounded live-polling of 10+ collections every 5 seconds 
      // heavily throttles React and the DB.
      // Posts and interactions update manually on operation via reload().
    },
    enabled: Boolean(localStorage.getItem('token')),
  });

  useEffect(() => {
    if (searchParams.get('action') === 'ask') {
      setComposerMode('post');
      setDraft(d => ({ ...d, type: 'doubt', resourceIds: searchParams.get('resourceId') || '' }));
    }
  }, [searchParams]);

  useEffect(() => {
    const path = location.pathname.split('/').pop();
    if (path === 'network') setActiveTab('network');
    else if (path === 'team-finder') setActiveTab('teams');
    else if (path === 'saved-threads') setActiveTab('saved');
    else if (path === 'resource-discussions') setActiveTab('resources');
    else setActiveTab('feed');
  }, [location.pathname]);

  const requests = data?.incomingConnectionRequests || [];

  const posts = useMemo(() => {
    const base = data?.posts || [];
    let filtered = base;
    if (activeFilter !== 'all') {
       filtered = base.filter(p => p.type === activeFilter);
    }
    const q = search.trim().toLowerCase();
    return !q ? filtered : filtered.filter(p => 
      `${p.title} ${p.content}`.toLowerCase().includes(q)
    );
  }, [data, search, activeFilter]);

  const submitPost = async () => {
    try {
      await api.post('/community/posts', draft);
      setComposerMode('');
      setDraft({ type: 'doubt', title: '', content: '', tags: '', resourceIds: '', pollOptions: '', requiredSkills: '', slotsNeeded: '3', isAnonymous: false });
      reload();
    } catch (err) {
      alert('Failed to post');
    }
  };

  const handleSolveDoubt = async (postId, commentId) => {
    try {
      await api.post(`/community/posts/${postId}/comments/${commentId}/solve`);
      reload();
    } catch (err) {
      alert('Failed to mark as solved');
    }
  };

  const goLiveOnDoubt = async (postId) => {
    try {
      const res = await api.post(`/community/posts/${postId}/go-live`);
      setLiveRoomName(res.data.roomName);
    } catch (err) {
      alert('Failed to start live session');
    }
  };

  const submitComment = async (postId) => {
    const content = commentDrafts[postId];
    if (!content?.trim()) return;
    try {
      await api.post(`/community/posts/${postId}/comments`, { content });
      setCommentDrafts(prev => ({ ...prev, [postId]: '' }));
      reload();
    } catch (err) {
      alert('Failed to add comment');
    }
  };

  const handleReact = async (postId) => {
    try {
      await api.post(`/community/posts/${postId}/react`, { reactionType: 'upvote' });
      reload();
    } catch (err) {
      console.error('Failed to react:', err);
    }
  };

  const respondToRequest = async (connectionId, action) => {
    try {
      await api.post(`/community/connections/${connectionId}/respond`, { action });
      reload();
    } catch (err) {
      alert('Failed to respond to request');
    }
  };

  if (loading || error || !data) {
    return (
      <div className="premium-grid-base">
        <div style={{ gridColumn: 'span 12' }}>
          <DataStatePanel loading={loading} error={error} onRetry={reload} loadingLabel="Entering campus square..." />
        </div>
      </div>
    );
  }

  const getInitials = (name = '') =>
    name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="community-workspace premium-grid-base cm-container">
      
      {/* User Profile Drawer */}
      <UserProfileDrawer 
        userId={openedProfileId} 
        isOpen={!!openedProfileId} 
        onClose={() => setOpenedProfileId(null)}
        onStartDM={(user) => setDmTarget(user)}
      />

      {/* Main Feed */}
      <main className="community-main cm-main" style={{ gridColumn: 'span 12' }}>
        
        {activeTab === 'feed' && (
          <div className="cm-feed-layout">
            <div className="flex-column gap-20">
              {/* Composer */}
              <section className="premium-card cm-composer-banner">
                <div>
                  <h3 className="premium-text-h3" style={{ margin: 0 }}>Got a doubt or achievement?</h3>
                  <p className="premium-text-meta" style={{ margin: 0 }}>Share it with the campus ecosystem.</p>
                </div>
                <button className="premium-button" onClick={() => setComposerMode('post')}>
                  <Plus size={18} /> New Post
                </button>
              </section>

              {/* Filters */}
              <div className="cm-filter-scroll">
                <button
                  className="premium-chip"
                  style={{ cursor: 'pointer', border: '1px solid', borderColor: activeFilter === 'all' ? 'var(--accent)' : 'transparent', background: activeFilter === 'all' ? 'rgba(46,230,166,0.1)' : 'rgba(255,255,255,0.05)', color: activeFilter === 'all' ? 'var(--accent)' : 'var(--text)', transition: 'all 0.2s', display: 'flex', alignItems: 'center' }}
                  onClick={() => setActiveFilter('all')}
                >
                  <Sparkles size={14} style={{ marginRight: '6px' }} /> All
                </button>
                {POST_TYPES.map(t => (
                  <button
                    key={t.id}
                    className="premium-chip"
                    style={{ cursor: 'pointer', border: '1px solid', borderColor: activeFilter === t.id ? 'var(--accent)' : 'transparent', background: activeFilter === t.id ? 'rgba(46,230,166,0.1)' : 'rgba(255,255,255,0.05)', color: activeFilter === t.id ? 'var(--accent)' : 'var(--text)', transition: 'all 0.2s', display: 'flex', alignItems: 'center' }}
                    onClick={() => setActiveFilter(t.id)}
                  >
                    <t.icon size={14} style={{ marginRight: '6px' }} /> {t.label}
                  </button>
                ))}
              </div>

              {/* Feed List */}
              <div className="flex-column gap-16">
                {posts.map(post => {
                  const isExpanded = expandedPosts[post.id];
                  const typeCfg = POST_TYPE_COLORS[post.type] || POST_TYPE_COLORS.doubt;
                  return (
                    <div key={post.id} className="flex-column gap-1">
                      <article 
                        className={`premium-card community-post-card ${isExpanded ? 'active' : ''}`}
                        onClick={() => setSelectedPostId(post.id)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span className="premium-chip" style={{ background: typeCfg.bg, color: typeCfg.color, display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {(() => {
                                const found = POST_TYPES.find(t => t.id === post.type);
                                if (found) {
                                  const IconComponent = found.icon;
                                  return <><IconComponent size={14} /> {found.label}</>;
                                }
                                return <>{post.type}</>;
                              })()}
                            </span>
                            <div 
                              style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
                              onClick={(e) => { e.stopPropagation(); setOpenedProfileId(post.author.id); }}
                            >
                              <div style={{ width: 24, height: 24, borderRadius: '6px', background: 'var(--accent-gradient)', display: 'grid', placeItems: 'center', fontSize: '10px', fontWeight: 800 }}>
                                {post.author?.avatar ? <img src={post.author.avatar} alt="" /> : getInitials(post.author?.name)}
                              </div>
                              <span className="premium-text-meta" style={{ fontWeight: 600 }}>{post.author?.name}</span>
                            </div>
                            {post.author.id !== myId && (() => {
                               const profile = data?.profiles?.find(p => p.id === post.author.id);
                               const rel = profile ? profile.relationship : 'none';
                               if (rel === 'none' || rel === undefined) {
                                 return (
                                   <button 
                                     className="community-action-btn" 
                                     style={{ color: 'var(--accent)', padding: '2px 8px', border: '1px solid rgba(46,230,166,0.3)', borderRadius: '12px', fontSize: '11px', fontWeight: 700, display: 'flex', gap: '4px', alignItems: 'center' }}
                                     onClick={async (e) => {
                                       e.stopPropagation();
                                       try {
                                         await api.post(`/community/connections/${post.author.id}/connect`);
                                         reload();
                                       } catch (err) {
                                         console.error(err);
                                       }
                                     }}
                                   >
                                     <UserPlus size={12}/> Growth Link
                                   </button>
                                 );
                               }
                               return null;
                            })()}
                            {post.isLive && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--accent)' }}>
                                <div className="community-live-dot" />
                                <span className="premium-text-meta" style={{ fontWeight: 700 }}>LIVE NOW</span>
                              </div>
                            )}
                          </div>
                          <span className="premium-text-meta" style={{ color: 'var(--muted)' }}>
                            {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'Just now'}
                          </span>
                        </div>
                        
                        <h3 className="premium-text-h3" style={{ fontSize: '18px', marginBottom: '8px' }}>{post.title}</h3>
                        <p className="premium-text-body subdued" style={{ fontSize: '14px', marginBottom: '16px' }}>
                          {post.content}
                        </p>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', gap: '16px', color: 'var(--muted)' }}>
                            <button className="community-action-btn" onClick={(e) => { e.stopPropagation(); handleReact(post.id); }}><ThumbsUp size={14} /> {post.reactionCounts?.upvote || 0}</button>
                            <button 
                              className={`community-action-btn ${isExpanded ? 'active' : ''}`}
                              onClick={(e) => { e.stopPropagation(); setExpandedPosts(prev => ({ ...prev, [post.id]: !prev[post.id] })); }}
                            >
                              <MessageCircle size={14} /> {post.commentCount} Comments
                            </button>
                          </div>
                          {post.solved && <span className="premium-status-badge solved"><CheckCheck size={14} /> Solved</span>}
                        </div>
                      </article>

                      {/* Inline Comment Section */}
                      {isExpanded && (
                        <div className="community-comment-section premium-card">
                          <div className="comment-list">
                            {(post.comments || []).map(comment => (
                              <div key={comment.id} className={`comment-item ${comment.isBestAnswer ? 'best-answer' : ''}`}>
                                <div className="comment-header">
                                  <div className="comment-author" onClick={() => setOpenedProfileId(comment.author.id)}>
                                    <div className="comment-mini-avatar">{getInitials(comment.author.name)}</div>
                                    <span className="comment-author-name">{comment.author.name}</span>
                                  </div>
                                  <span className="comment-time">{new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <div className="comment-body">
                                  {comment.content}
                                  {comment.isBestAnswer && <span className="best-answer-label">✓ Accepted Solution</span>}
                                </div>
                                {post.type === 'doubt' && !post.solved && post.author.id === myId && (
                                   <button className="solve-btn" onClick={() => handleSolveDoubt(post.id, comment.id)}>
                                     Mark as Solved ✓
                                   </button>
                                )}
                              </div>
                            ))}
                          </div>

                          <div className="comment-composer">
                            <input 
                              placeholder="Write a helpful comment..." 
                              value={commentDrafts[post.id] || ''} 
                              onChange={e => setCommentDrafts(prev => ({ ...prev, [post.id]: e.target.value }))}
                              onKeyDown={e => e.key === 'Enter' && submitComment(post.id)}
                            />
                            <button onClick={() => submitComment(post.id)}><Send size={16} /></button>
                          </div>

                          {post.type === 'doubt' && post.solved && (
                            <div className="solved-live-banner">
                              <span>Resolution found! Still need clarity? Transmute into live room.</span>
                              <button onClick={() => goLiveOnDoubt(post.id)}>🔴 Go Live on this Doubt</button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Right Panel */}
            <aside className="flex-column gap-24 cm-sidebar">
              <div className="community-search-box premium-card">
                <Search size={16} />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search discussions..." style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text)', outline: 'none' }} />
              </div>

              <section className="premium-card" style={{ padding: '24px', background: 'var(--accent-gradient)', borderColor: 'transparent' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#000', marginBottom: '12px' }}>
                  <h4 style={{ margin: 0, fontSize: '13px', fontWeight: 800 }}>YOUR COLLAB SCORE</h4>
                  <TrendingUp size={16} color="#000" />
                </div>
                <div style={{ fontSize: '32px', fontWeight: 800, color: '#000' }}>{data.activeUser?.collabScore || 240}</div>
                <p style={{ fontSize: '12px', color: 'rgba(0,0,0,0.7)', margin: '4px 0 0', fontWeight: 600 }}>Top 12% in campus</p>
              </section>

              <section className="premium-card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <span className="premium-text-meta" style={{ letterSpacing: '0.1em' }}>TOP CONTRIBUTORS</span>
                  <Zap size={14} fill="var(--accent)" color="var(--accent)" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {(data.profiles || []).slice(0, 3).map((user, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setOpenedProfileId(user.id)}>
                      <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'var(--accent-gradient)', display: 'grid', placeItems: 'center', fontSize: '14px', fontWeight: 800, color: '#000' }}>
                        {user.name?.[0] || 'U'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '14px', fontWeight: 700 }}>{user.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--muted)' }}>{user.collabScore || 0} pts</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        )}

        {activeTab === 'network' && (
          <div className="flex-column gap-24">
            {requests.length > 0 && (
              <section className="premium-card" style={{ padding: '24px' }}>
                <h3 className="premium-text-meta" style={{ marginBottom: '16px' }}>PENDING REQUESTS</h3>
                <div className="flex-column gap-12">
                  {requests.map(req => (
                    <div key={req.id} className="request-card">
                      <div className="flex-row items-center gap-12">
                        <div className="mini-avatar">{getInitials(req.requesterName)}</div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{req.requesterName}</div>
                          <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Peer Request</div>
                        </div>
                      </div>
                      <div className="flex-row gap-8">
                        <button className="premium-button" style={{ padding: '6px 16px', fontSize: '12px' }} onClick={() => respondToRequest(req.id, 'accept')}>Accept</button>
                        <button className="premium-button-secondary" style={{ padding: '6px 16px', fontSize: '12px' }} onClick={() => respondToRequest(req.id, 'decline')}>Decline</button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <div className="premium-card" style={{ padding: '32px' }}>
              <h2 className="premium-text-h2">Find Peer Mentors</h2>
              <div className="cm-network-grid">
                {(data.profiles || []).map(profile => (
                  <article key={profile.id} className="premium-card cm-peer-card" onClick={() => setOpenedProfileId(profile.id)}>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                       <div className="peer-avatar">{getInitials(profile.name)}</div>
                       <div>
                         <div style={{ fontWeight: 700 }}>{profile.name}</div>
                         <p className="premium-text-meta subdued">{profile.branch} · {profile.year} Year</p>
                       </div>
                    </div>
                    <div className="profile-skills-tags">
                      {(profile.skills || []).slice(0, 3).map(s => <span key={s} className="skill-tag">{s}</span>)}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Overlays */}
      {dmTarget && (
        <DMPanel 
          targetUser={dmTarget} 
          onClose={() => setDmTarget(null)} 
        />
      )}

      {liveRoomName && (
        <div className="community-modal-backdrop">
          <div className="premium-card" style={{ width: 'min(1100px, 95%)', height: '90vh', padding: '24px', position: 'relative' }}>
             <button className="premium-button-secondary" style={{ position: 'absolute', top: 16, right: 16 }} onClick={() => setLiveRoomName(null)}>Close</button>
             <div style={{ flex: 1, background: '#000', borderRadius: '16px', overflow: 'hidden', height: '100%' }}>
                <JitsiMeeting
                   roomName={liveRoomName}
                   getIFrameRef={(node) => { if (node) node.style.height = '100%'; }}
                />
             </div>
          </div>
        </div>
      )}

      {composerMode === 'post' && (
        <div className="community-modal-backdrop" onClick={() => setComposerMode('')}>
           <div className="premium-card community-modal" onClick={e => e.stopPropagation()}>
              <h2 className="premium-text-h2">Create a Post</h2>
              <div className="composer-grid">
                <div className="post-type-selector">
                  {POST_TYPES.map(t => (
                    <button key={t.id} className={draft.type === t.id ? 'active' : ''} onClick={() => setDraft({...draft, type: t.id})} style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                      <t.icon size={16} /> {t.label}
                    </button>
                  ))}
                </div>
                <input className="premium-select" placeholder="A descriptive title..." value={draft.title} onChange={e => setDraft({...draft, title: e.target.value})} />
                <textarea className="premium-select" style={{ minHeight: '120px', resize: 'vertical' }} placeholder="Tell us more..." value={draft.content} onChange={e => setDraft({...draft, content: e.target.value})} />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
                  <button className="premium-button-secondary" onClick={() => setComposerMode('')}>Cancel</button>
                  <button className="premium-button" onClick={submitPost}>Share with Campus</button>
                </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default DiscussionsWorkspace;

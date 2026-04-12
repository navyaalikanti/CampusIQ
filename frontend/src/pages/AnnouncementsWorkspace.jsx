import { useCallback, useState } from 'react';
import { 
  Megaphone, 
  Pin, 
  Calendar, 
  Info, 
  Tag as TagIcon, 
  MoreVertical, 
  Plus, 
  X,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Heart
} from 'lucide-react';
import api from '../lib/api';
import useApiResource from '../hooks/useApiResource';
import useRealtimeRefresh from '../hooks/useRealtimeRefresh';
import DataStatePanel from '../components/DataStatePanel';

const CATEGORIES = [
  { id: 'exam', label: 'Exam Schedule', color: '#f87171' },
  { id: 'result', label: 'Result', color: '#60a5fa' },
  { id: 'event', label: 'Event', color: 'var(--accent)' },
  { id: 'placement', label: 'Placement', color: '#fbbf24' },
  { id: 'general', label: 'General', color: 'var(--muted)' },
];

const AnnouncementsWorkspace = () => {
  const [showComposer, setShowComposer] = useState(false);
  const [draft, setDraft] = useState({ title: '', content: '', category: 'general', isPinned: false });
  const [userRole, setUserRole] = useState(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.role || 'student';
  });

  const loadAnnouncements = useCallback(async () => {
    const res = await api.get('/announcements');
    return res.data;
  }, []);

  const { data, loading, error, reload } = useApiResource(loadAnnouncements, [loadAnnouncements]);

  useRealtimeRefresh({
    channels: ['notifications', 'dashboard'],
    onRefresh: reload,
    enabled: Boolean(localStorage.getItem('token')),
  });

  const submitAnnouncement = async () => {
    try {
      await api.post('/announcements', draft);
      setShowComposer(false);
      setDraft({ title: '', content: '', category: 'general', isPinned: false });
      reload();
    } catch (err) {
      alert('Failed to post announcement');
    }
  };

  const sortedAnnouncements = data ? [...data].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  }) : [];

  const isAdmin = userRole === 'admin' || userRole === 'faculty';

  if (loading || error) {
    return (
      <div className="premium-grid-base">
        <div style={{ gridColumn: 'span 12' }}>
          <DataStatePanel loading={loading} error={error} onRetry={reload} loadingLabel="Fetching latest announcements..." />
        </div>
      </div>
    );
  }

  return (
    <div className="premium-grid-base an-container">
      <header className="an-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)', marginBottom: '8px' }}>
            <Megaphone size={16} />
            <span className="premium-text-meta" style={{ letterSpacing: '0.1em' }}>Official Updates</span>
          </div>
          <h1 className="premium-text-hero">Announcements</h1>
          <p className="premium-text-body subdued">Stay updated with the latest news from faculty and administration.</p>
        </div>
        {isAdmin && (
          <button className="premium-button" onClick={() => setShowComposer(true)}>
            <Plus size={18} /> Post Announcement
          </button>
        )}
      </header>

      <div className="flex-column gap-20 an-content-stack">
        {sortedAnnouncements.length ? sortedAnnouncements.map((ann) => {
          const category = CATEGORIES.find(c => c.id === ann.category) || CATEGORIES[4];
          return (
            <article key={ann.id} className="premium-card an-card" style={{ 
              borderLeft: ann.isPinned ? `4px solid var(--accent)` : `4px solid ${category.color}`,
              padding: '24px',
              position: 'relative'
            }}>
              <div className="flex-row an-card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span className="premium-chip" style={{ background: `${category.color}20`, color: category.color }}>
                    {category.label}
                  </span>
                  {ann.isPinned && (
                    <span className="premium-text-meta" style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--accent)' }}>
                      <Pin size={12} fill="var(--accent)" /> Pinned
                    </span>
                  )}
                </div>
                <span className="premium-text-meta" style={{ color: 'var(--muted)' }}>
                  {new Date(ann.createdAt).toLocaleDateString([], { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>

              <h2 className="premium-text-h2" style={{ margin: '0 0 12px', fontSize: '20px' }}>{ann.title}</h2>
              <p className="premium-text-body" style={{ color: 'var(--muted)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {ann.content}
              </p>

              <div className="flex-row an-card-footer">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '8px', background: 'var(--accent-gradient)', display: 'grid', placeItems: 'center', fontSize: '12px', fontWeight: 700 }}>
                    {ann.author?.name?.[0] || 'A'}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{ann.author?.name || 'Administrator'}</div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Faculty / Admin</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button className="premium-button-secondary" style={{ padding: '6px 12px', fontSize: '12px' }}>
                    <Heart size={14} /> {Object.keys(ann.reactions || {}).length || 0}
                  </button>
                </div>
              </div>
            </article>
          )
        }) : (
          <div className="premium-card" style={{ padding: '64px', textAlign: 'center', background: 'rgba(255,255,255,0.02)' }}>
            <Megaphone size={48} style={{ color: 'var(--muted)', marginBottom: '16px' }} />
            <h3 className="premium-text-h3">No announcements yet</h3>
            <p className="premium-text-meta">You're all caught up with campus updates.</p>
          </div>
        )}
      </div>

      {showComposer && (
        <div className="community-modal-backdrop" onClick={() => setShowComposer(false)}>
          <div className="premium-card community-modal" style={{ padding: '32px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2 className="premium-text-h2">Post Announcement</h2>
              <button className="premium-button-secondary" onClick={() => setShowComposer(false)} style={{ padding: '8px' }}>
                <X size={20} />
              </button>
            </div>

            <div className="community-form-grid">
              <div style={{ marginBottom: '12px' }}>
                <label className="premium-text-meta" style={{ display: 'block', marginBottom: '8px' }}>Title</label>
                <input 
                  value={draft.title} 
                  onChange={e => setDraft({...draft, title: e.target.value})} 
                  placeholder="e.g., End Semester Examination Schedule - Spring 2026"
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label className="premium-text-meta" style={{ display: 'block', marginBottom: '8px' }}>Category</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {CATEGORIES.map(cat => (
                    <button 
                      key={cat.id}
                      onClick={() => setDraft({...draft, category: cat.id})}
                      style={{
                        padding: '8px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)',
                        background: draft.category === cat.id ? `${cat.color}20` : 'transparent',
                        color: draft.category === cat.id ? cat.color : 'var(--muted)',
                        fontSize: '13px', cursor: 'pointer'
                      }}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label className="premium-text-meta" style={{ display: 'block', marginBottom: '8px' }}>Content</label>
                <textarea 
                  value={draft.content} 
                  onChange={e => setDraft({...draft, content: e.target.value})} 
                  placeholder="Detailed announcement content..."
                  style={{ minHeight: '160px' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px' }}>
                <input 
                  type="checkbox" 
                  checked={draft.isPinned} 
                  onChange={e => setDraft({...draft, isPinned: e.target.checked})}
                  id="pin-it"
                  style={{ width: 'auto' }}
                />
                <label htmlFor="pin-it" className="premium-text-body" style={{ fontSize: '14px' }}>Pin this announcement to top</label>
              </div>
            </div>

            <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="premium-button" onClick={submitAnnouncement} style={{ padding: '12px 32px' }}>
                Publish Announcement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnouncementsWorkspace;

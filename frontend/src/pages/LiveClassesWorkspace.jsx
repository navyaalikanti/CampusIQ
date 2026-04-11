import { useCallback, useState, useMemo } from 'react';
import { 
  Video, 
  Calendar, 
  Users, 
  Clock, 
  Plus, 
  X, 
  Monitor, 
  BookOpen, 
  RefreshCw,
  Clock3,
  MonitorStop,
  Sparkles
} from 'lucide-react';
import { JitsiMeeting } from '@jitsi/react-sdk';
import api from '../lib/api';
import useApiResource from '../hooks/useApiResource';
import useRealtimeRefresh from '../hooks/useRealtimeRefresh';
import DataStatePanel from '../components/DataStatePanel';

const LiveClassesWorkspace = () => {
  const [showScheduler, setShowScheduler] = useState(false);
  const [activeRoom, setActiveRoom] = useState(null);
  const [draft, setDraft] = useState({ 
    title: '', topic: '', startsAt: '', branch: '', year: '', subjectTag: '', maxParticipants: '50' 
  });

  const loadClasses = useCallback(async () => {
    const res = await api.get('/live-classes');
    return res.data;
  }, []);

  const { data, loading, error, reload } = useApiResource(loadClasses, [loadClasses]);

  useRealtimeRefresh({
    channels: ['live-classes', 'dashboard', 'notifications'],
    onRefresh: reload,
    enabled: Boolean(localStorage.getItem('token')),
  });

  const jitsiConfig = useMemo(() => ({ startWithAudioMuted: false }), []);
  const handleIFrameRef = useCallback((node) => { 
    if (node) {
      node.style.height = '100%'; 
      node.className = 'sr-jitsi-frame';
      // Attempt to fix OAuth login popup blocks inside the generated iframe
      node.setAttribute('allow', 'camera; microphone; display-capture; autoplay; clipboard-write; cross-origin-isolated; allow-popups; allow-popups-to-escape-sandbox');
    }
  }, []);

  const scheduleClass = async () => {
    if (!draft.title || !draft.startsAt) {
      alert('Please provide a title and start time');
      return;
    }
    try {
      await api.post('/live-classes', draft);
      setShowScheduler(false);
      setDraft({ title: '', topic: '', startsAt: '', branch: '', year: '', subjectTag: '', maxParticipants: '50' });
      reload();
    } catch (err) {
      alert(`Failed to schedule class: ${err.response?.data?.message || err.message}`);
    }
  };

  const endClass = async (id) => {
    try {
      await api.post(`/live-classes/${id}/end`);
      setActiveRoom(null);
      reload();
    } catch (err) {
      alert('Failed to end class');
    }
  };

  const sessions = data ? [...data.liveNow, ...data.upcoming] : [];

  if (loading || error) {
    return (
      <div className="premium-grid-base">
        <div style={{ gridColumn: 'span 12' }}>
          <DataStatePanel loading={loading} error={error} onRetry={reload} loadingLabel="Tuning into live streams..." />
        </div>
      </div>
    );
  }

  return (
    <div className="premium-grid-base">
      <header style={{ gridColumn: 'span 12', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent)', marginBottom: '8px' }}>
            <Radio size={16} />
            <span className="premium-text-meta" style={{ letterSpacing: '0.1em' }}>LIVE ECOSYSTEM</span>
          </div>
          <h1 className="premium-text-hero">Live Classrooms</h1>
          <p className="premium-text-body subdued">Schedule and join real-time mentor sessions or persistent study groups.</p>
        </div>
        <button className="premium-button" onClick={() => setShowScheduler(true)}>
          <Plus size={18} /> Schedule Class
        </button>
      </header>

      {/* Happening Now Section */}
      {data?.liveNow?.length > 0 && (
        <section style={{ gridColumn: 'span 12', marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <div className="community-live-dot" />
            <h3 className="premium-text-h3" style={{ margin: 0, letterSpacing: '0.05em' }}>HAPPENING NOW</h3>
          </div>
          <div className="premium-grid-base" style={{ padding: 0 }}>
            {data.liveNow.map((session) => (
              <article key={session.id} className="premium-card" style={{ gridColumn: 'span 6', padding: '32px', display: 'flex', justifyContent: 'space-between', background: 'rgba(46,230,166,0.06)', borderColor: 'rgba(46,230,166,0.2)' }}>
                <div style={{ flex: 1 }}>
                  <span className="premium-chip" style={{ background: 'rgba(46,230,166,0.1)', color: 'var(--accent)', marginBottom: '16px' }}>{session.subjectTag || 'Live Session'}</span>
                  <h2 className="premium-text-h2" style={{ fontSize: '24px', marginBottom: '8px' }}>{session.title}</h2>
                  <p className="premium-text-body subdued" style={{ marginBottom: '24px' }}>{session.topic}</p>
                  <div style={{ display: 'flex', gap: '20px', color: 'var(--muted)', fontSize: '13px' }}>
                    <span className="flex-row items-center gap-8"><Users size={16} /> {session.participantCount || 0} attending</span>
                    <span className="flex-row items-center gap-8"><Clock size={16} /> Started {session.startedAt ? new Date(session.startedAt).toLocaleTimeString() : 'Now'}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <button className="premium-button" style={{ padding: '14px 28px' }} onClick={() => setActiveRoom(session)}>
                    Join Room
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Grid */}
      <h3 className="premium-text-meta" style={{ gridColumn: 'span 12', marginBottom: '16px', letterSpacing: '0.1em' }}>UPCOMING SESSIONS</h3>
      <div style={{ gridColumn: 'span 12', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '20px' }}>
        {data?.upcoming?.length ? data.upcoming.map((session) => (
          <article key={session.id} className="premium-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <span className="premium-text-meta" style={{ color: 'var(--accent)', fontWeight: 700 }}>{session.subjectTag || 'General'}</span>
               <Monitor size={18} style={{ color: 'var(--muted)' }} />
            </div>
            <div>
               <h3 className="premium-text-h3" style={{ margin: '0 0 8px', fontSize: '18px' }}>{session.title}</h3>
               <p className="premium-text-meta subdued">{session.topic}</p>
            </div>
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                  <div className="flex-row items-center gap-8"><Users size={14} /> {session.mentorName}</div>
                  <div className="flex-row items-center gap-8" style={{ color: 'var(--accent)' }}><Calendar size={14} /> {session.startsAt ? new Date(session.startsAt).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' }) : 'TBD'}</div>
               </div>
               <button className="premium-button-secondary" style={{ width: '100%', padding: '10px' }}>Set Reminder</button>
            </div>
          </article>
        )) : (
          <div style={{ gridColumn: 'span 12', padding: '40px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)', textAlign: 'center' }}>
             <Clock3 size={32} style={{ color: 'var(--muted)', marginBottom: '12px' }} />
             <p className="premium-text-meta">No classes scheduled for the next 24 hours.</p>
          </div>
        )}
      </div>

      {/* Jitsi Room Overlay */}
      {activeRoom && (
        <div className="community-modal-backdrop">
          <div className="premium-card" style={{ width: 'min(1100px, 95%)', height: '90vh', padding: '24px', position: 'relative' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                   <h2 className="premium-text-h2" style={{ margin: 0 }}>{activeRoom.title}</h2>
                   <p className="premium-text-meta" style={{ margin: 0 }}>Live with {activeRoom.mentorName}</p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                   <button className="premium-button-secondary" onClick={() => { setActiveRoom(null); reload(); }}>Leave Room</button>
                   <button className="premium-button" style={{ background: 'var(--danger-gradient)' }} onClick={() => endClass(activeRoom.id)}>End Stream</button>
                </div>
             </div>
             <div style={{ flex: 1, background: '#000', borderRadius: '16px', overflow: 'hidden', height: 'calc(100% - 70px)' }}>
                <JitsiMeeting
                   domain="meet.jit.si"
                   roomName={`campusiq-room-${activeRoom.id}`}
                   configOverwrite={jitsiConfig}
                   getIFrameRef={handleIFrameRef}
                />
             </div>
          </div>
        </div>
      )}

      {/* Scheduler Modal */}
      {showScheduler && (
        <div className="community-modal-backdrop" onClick={() => setShowScheduler(false)}>
          <div className="premium-card community-modal" style={{ padding: '32px' }} onClick={e => e.stopPropagation()}>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
                <h2 className="premium-text-h2">Schedule a Class</h2>
                <button className="premium-button-secondary" onClick={() => setShowScheduler(false)} style={{ padding: '8px' }}><X size={20} /></button>
             </div>
             <div className="community-form-grid">
                <input value={draft.title} onChange={e => setDraft({...draft, title: e.target.value})} placeholder="Title (e.g. Intro to ML in Python)" />
                <textarea value={draft.topic} onChange={e => setDraft({...draft, topic: e.target.value})} placeholder="Describe what will be covered..." />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                   <input type="datetime-local" value={draft.startsAt} onChange={e => setDraft({...draft, startsAt: e.target.value})} />
                   <input value={draft.subjectTag} onChange={e => setDraft({...draft, subjectTag: e.target.value})} placeholder="Subject (e.g. ML, DSA)" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                   <input value={draft.branch} onChange={e => setDraft({...draft, branch: e.target.value})} placeholder="Branch" />
                   <input value={draft.year} onChange={e => setDraft({...draft, year: e.target.value})} placeholder="Year" />
                   <input value={draft.maxParticipants} onChange={e => setDraft({...draft, maxParticipants: e.target.value})} placeholder="Max Students" type="number" />
                </div>
             </div>
             <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="premium-button" onClick={scheduleClass} style={{ padding: '12px 32px' }}>Schedule Class</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Internal components
const Radio = ({ size, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={style}>
    <path d="M4.9 19.1C1 15.2 1 8.8 4.9 4.9"/><path d="M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.4"/><circle cx="12" cy="12" r="2"/><path d="M16.2 7.8c2.3 2.3 2.3 6.1 0 8.4"/><path d="M19.1 4.9C23 8.8 23 15.2 19.1 19.1"/>
  </svg>
);

export default LiveClassesWorkspace;

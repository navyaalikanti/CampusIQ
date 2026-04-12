import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Hash, Users, Plus, X, Zap, BookOpen, TrendingUp, ChevronRight,
  MessageSquare
} from 'lucide-react';
import api from '../lib/api';
import useApiResource from '../hooks/useApiResource';
import useRealtimeRefresh from '../hooks/useRealtimeRefresh';
import DataStatePanel from '../components/DataStatePanel';
import './StudyRooms.css';

const SUBJECTS = [
  'Data Structures & Algorithms', 'Database Management Systems', 'Operating Systems',
  'Computer Networks', 'Software Engineering', 'Machine Learning', 'Web Development',
  'Mathematics', 'Physics', 'Chemistry', 'Electronics', 'Compiler Design', 'General'
];

const StudyRoomsPage = () => {
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [draft, setDraft] = useState({ title: '', description: '', subjectTag: '', branch: '', year: '' });
  const [creating, setCreating] = useState(false);

  const loadRooms = useCallback(async () => {
    const res = await api.get('/study-rooms');
    return res.data;
  }, []);

  const { data, loading, error, reload } = useApiResource(loadRooms, [loadRooms]);

  useRealtimeRefresh({
    channels: ['study-rooms'],
    onRefresh: reload,
    enabled: Boolean(localStorage.getItem('token')),
  });

  const createRoom = async () => {
    if (!draft.title.trim()) return alert('Room name is required');
    try {
      setCreating(true);
      const res = await api.post('/study-rooms', draft);
      setShowCreate(false);
      setDraft({ title: '', description: '', subjectTag: '', branch: '', year: '' });
      reload();
      navigate(`/study-rooms/${res.data.id}`);
    } catch (err) {
      alert(`Failed to create room: ${err.response?.data?.message || err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const getSubjectEmoji = (tag) => {
    const map = { 'Machine Learning': '🤖', 'Web Development': '🌐', 'Database Management Systems': '🗄️',
      'Data Structures & Algorithms': '🧩', 'Operating Systems': '⚙️', 'Computer Networks': '🌍',
      'Mathematics': '📐', 'Physics': '⚛️', 'Chemistry': '🧪', 'Electronics': '🔌',
      'Software Engineering': '🏗️', 'Compiler Design': '🔧' };
    return map[tag] || '📚';
  };

  const formatLastMsg = (msg) => {
    if (!msg) return 'No messages yet';
    return `${msg.author}: ${msg.text}`;
  };

  if (loading || error) {
    return (
      <div className="premium-grid-base">
        <div style={{ gridColumn: 'span 12' }}>
          <DataStatePanel loading={loading} error={error} onRetry={reload} loadingLabel="Warming up study rooms..." />
        </div>
      </div>
    );
  }

  const popular = data?.popular || [];
  const myRooms = data?.myRooms || [];
  const allRooms = data?.rooms || [];
  const discover = allRooms.filter(r => !myRooms.find(m => m.id === r.id));

  return (
    <div className="sr-list-page">
      {/* Header */}
      <div className="sr-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', color: 'var(--accent)' }}>
            <Hash size={16} />
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em' }}>STUDY ROOMS</span>
          </div>
          <h1 className="premium-text-hero" style={{ fontSize: '36px', marginBottom: '8px' }}>Campus Study Channels</h1>
          <p className="premium-text-body subdued">Persistent subject rooms — ask, share, solve. Together.</p>
        </div>
        <button className="premium-button" onClick={() => setShowCreate(true)}>
          <Plus size={18} /> Create Room
        </button>
      </div>

      {/* Popular Rooms */}
      {popular.length > 0 && (
        <section className="sr-rooms-section">
          <div className="sr-section-label">
            <TrendingUp size={13} /> Trending Rooms
          </div>
          <div className="sr-grid">
            {popular.map(room => (
              <RoomCard key={room.id} room={room} emoji={getSubjectEmoji(room.subjectTag)} formatLastMsg={formatLastMsg} onClick={() => navigate(`/study-rooms/${room.id}`)} />
            ))}
          </div>
        </section>
      )}

      {/* Your Rooms */}
      {myRooms.length > 0 && (
        <section className="sr-rooms-section">
          <div className="sr-section-label">
            <Zap size={13} /> Your Rooms
          </div>
          <div className="sr-grid">
            {myRooms.map(room => (
              <RoomCard key={room.id} room={room} emoji={getSubjectEmoji(room.subjectTag)} formatLastMsg={formatLastMsg} onClick={() => navigate(`/study-rooms/${room.id}`)} highlight />
            ))}
          </div>
        </section>
      )}

      {/* Discover */}
      {discover.length > 0 && (
        <section className="sr-rooms-section">
          <div className="sr-section-label">
            <BookOpen size={13} /> Discover Rooms
          </div>
          <div className="sr-grid">
            {discover.map(room => (
              <RoomCard key={room.id} room={room} emoji={getSubjectEmoji(room.subjectTag)} formatLastMsg={formatLastMsg} onClick={() => navigate(`/study-rooms/${room.id}`)} />
            ))}
          </div>
        </section>
      )}

      {allRooms.length === 0 && (
        <div style={{ textAlign: 'center', padding: '80px 20px' }}>
          <Hash size={56} style={{ color: 'rgba(255,255,255,0.06)', marginBottom: '16px' }} />
          <h3 className="premium-text-h3" style={{ opacity: 0.4 }}>No rooms yet</h3>
          <p className="premium-text-meta subdued">Create the first study room for your subject!</p>
        </div>
      )}

      {/* Create Room Modal */}
      {showCreate && (
        <div className="community-modal-backdrop" onClick={() => setShowCreate(false)}>
          <div className="premium-card community-modal" style={{ padding: '32px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
              <h2 className="premium-text-h2">Create Study Room</h2>
              <button className="premium-button-secondary" style={{ padding: '8px' }} onClick={() => setShowCreate(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="sr-form-group">
              <label>Room Name *</label>
              <input placeholder="e.g. DBMS Exam Prep Squad" value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} />
            </div>

            <div className="sr-form-group">
              <label>Description</label>
              <textarea rows={2} placeholder="What will this room focus on?" value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="sr-form-group">
                <label>Subject Tag</label>
                <select value={draft.subjectTag} onChange={e => setDraft({ ...draft, subjectTag: e.target.value })}>
                  <option value="">Select Subject</option>
                  {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="sr-form-group">
                <label>Branch</label>
                <input placeholder="e.g. CSE, ECE, MECH" value={draft.branch} onChange={e => setDraft({ ...draft, branch: e.target.value })} />
              </div>
            </div>

            <div className="sr-form-group">
              <label>Year</label>
              <select value={draft.year} onChange={e => setDraft({ ...draft, year: e.target.value })}>
                <option value="">All Years</option>
                <option value="1">1st Year</option>
                <option value="2">2nd Year</option>
                <option value="3">3rd Year</option>
                <option value="4">4th Year</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button className="premium-button-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="premium-button" onClick={createRoom} disabled={creating} style={{ minWidth: '140px' }}>
                {creating ? 'Creating...' : '🚀 Launch Room'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const RoomCard = ({ room, emoji, formatLastMsg, onClick, highlight }) => (
  <article className="sr-room-card" onClick={onClick} style={highlight ? { borderColor: 'rgba(46,230,166,0.15)' } : {}}>
    <div className="sr-room-icon">{emoji}</div>
    <h3 className="sr-room-title">{room.title}</h3>
    {room.subjectTag && <div style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 700, marginBottom: '6px' }}>#{room.subjectTag}</div>}
    <p className="sr-room-desc">{room.description || 'A study room for focused learning.'}</p>
    <div className="sr-room-meta">
      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <Users size={12} /> {room.memberCount} members
      </span>
      {room.onlineCount > 0 && (
        <span className="sr-online-badge">
          <span className="sr-online-dot" /> {room.onlineCount} online
        </span>
      )}
      {room.pinnedResources?.length > 0 && (
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <BookOpen size={12} /> {room.pinnedResources.length} resources
        </span>
      )}
    </div>
    <div className="sr-last-msg">{formatLastMsg(room.lastMessage)}</div>
  </article>
);

export default StudyRoomsPage;

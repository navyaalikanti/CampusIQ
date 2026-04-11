import { useCallback, useEffect, useRef, useState } from 'react';
import { 
  Hash, 
  Users, 
  MessageSquare, 
  Plus, 
  X, 
  Send, 
  Video, 
  Pin, 
  Search,
  BookOpen,
  ArrowLeft,
  ChevronRight,
  MoreVertical,
  Paperclip
} from 'lucide-react';
import { JitsiMeeting } from '@jitsi/react-sdk';
import api from '../lib/api';
import useApiResource from '../hooks/useApiResource';
import useRealtimeRefresh from '../hooks/useRealtimeRefresh';
import DataStatePanel from '../components/DataStatePanel';

const StudyRoomsWorkspace = () => {
  const [activeRoomId, setActiveRoomId] = useState(null);
  const [showCreator, setShowCreator] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [newRoom, setNewRoom] = useState({ title: '', topic: '', branch: '' });
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const chatEndRef = useRef(null);

  const loadRooms = useCallback(async () => {
    const res = await api.get('/api/study-rooms');
    return res.data;
  }, []);

  const { data: rooms, loading, error, reload } = useApiResource(loadRooms, [loadRooms]);

  const activeRoom = (rooms || []).find(r => r.id === activeRoomId);

  useEffect(() => {
    if (activeRoomId) {
      const fetchMessages = async () => {
        try {
          const res = await api.get(`/api/study-rooms/${activeRoomId}/messages`);
          setMessages(res.data);
        } catch (err) {
          console.error('Failed to load messages');
        }
      };
      fetchMessages();
      const interval = setInterval(fetchMessages, 3000); // Polling for now as fallback
      return () => clearInterval(interval);
    }
  }, [activeRoomId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const createRoom = async () => {
    try {
      const res = await api.post('/api/study-rooms', newRoom);
      setShowCreator(false);
      setNewRoom({ title: '', topic: '', branch: '' });
      reload();
      setActiveRoomId(res.data.id);
    } catch (err) {
      alert('Failed to create room');
    }
  };

  const sendMessage = async () => {
    if (!message.trim()) return;
    try {
      await api.post(`/api/study-rooms/${activeRoomId}/messages`, { content: message });
      setMessage('');
      // Refresh local messages immediately
      const res = await api.get(`/api/study-rooms/${activeRoomId}/messages`);
      setMessages(res.data);
    } catch (err) {
      console.error('Failed to send message');
    }
  };

  if (loading || error) {
    return (
      <div className="premium-grid-base">
        <div style={{ gridColumn: 'span 12' }}>
          <DataStatePanel loading={loading} error={error} onRetry={reload} loadingLabel="Initializing study rooms..." />
        </div>
      </div>
    );
  }

  return (
    <div className="premium-grid-base" style={{ height: 'calc(100vh - 120px)', overflow: 'hidden' }}>
      
      {!activeRoomId ? (
        <>
          <header style={{ gridColumn: 'span 12', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <div>
              <h1 className="premium-text-hero" style={{ fontSize: '32px' }}>Study Rooms</h1>
              <p className="premium-text-body subdued">Persistent channels for collaborative learning and quick video syncs.</p>
            </div>
            <button className="premium-button" onClick={() => setShowCreator(true)}>
              <Plus size={18} /> New Room
            </button>
          </header>

          <div style={{ gridColumn: 'span 12', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px', overflowY: 'auto', paddingBottom: '40px' }}>
            {(rooms || []).map((room) => (
              <article key={room.id} className="premium-card" style={{ padding: '24px', cursor: 'pointer' }} onClick={() => setActiveRoomId(room.id)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div style={{ width: 48, height: 48, borderRadius: '14px', background: 'rgba(46,230,166,0.1)', color: 'var(--accent)', display: 'grid', placeItems: 'center' }}>
                    <Hash size={24} />
                  </div>
                  <div className="premium-chip" style={{ background: 'rgba(255,255,255,0.05)', height: 'fit-content' }}>
                    {room.branch || 'General'}
                  </div>
                </div>
                <h3 className="premium-text-h3" style={{ margin: '0 0 8px' }}>{room.title}</h3>
                <p className="premium-text-meta" style={{ color: 'var(--muted)', marginBottom: '20px' }}>#{room.topic}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--muted)', fontSize: '13px' }}>
                    <Users size={14} /> Active now
                  </div>
                  <ChevronRight size={20} style={{ color: 'var(--muted)' }} />
                </div>
              </article>
            ))}
          </div>
        </>
      ) : (
        <div style={{ gridColumn: 'span 12', display: 'grid', gridTemplateColumns: '1fr 340px', gap: '24px', height: '100%' }}>
          
          {/* Main Chat Area */}
          <div className="premium-card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <button onClick={() => { setActiveRoomId(null); setShowVideo(false); }} className="premium-button-secondary" style={{ padding: '8px' }}>
                  <ArrowLeft size={18} />
                </button>
                <div>
                  <h3 className="premium-text-h3" style={{ margin: 0, fontSize: '18px' }}>#{activeRoom.title}</h3>
                  <p className="premium-text-meta" style={{ margin: 0, color: 'var(--muted)' }}>{activeRoom.topic}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className={`premium-button${showVideo ? '-secondary' : ''}`} onClick={() => setShowVideo(!showVideo)}>
                  <Video size={16} /> {showVideo ? 'Hide Video' : 'Start Video'}
                </button>
              </div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {showVideo ? (
                <div style={{ flex: 1, background: '#000', margin: '16px', borderRadius: '16px', overflow: 'hidden' }}>
                  <JitsiMeeting
                    roomName={`campusiq-room-${activeRoom.id}`}
                    configOverwrite={{ startWithAudioMuted: true }}
                    getIFrameRef={(node) => { if (node) node.style.height = '100%'; }}
                  />
                </div>
              ) : (
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {messages.map((msg, i) => (
                    <div key={i} style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '10px', background: 'var(--accent-gradient)', display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: '12px', flexShrink: 0 }}>
                        {msg.author?.name?.[0] || 'U'}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 600 }}>{msg.author?.name || 'User'}</span>
                          <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.5, background: 'rgba(255,255,255,0.03)', padding: '10px 14px', borderRadius: '0 14px 14px 14px' }}>
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
              )}
            </div>

            <div style={{ padding: '20px 24px', background: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="premium-button-secondary" style={{ padding: '12px' }}>
                  <Paperclip size={18} />
                </button>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input 
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendMessage()}
                    placeholder="Type a message..."
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px 16px', color: 'var(--text)', outline: 'none' }}
                  />
                  <button onClick={sendMessage} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer' }}>
                    <Send size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <aside className="flex-column gap-24">
            <section className="premium-card" style={{ padding: '20px' }}>
              <h4 className="premium-text-meta" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Pin size={14} /> PINNED RESOURCES
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {(activeRoom.pinnedResources || []).length ? activeRoom.pinnedResources.map((res, i) => (
                  <div key={i} className="flex-row gap-12 items-center" style={{ padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <BookOpen size={16} style={{ color: 'var(--accent)' }} />
                    <span style={{ fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{res.title}</span>
                  </div>
                )) : (
                  <p className="premium-text-meta subdued" style={{ fontSize: '12px', textAlign: 'center', padding: '12px' }}>No resources pinned yet.</p>
                )}
                <button className="premium-button-secondary" style={{ width: '100%', padding: '10px', fontSize: '13px' }}>
                  <Plus size={14} /> Add Resource
                </button>
              </div>
            </section>

            <section className="premium-card" style={{ padding: '20px' }}>
              <h4 className="premium-text-meta" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Users size={14} /> PARTICIPANTS
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '2px solid var(--accent)' }} />
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>Student {i}</span>
                    <div style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)' }} />
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      )}

      {showCreator && (
        <div className="community-modal-backdrop" onClick={() => setShowCreator(false)}>
          <div className="premium-card community-modal" style={{ padding: '32px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2 className="premium-text-h2">Create Study Room</h2>
              <button className="premium-button-secondary" onClick={() => setShowCreator(false)} style={{ padding: '8px' }}>
                <X size={20} />
              </button>
            </div>
            <div className="community-form-grid">
              <div style={{ marginBottom: '16px' }}>
                <label className="premium-text-meta" style={{ display: 'block', marginBottom: '8px' }}>Room Title</label>
                <input value={newRoom.title} onChange={e => setNewRoom({...newRoom, title: e.target.value})} placeholder="e.g., DBMS Exam Prep" />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label className="premium-text-meta" style={{ display: 'block', marginBottom: '8px' }}>Topic Tag</label>
                <input value={newRoom.topic} onChange={e => setNewRoom({...newRoom, topic: e.target.value})} placeholder="e.g., sql-normalization" />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label className="premium-text-meta" style={{ display: 'block', marginBottom: '8px' }}>Branch</label>
                <input value={newRoom.branch} onChange={e => setNewRoom({...newRoom, branch: e.target.value})} placeholder="e.g., Computer Science" />
              </div>
            </div>
            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="premium-button" onClick={createRoom} style={{ padding: '12px 32px' }}>
                Launch Room
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyRoomsWorkspace;

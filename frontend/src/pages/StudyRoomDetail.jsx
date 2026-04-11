import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Users, Pin, Plus, Send, Video, X, BookOpen, Hash,
  ChevronDown, ChevronUp, Sparkles
} from 'lucide-react';
import { JitsiMeeting } from '@jitsi/react-sdk';
import api from '../lib/api';
import useApiResource from '../hooks/useApiResource';
import useRealtimeRefresh from '../hooks/useRealtimeRefresh';
import DataStatePanel from '../components/DataStatePanel';
import UserProfileDrawer from '../components/UserProfileDrawer';
import './StudyRooms.css';

const StudyRoomDetail = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [msgInput, setMsgInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showJitsi, setShowJitsi] = useState(false);
  const [jitsiRoom, setJitsiRoom] = useState(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [profileUserId, setProfileUserId] = useState(null);
  const [dmTarget, setDmTarget] = useState(null);
  const [answersOpen, setAnswersOpen] = useState(false);
  const [resources, setResources] = useState([]);
  const chatEndRef = useRef(null);
  const msgIntervalRef = useRef(null);

  const loadRoom = useCallback(async () => {
    const res = await api.get(`/study-rooms/${roomId}`);
    return res.data;
  }, [roomId]);

  const { data, loading, error, reload } = useApiResource(loadRoom, [loadRoom]);

  const loadMessages = useCallback(async () => {
    try {
      const res = await api.get(`/study-rooms/${roomId}/messages`);
      setMessages(res.data.messages || []);
    } catch (err) {
      console.error('Failed to load messages', err);
    }
  }, [roomId]);

  const jitsiConfig = useMemo(() => ({ startWithAudioMuted: false }), []);
  const handleIFrameRef = useCallback((n) => { 
    if (n) { 
      n.style.height = '100%'; 
      n.className = 'sr-jitsi-frame'; 
    } 
  }, []);

  useEffect(() => {
    loadMessages();
    msgIntervalRef.current = setInterval(loadMessages, 3500);
    return () => clearInterval(msgIntervalRef.current);
  }, [loadMessages]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useRealtimeRefresh({
    channels: ['study-rooms'],
    onRefresh: () => { reload(); loadMessages(); },
    enabled: Boolean(localStorage.getItem('token')),
  });

  // Load resource hub resources for the pin modal
  const loadResources = async () => {
    try {
      const res = await api.get('/resources');
      const tag = data?.room?.subjectTag || '';
      const all = Array.isArray(res.data.resources) ? res.data.resources : [];
      setResources(tag ? all.filter(r => r.course?.includes(tag) || r.subject?.includes(tag)) : all.slice(0, 20));
    } catch { setResources([]); }
  };

  const sendMessage = async () => {
    const content = msgInput.trim();
    if (!content || sending) return;
    try {
      setSending(true);
      await api.post(`/study-rooms/${roomId}/messages`, { content });
      setMsgInput('');
      await loadMessages();
    } catch (err) {
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const joinRoom = async () => {
    try {
      await api.post(`/study-rooms/${roomId}/join`);
      reload();
    } catch (err) {
      alert('Could not join room');
    }
  };

  const startSession = async () => {
    try {
      const res = await api.post(`/study-rooms/${roomId}/start-session`);
      setJitsiRoom(res.data.jitsiRoom);
      setShowJitsi(true);
      reload();
    } catch (err) {
      alert('Failed to start session');
    }
  };

  const pinAnswer = async (msg) => {
    try {
      await api.post(`/study-rooms/${roomId}/pin-answer`, {
        messageId: msg.id,
        content: msg.content,
        authorName: msg.author?.name || 'Unknown'
      });
      reload();
      loadMessages();
    } catch (err) {
      alert('Failed to pin answer');
    }
  };

  const pinResource = async (resource) => {
    try {
      await api.post(`/study-rooms/${roomId}/pin-resource`, {
        resourceId: resource.id,
        title: resource.title,
        url: resource.url || ''
      });
      reload();
      setShowPinModal(false);
    } catch (err) {
      alert('Failed to pin resource');
    }
  };

  const getInitials = (name = '') =>
    name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const renderContent = (text) => {
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) =>
      part.startsWith('@') ? <span key={i} className="sr-mention">{part}</span> : part
    );
  };

  if (loading || error) {
    return (
      <div className="premium-grid-base">
        <div style={{ gridColumn: 'span 12' }}>
          <DataStatePanel loading={loading} error={error} onRetry={reload} loadingLabel="Opening room..." />
        </div>
      </div>
    );
  }

  const room = data?.room;
  const members = data?.members || [];
  const pinnedResources = room?.pinnedResources || [];
  const pinnedAnswers = room?.pinnedAnswers || [];

  if (!room) return null;

  const myId = (() => {
    try {
      const token = localStorage.getItem('token');
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload?.user?.id || null;
    } catch { return null; }
  })();

  const isMember = room.members.includes(myId);
  const hasActiveSession = !!room.activeSession;

  return (
    <div className="sr-shell">
      {/* User Profile Drawer */}
      <UserProfileDrawer
        userId={profileUserId}
        isOpen={!!profileUserId}
        onClose={() => setProfileUserId(null)}
        onStartDM={(user) => { setDmTarget(user); setProfileUserId(null); }}
      />

      {/* Jitsi Overlay */}
      {showJitsi && jitsiRoom && (
        <div className="sr-jitsi-overlay">
          <div className="sr-jitsi-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="community-live-dot" />
              <div>
                <h3 className="premium-text-h3" style={{ margin: 0, fontSize: '16px' }}>Live Session — #{room.title}</h3>
                <p className="premium-text-meta subdued" style={{ margin: 0 }}>Started by {room.activeSession?.startedBy}</p>
              </div>
            </div>
            <button className="premium-button-secondary" onClick={() => setShowJitsi(false)}>
              <X size={16} /> Leave Session
            </button>
          </div>
          <JitsiMeeting
            domain="meet.jit.si"
            roomName={jitsiRoom}
            configOverwrite={jitsiConfig}
            getIFrameRef={handleIFrameRef}
          />
        </div>
      )}

      {/* Main 3-Panel Layout */}
      <div className="sr-detail">

        {/* LEFT: Member List */}
        <div className="sr-members-panel">
          <div className="sr-panel-header">
            Members · {members.length}
          </div>
          <div className="sr-member-list">
            {members.map(m => (
              <div key={m.id} className="sr-member-item" onClick={() => setProfileUserId(m.id)}>
                <div className="sr-member-avatar">
                  {getInitials(m.name)}
                  <div className="sr-member-online-ring" />
                </div>
                <span className="sr-member-name" title={m.name}>{m.name}</span>
              </div>
            ))}
            {!isMember && (
              <div style={{ padding: '16px 10px' }}>
                <button className="premium-button" style={{ width: '100%', padding: '10px', fontSize: '13px' }} onClick={joinRoom}>
                  Join Room
                </button>
              </div>
            )}
          </div>
        </div>

        {/* CENTER: Chat */}
        <div className="sr-chat-panel">
          {/* Top bar */}
          <div className="sr-topbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <button
                className="premium-button-secondary"
                style={{ padding: '8px' }}
                onClick={() => navigate('/study-rooms')}
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Hash size={16} style={{ color: 'var(--accent)' }} />
                  <span style={{ fontWeight: 700, fontSize: '16px' }}>{room.title}</span>
                  {room.subjectTag && (
                    <span className="premium-chip" style={{ fontSize: '11px', background: 'rgba(46,230,166,0.08)', color: 'var(--accent)' }}>
                      {room.subjectTag}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                  {members.length} members · {room.branch || 'All Branches'} {room.year ? `· ${room.year} Year` : ''}
                </div>
              </div>
            </div>
            <button
              className="premium-button"
              style={{ background: hasActiveSession ? 'rgba(46,230,166,0.15)' : undefined }}
              onClick={hasActiveSession ? () => { setJitsiRoom(room.activeSession.jitsiRoom); setShowJitsi(true); } : startSession}
            >
              <Video size={16} />
              {hasActiveSession ? '🔴 Join Session' : '🔴 Start Session'}
            </button>
          </div>

          {/* Active session banner */}
          {hasActiveSession && !showJitsi && (
            <div className="sr-session-banner">
              <span>🔴 Live session in progress — started by {room.activeSession.startedBy}</span>
              <button className="premium-button" style={{ padding: '6px 16px', fontSize: '12px' }} onClick={() => { setJitsiRoom(room.activeSession.jitsiRoom); setShowJitsi(true); }}>
                Join Now
              </button>
            </div>
          )}

          {/* Messages */}
          <div className="sr-messages">
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 20px', opacity: 0.4 }}>
                <Hash size={40} style={{ marginBottom: '12px' }} />
                <p className="premium-text-meta">Be the first to say something in #{room.title}!</p>
              </div>
            )}
            {messages.map(msg => (
              <div key={msg.id} className="sr-msg">
                <div className="sr-msg-avatar" onClick={() => msg.author?.id && setProfileUserId(msg.author.id)} style={{ cursor: 'pointer' }}>
                  {getInitials(msg.author?.name)}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="sr-msg-header">
                    <span className="sr-msg-name" style={{ cursor: 'pointer' }} onClick={() => msg.author?.id && setProfileUserId(msg.author.id)}>
                      {msg.author?.name || 'Member'}
                    </span>
                    <span className="sr-msg-ts">
                      {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </span>
                  </div>
                  <div className={`sr-msg-bubble ${msg.isPinned ? 'pinned' : ''}`}>
                    {renderContent(msg.content)}
                    {msg.isPinned && <div style={{ fontSize: '10px', color: 'var(--accent)', marginTop: '4px', fontWeight: 700 }}>📌 Pinned Answer</div>}
                  </div>
                  {!msg.isPinned && (
                    <button className="sr-msg-pin-btn" onClick={() => pinAnswer(msg)}>
                      <Pin size={11} /> Pin as solved answer
                    </button>
                  )}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Composer */}
          <div className="sr-composer">
            {!isMember && (
              <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--muted)', marginBottom: '10px' }}>
                Join this room to send messages
              </div>
            )}
            <div className="sr-composer-inner" style={!isMember ? { opacity: 0.4, pointerEvents: 'none' } : {}}>
              <input
                className="sr-composer-input"
                placeholder={`Message #${room.title} — @ to mention someone`}
                value={msgInput}
                onChange={e => setMsgInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                disabled={!isMember}
              />
              <button className="sr-send-btn" onClick={sendMessage} disabled={!msgInput.trim() || sending}>
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: Pinned Resources + Solved Answers */}
        <div className="sr-right-panel">
          <div className="sr-right-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div className="sr-section-label" style={{ marginBottom: 0 }}>
                <Pin size={12} /> Pinned Resources
              </div>
              <button
                style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                onClick={() => { setShowPinModal(true); loadResources(); }}
              >
                <Plus size={12} /> Add
              </button>
            </div>

            {pinnedResources.length === 0 && (
              <p className="premium-text-meta subdued" style={{ fontSize: '12px', textAlign: 'center', padding: '16px 0' }}>
                No resources pinned yet. Pin a PDF from the Resource Hub!
              </p>
            )}

            {pinnedResources.map((res, i) => (
              <div key={i} className="sr-pinned-resource">
                <BookOpen size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{res.title}</div>
                  <div style={{ fontSize: '10px', color: 'var(--muted)' }}>by {res.pinnedBy}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="sr-right-section">
            <button
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', marginBottom: answersOpen ? '16px' : 0 }}
              onClick={() => setAnswersOpen(o => !o)}
            >
              <div className="sr-section-label" style={{ marginBottom: 0 }}>
                <Sparkles size={12} /> Solved Doubts ({pinnedAnswers.length})
              </div>
              {answersOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {answersOpen && (
              <>
                {pinnedAnswers.length === 0 && (
                  <p className="premium-text-meta subdued" style={{ fontSize: '12px', textAlign: 'center', padding: '12px 0' }}>
                    No pinned answers yet. Hover a message and pin the best answer!
                  </p>
                )}
                {pinnedAnswers.map((ans, i) => (
                  <div key={i} className="sr-pinned-answer">
                    <div>{ans.content}</div>
                    <div className="sr-pin-by">✓ by {ans.authorName} · pinned by {ans.pinnedBy}</div>
                  </div>
                ))}
              </>
            )}
          </div>

          <div className="sr-right-section" style={{ flex: 1 }}>
            <div className="sr-section-label" style={{ marginBottom: '12px' }}>
              <Hash size={12} /> About this Room
            </div>
            <p style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.6 }}>
              {room.description || 'A collaborative space for studying and asking questions.'}
            </p>
            <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {room.subjectTag && <div style={{ fontSize: '11px', color: 'var(--accent)', fontWeight: 700 }}>#{room.subjectTag}</div>}
              {room.branch && <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Branch: {room.branch}</div>}
              {room.year && <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Year: {room.year}</div>}
            </div>
          </div>
        </div>
      </div>

      {/* Pin Resource Modal */}
      {showPinModal && (
        <div className="community-modal-backdrop" onClick={() => setShowPinModal(false)}>
          <div className="premium-card community-modal" style={{ padding: '32px', maxHeight: '70vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 className="premium-text-h2">Pin a Resource</h2>
              <button className="premium-button-secondary" style={{ padding: '8px' }} onClick={() => setShowPinModal(false)}>
                <X size={18} />
              </button>
            </div>
            <p className="premium-text-meta subdued" style={{ marginBottom: '16px' }}>
              {room.subjectTag ? `Showing resources related to "${room.subjectTag}"` : 'All resources'}
            </p>
            <div style={{ overflow: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {resources.length === 0 && <p className="premium-text-meta subdued" style={{ textAlign: 'center', padding: '24px' }}>No resources found.</p>}
              {resources.map(r => (
                <div key={r.id} className="sr-pinned-resource" onClick={() => pinResource(r)} style={{ cursor: 'pointer', padding: '14px' }}>
                  <BookOpen size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>{r.title}</div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{r.course} · {r.branch}</div>
                  </div>
                  <Plus size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyRoomDetail;

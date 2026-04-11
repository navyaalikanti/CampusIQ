import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { X, Send, Minus, Video, Check, X as CloseIcon } from 'lucide-react';
import { JitsiMeeting } from '@jitsi/react-sdk';
import api from '../lib/api';
import './DMPanel.css';

const DMPanel = ({ targetUser, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [jitsiRoom, setJitsiRoom] = useState(null);
  const messagesEndRef = useRef(null);
  const pollRef = useRef(null);

  const myId = (() => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return null;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload?.user?.id || null;
    } catch { return null; }
  })();

  const fetchMessages = useCallback(async () => {
    if (!targetUser?.id) return;
    try {
      const res = await api.get(`/dm/conversations/${targetUser.id}`);
      setMessages(res.data.messages || []);
    } catch {
      setMessages([]);
    }
  }, [targetUser?.id]);

  useEffect(() => {
    fetchMessages();
    pollRef.current = setInterval(fetchMessages, 4000);
    return () => clearInterval(pollRef.current);
  }, [fetchMessages]);

  useEffect(() => {
    if (!minimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, minimized]);

  const sendMessage = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    try {
      setSending(true);
      await api.post(`/dm/conversations/${targetUser.id}`, { text });
      setDraft('');
      fetchMessages();
    } catch {
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const sendInvite = async () => {
    try {
      await api.post(`/dm/conversations/${targetUser.id}/invite`);
      fetchMessages();
    } catch (err) {
      alert('Failed to send session invite');
    }
  };

  const respondToInvite = async (messageId, action) => {
    try {
      const roomId = [myId, targetUser.id].sort().join('_');
      await api.post(`/dm/messages/${messageId}/respond-invite`, { action, roomId });
      if (action === 'accepted') {
        setJitsiRoom(`campusiq-dm-${roomId}`);
      }
      fetchMessages();
    } catch (err) {
      alert('Failed to respond to invite');
    }
  };

  const getInitials = (name = '') =>
    name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  const formatTime = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`dm-panel ${minimized ? 'dm-panel--minimized' : ''}`}>
      <div className="dm-header" onClick={() => setMinimized((m) => !m)}>
        <div className="dm-header-avatar">{getInitials(targetUser?.name)}</div>
        <div className="dm-header-info">
          <span className="dm-header-name">{targetUser?.name}</span>
          <span className="dm-header-sub">{targetUser?.isConnected ? 'Mutual Connection' : 'Campus Network'}</span>
        </div>
        <div className="dm-header-actions">
          {targetUser?.isConnected && !minimized && (
             <button className="dm-tool-btn" onClick={(e) => { e.stopPropagation(); sendInvite(); }}>
               <Video size={16} />
             </button>
          )}
          <button className="dm-icon-btn" onClick={(e) => { e.stopPropagation(); setMinimized((m) => !m); }}>
            <Minus size={14} />
          </button>
          <button className="dm-icon-btn dm-icon-btn--close" onClick={(e) => { e.stopPropagation(); onClose(); }}>
            <X size={14} />
          </button>
        </div>
      </div>

      {!minimized && (
        <>
          <div className="dm-messages">
            {!targetUser?.isConnected && (
              <div className="dm-connect-overlay">
                 <span>🚀 Connections unlock messaging! Send {targetUser?.name} a request on their profile first.</span>
              </div>
            )}
            
            {messages.length === 0 && targetUser?.isConnected && (
              <div className="dm-empty">No messages yet. Say hi!</div>
            )}

            {messages.map((msg) => {
              const isMine = msg.senderId === myId;
              if (msg.type === 'system_invite') {
                return (
                  <div key={msg.id} className="dm-invite-card">
                    <span>{isMine ? 'You invited them' : msg.senderName + ' invited you'} to a live breakout session.</span>
                    {msg.status === 'pending' ? (
                      <div className="dm-invite-actions">
                        {!isMine ? (
                          <>
                            <button className="dm-invite-btn dm-invite-btn--accept" onClick={() => respondToInvite(msg.id, 'accepted')}>Accept</button>
                            <button className="dm-invite-btn dm-invite-btn--decline" onClick={() => respondToInvite(msg.id, 'declined')}>Decline</button>
                          </>
                         ) : <span>Awaiting response...</span>}
                      </div>
                    ) : (
                      <div className={`dm-invite-status ${msg.status}`}>
                        Invite {msg.status}
                        {msg.status === 'accepted' && (
                          <button className="solve-btn" style={{ marginLeft: '10px' }} onClick={() => setJitsiRoom(`campusiq-dm-${[myId, targetUser.id].sort().join('_')}`)}>Join Room</button>
                        )}
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <div key={msg.id} className={`dm-bubble ${isMine ? 'dm-bubble--mine' : 'dm-bubble--theirs'}`}>
                  {!isMine && <div className="dm-bubble-avatar">{getInitials(msg.senderName)}</div>}
                  <div className="dm-bubble-content">
                    <div className="dm-bubble-text">{msg.text}</div>
                    <div className="dm-bubble-time">{formatTime(msg.createdAt)}</div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="dm-composer">
            <textarea
              className="dm-input"
              disabled={!targetUser?.isConnected}
              placeholder={targetUser?.isConnected ? "Type a message..." : "Connect first..."}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
              rows={1}
            />
            <button className="dm-send-btn" onClick={sendMessage} disabled={sending || !draft.trim() || !targetUser?.isConnected}>
              <Send size={15} />
            </button>
          </div>
        </>
      )}

      {jitsiRoom && (
        <div className="community-modal-backdrop">
           <div className="premium-card" style={{ width: '95%', height: '90vh', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                 <h2 className="premium-text-h2">Breakout Session</h2>
                 <button className="premium-button-secondary" onClick={() => setJitsiRoom(null)}>Leave</button>
              </div>
              <div style={{ flex: 1, background: '#000', borderRadius: '16px', overflow: 'hidden', height: 'calc(100% - 60px)' }}>
                 <JitsiMeeting roomName={jitsiRoom} getIFrameRef={n => n && (n.style.height = '100%')} />
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default DMPanel;

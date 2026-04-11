import { useState, useEffect } from 'react';
import { Bell, Check, X, Handshake } from 'lucide-react';
import api from '../lib/api';
import './NetworkRequestsNotification.css';

const NetworkRequestsNotification = () => {
  const [requests, setRequests] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    try {
      const res = await api.get('/community/workspace');
      if (res.data && res.data.incomingConnectionRequests) {
        setRequests(res.data.incomingConnectionRequests);
      }
    } catch (error) {
      console.error('Failed to fetch connections:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    const handleRefresh = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (payload.type === 'refresh' && payload.channels.includes('community')) {
          fetchRequests();
        }
      } catch (err) {}
    };

    // Need a way to listen to global ws refresh if possible
    // But for now polling every 30s or on mount is fine
    const intervalId = setInterval(fetchRequests, 30000);
    return () => clearInterval(intervalId);
  }, []);

  const handleRespond = async (connectionId, action) => {
    try {
      await api.post(`/community/connections/${connectionId}/respond`, { action });
      fetchRequests();
    } catch (err) {
      alert(`Failed to ${action} request`);
    }
  };

  return (
    <div className="network-notification-wrapper" style={{ position: 'absolute', top: '32px', right: '32px', zIndex: 100 }}>
      <button 
        className="premium-icon-btn" 
        style={{ 
          position: 'relative', 
          background: 'rgba(255,255,255,0.05)', 
          border: '1px solid rgba(255,255,255,0.1)', 
          padding: '12px', 
          borderRadius: '50%',
          cursor: 'pointer',
          color: 'var(--accent)',
          transition: 'all 0.3s ease'
        }}
        onClick={() => setIsOpen(!isOpen)}
        title="Network Requests"
      >
        <Handshake size={20} />
        {requests.length > 0 && (
          <span className="notification-badge" style={{
            position: 'absolute', top: '-4px', right: '-4px', 
            background: 'var(--accent)', color: '#000', 
            width: '20px', height: '20px', borderRadius: '50%', 
            fontSize: '11px', fontWeight: 'bold', 
            display: 'grid', placeItems: 'center',
            boxShadow: '0 0 10px rgba(46, 230, 166, 0.5)'
          }}>
            {requests.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="premium-card notification-dropdown" style={{
          position: 'absolute', top: '100%', right: '0', 
          marginTop: '12px', width: '320px', padding: '16px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)'
        }}>
          <h3 className="premium-text-h3" style={{ margin: '0 0 16px 0', fontSize: '14px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
            Growth Link Requests
          </h3>
          
          <div className="requests-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto' }}>
            {!loading && requests.length === 0 && (
              <p className="premium-text-meta subdued" style={{ textAlign: 'center', padding: '20px 0' }}>No pending requests.</p>
            )}
            {requests.map(req => (
              <div key={req.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.03)'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <strong style={{ fontSize: '13px' }}>{req.requesterName}</strong>
                  <span className="premium-text-meta" style={{ fontSize: '11px' }}>Sent you a request</span>
                </div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={() => handleRespond(req.id, 'accept')} style={{ background: 'rgba(46, 230, 166, 0.1)', color: 'var(--accent)', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}><Check size={14} /></button>
                  <button onClick={() => handleRespond(req.id, 'decline')} style={{ background: 'rgba(255, 90, 95, 0.1)', color: 'var(--danger)', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}><X size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NetworkRequestsNotification;

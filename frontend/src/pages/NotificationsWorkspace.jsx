import { useCallback } from 'react';
import { Bell, ArrowUpRight, Circle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import useApiResource from '../hooks/useApiResource';
import useRealtimeRefresh from '../hooks/useRealtimeRefresh';
import DataStatePanel from '../components/DataStatePanel';

const NotificationsWorkspace = () => {
  const loadNotifications = useCallback(async () => {
    const response = await api.get('/notifications');
    return response.data.notifications || [];
  }, []);

  const { data, loading, error, reload } = useApiResource(loadNotifications, [loadNotifications]);

  useRealtimeRefresh({
    channels: ['notifications', 'dashboard', 'discussions', 'live-classes'],
    onRefresh: reload,
    enabled: Boolean(localStorage.getItem('token')),
  });

  if (loading || error || !(data || []).length) {
    return (
      <div className="premium-grid-base">
        <div style={{ gridColumn: 'span 12' }}>
          <DataStatePanel
            loading={loading}
            error={error}
            empty={!loading && !error && !(data || []).length}
            onRetry={reload}
            loadingLabel="Intercepting workspace signals..."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="premium-grid-base">
      <header className="flex-column gap-8 mb-32" style={{ gridColumn: 'span 12' }}>
        <div className="flex-row gap-8" style={{ color: 'var(--accent)' }}>
          <Bell size={16} />
          <span className="premium-text-meta" style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>Alert Layer</span>
        </div>
        <h1 className="premium-text-hero">Workspace Activity</h1>
        <p className="premium-text-body subdued">Real-time updates across your threads, mentorships, and academic milestones.</p>
      </header>

      <div className="flex-column gap-12" style={{ gridColumn: 'span 12' }}>
        {data.map((item) => (
          <article key={item.id} className="premium-card flex-row items-center gap-24" style={{ padding: '16px 24px' }}>
            <div style={{ width: 40, height: 40, borderRadius: '12px', background: 'rgba(255,255,255,0.03)', display: 'grid', placeItems: 'center', color: !item.read ? 'var(--accent)' : 'var(--muted)' }}>
               {!item.read ? <Circle size={12} fill="currentColor"/> : <Bell size={18}/>}
            </div>
            
            <div className="flex-column gap-4" style={{ flex: 1 }}>
              <h3 className="premium-text-h3" style={{ margin: 0, fontSize: '15px' }}>{item.title}</h3>
              <p className="premium-text-meta" style={{ opacity: 0.6, fontSize: '13px' }}>{item.body}</p>
            </div>

            <div className="flex-row gap-16 items-center">
               <div className="flex-column items-end">
                  <span className="premium-chip-outline" style={{ fontSize: '10px' }}>{item.type}</span>
                  <div className="flex-row gap-4 items-center mt-4" style={{ opacity: 0.4, fontSize: '11px' }}>
                     <Clock size={10}/>
                     <span>Recently</span>
                  </div>
               </div>
               <Link to={item.ctaRoute} className="premium-button-secondary" style={{ padding: '10px', textDecoration: 'none' }}>
                  <ArrowUpRight size={18}/>
               </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

export default NotificationsWorkspace;

import { useState, useCallback, useMemo } from 'react';
import { Search, MapPin, Building, Users } from 'lucide-react';
import api from '../lib/api';
import useApiResource from '../hooks/useApiResource';
import DataStatePanel from '../components/DataStatePanel';
import UserProfileDrawer from '../components/UserProfileDrawer';
import './NetworkWorkspace.css';

const getInitials = (name = '') =>
  name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

const NetworkWorkspace = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  const loadNetwork = useCallback(async () => {
    const res = await api.get('/community/workspace');
    return res.data;
  }, []);

  const { data: workspace, loading, error, reload } = useApiResource(loadNetwork, [loadNetwork]);

  const connections = useMemo(() => {
    if (!workspace?.profiles) return [];
    // Filter profiles to only those who have relationship === 'connected'
    return workspace.profiles.filter(p => p.relationship === 'connected');
  }, [workspace]);

  const filteredConnections = useMemo(() => {
    if (!searchQuery) return connections;
    const q = searchQuery.toLowerCase();
    return connections.filter(c => 
      c.name.toLowerCase().includes(q) || 
      c.role.toLowerCase().includes(q) || 
      c.headline.toLowerCase().includes(q) ||
      (c.skills && c.skills.some(s => s.toLowerCase().includes(q)))
    );
  }, [connections, searchQuery]);

  return (
    <div className="premium-grid-base">
      <header className="flex-column gap-16" style={{ gridColumn: 'span 12', marginBottom: '12px' }}>
        <div className="flex-row justify-between items-center flex-wrap gap-16">
          <div className="flex-column gap-8">
            <div className="flex-row gap-8" style={{ color: 'var(--accent)' }}>
              <Users size={16} />
              <span className="premium-text-meta" style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}>Connections</span>
            </div>
            <h1 className="premium-text-hero" style={{ margin: 0 }}>My Network</h1>
            <p className="premium-text-body subdued">View and manage your connected peers and mentors.</p>
          </div>
          
          <div className="search-bar premium-card" style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', gap: '12px', minWidth: '300px' }}>
            <Search size={18} style={{ color: 'var(--muted)' }} />
            <input 
              type="text" 
              placeholder="Search by name, role or skill..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', width: '100%' }}
            />
          </div>
        </div>
      </header>

      <main style={{ gridColumn: 'span 12' }}>
        {loading && <DataStatePanel loading={true} loadingLabel="Loading Network..." />}
        {error && <DataStatePanel error={error} onRetry={reload} />}
        
        {!loading && !error && (
          <>
            {filteredConnections.length > 0 ? (
              <div className="network-grid">
                {filteredConnections.map(user => (
                  <div key={user.id} className="network-user-card" onClick={() => setSelectedUser(user.id)}>
                    <div className="network-avatar-wrap">
                      {user.avatar ? <img src={user.avatar} alt={user.name} /> : getInitials(user.name)}
                    </div>
                    <div className="network-user-info">
                      <h3 className="network-user-name">{user.name}</h3>
                      <span className="network-user-role">{user.role}</span>
                      <p className="network-user-headline">{user.headline || `${user.branch || 'Student'} • ${user.year || '1st Year'}`}</p>
                    </div>
                    
                    {user.skills && user.skills.length > 0 && (
                      <div className="network-skills">
                        {user.skills.slice(0, 3).map((skill, index) => (
                          <span key={index} className="network-skill-chip">{skill}</span>
                        ))}
                      </div>
                    )}
                    
                    <button className="network-action-btn" onClick={(e) => { e.stopPropagation(); setSelectedUser(user.id); }}>
                      View Profile
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-network-state">
                <Users size={48} style={{ color: 'var(--muted)', opacity: 0.5 }} />
                <h3 className="premium-text-h3">No connections found</h3>
                <p className="premium-text-meta subdued" style={{ maxWidth: '400px' }}>
                  {searchQuery 
                    ? "Try adjusting your search criteria" 
                    : "You haven't connected with anyone yet. Explore the community and start building your network with Growth Links!"}
                </p>
              </div>
            )}
          </>
        )}
      </main>

      {/* User Profile Drawer */}
      <UserProfileDrawer 
        userId={selectedUser} 
        isOpen={!!selectedUser} 
        onClose={() => setSelectedUser(null)} 
        onStartDM={(profile) => {
          setSelectedUser(null);
          // Assuming App routing setup handles DMs or we just push to /messages
          window.location.href = `/messages?user=${profile.userId || selectedUser}`;
        }}
      />
    </div>
  );
};

export default NetworkWorkspace;

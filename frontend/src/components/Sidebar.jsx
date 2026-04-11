import { NavLink, useNavigate } from 'react-router-dom';
import { useMemo, useState } from 'react';
import {
  LayoutDashboard,
  FolderKanban,
  BrainCircuit,
  MessageSquareText,
  Users,
  Inbox,
  UserCircle2,
  LogOut,
  Compass,
  Hash,
  Video,
  Megaphone,
  Handshake,
  BookOpen,
  Zap,
  Star,
  ChevronDown,
  ChevronUp,
  PanelLeft,
  Share2,
} from 'lucide-react';
import { clearStoredSession } from '../lib/session';

const Sidebar = ({ isCollapsed, onToggle }) => {
  const navigate = useNavigate();
  const [expandedGroups, setExpandedGroups] = useState({});
  const storedUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  }, []);
  const isMentorRole = ['faculty', 'graduate'].includes(String(storedUser?.role || '').toLowerCase());

  const toggleGroup = (title) => {
    setExpandedGroups(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const handleLogout = () => {
    clearStoredSession();
    navigate('/login');
  };

  const studentStandaloneItems = [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Resource Hub', to: '/resources', icon: FolderKanban },
    { label: 'Study Genie', to: '/summaries', icon: BrainCircuit },
    { label: 'Mentors', to: '/mentors', icon: Users },
  ];

  const mentorStandaloneItems = [
    { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Resource Hub', to: '/resources', icon: FolderKanban },
    { label: 'Messages', to: '/messages', icon: Inbox },
  ];

  const navGroups = [
    {
      title: 'Community',
      icon: Share2,
      items: [
        { label: 'Feed', to: '/community', icon: MessageSquareText },
        { label: 'My Network', to: '/network', icon: Users },
        { label: 'DMs', to: '/messages', icon: Inbox },
      ]
    },
    {
      title: 'Learn Together',
      icon: Users,
      items: [
        { label: 'Study Rooms', to: '/study-rooms', icon: Hash },
        { label: 'Live Classes', to: '/live-classes', icon: Video },
      ]
    },

  ];

  return (
    <aside className={`premium-sidebar ${isCollapsed ? 'collapsed' : ''}`} style={{ width: isCollapsed ? '80px' : '260px', minWidth: isCollapsed ? '80px' : '260px', transition: 'all 0.3s ease' }}>
      <div className="sidebar-header flex-row items-center" style={{ 
        padding: isCollapsed ? '24px 0' : '32px 24px', 
        justifyContent: isCollapsed ? 'center' : 'space-between',
        cursor: isCollapsed ? 'pointer' : 'default'
      }} onClick={isCollapsed ? onToggle : undefined}>
        <div className="logo-container" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="logo-sparkle">
            <Compass size={18} />
          </div>
          {!isCollapsed && <span className="logo-text">CampusIQ</span>}
        </div>
        
        {!isCollapsed && (
          <button onClick={onToggle} style={{ color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '8px', display: 'grid', placeItems: 'center' }}>
            <PanelLeft size={20} />
          </button>
        )}
      </div>

      <div className="sidebar-nav">
        {/* Standalone Core Items */}
        <div className="nav-group">
          <div className="nav-items">
            {(isMentorRole ? mentorStandaloneItems : studentStandaloneItems).map((item, idx) => (
              <NavLink 
                key={idx} 
                to={item.to} 
                className={({ isActive }) => `nav-item ${item.highlight ? 'nav-item-highlight' : ''} ${isActive ? 'active' : ''}`}
              >
                <item.icon size={20} className="nav-icon" />
                {!isCollapsed && <span className="nav-label">{item.label}</span>}
              </NavLink>
            ))}
          </div>
        </div>

        {/* Collapsible Groups */}
        {navGroups.map((group, idx) => (
          <div key={idx} className={`nav-group ${expandedGroups[group.title] ? 'is-expanded' : ''}`}>
            <div 
              className="nav-group-title flex-row items-center clickable" 
              onClick={() => toggleGroup(group.title)}
              style={{ 
                cursor: 'pointer', 
                userSelect: 'none',
                justifyContent: isCollapsed ? 'center' : 'space-between',
                padding: isCollapsed ? '8px 0' : '0 12px'
              }}
            >
              <div className="flex-row gap-12">
                <group.icon size={16} className="nav-icon" />
                {!isCollapsed && <span>{group.title}</span>}
              </div>
              {!isCollapsed && (expandedGroups[group.title] ? <ChevronUp size={14} /> : <ChevronDown size={14} />)}
            </div>
            {expandedGroups[group.title] && (
              <div className="nav-items fade-in" style={{ marginTop: '2px', paddingLeft: '12px' }}>
                {group.items.map((item, itemIdx) => (
                  <NavLink
                    key={itemIdx}
                    to={item.to}
                    className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                    style={{ 
                      paddingLeft: '28px', 
                      height: '36px',
                      fontSize: '13px'
                    }}
                  >
                    {!isCollapsed && <span className="nav-label">{item.label}</span>}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} style={{ justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
          <UserCircle2 size={20} className="nav-icon" />
          {!isCollapsed && <span className="nav-label">Profile</span>}
        </NavLink>
        <button onClick={handleLogout} className="nav-item logout-btn" style={{ justifyContent: isCollapsed ? 'center' : 'flex-start' }}>
          <LogOut size={20} className="nav-icon" />
          {!isCollapsed && <span className="nav-label">Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

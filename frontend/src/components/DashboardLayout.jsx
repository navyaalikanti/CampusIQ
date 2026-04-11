import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import AIAssistant from './AIAssistant';

const DashboardLayout = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className={`premium-layout-wrapper ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} />
      <main className="dashboard-layout-main" style={{ minHeight: '100vh', overflowY: 'auto', transition: 'all 0.3s ease' }}>
        <Outlet />
      </main>
      <AIAssistant />
    </div>
  );
};

export default DashboardLayout;

import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';

import ResourceHub from './pages/ResourceHub';
import Summaries from './pages/Summaries';
import DiscussionsWorkspace from './pages/DiscussionsWorkspace';
import LiveClassesWorkspace from './pages/LiveClassesWorkspace';
import AnnouncementsWorkspace from './pages/AnnouncementsWorkspace';
import StudyRoomsWorkspace from './pages/StudyRoomsWorkspace';
import StudyRoomsPage from './pages/StudyRoomsPage';
import StudyRoomDetail from './pages/StudyRoomDetail';
import CollabScorePage from './pages/CollabScorePage';
import RecommendationsWorkspace from './pages/RecommendationsWorkspace';
import MentorsWorkspace from './pages/MentorsWorkspace';
import RoadmapWorkspace from './pages/RoadmapWorkspace';
import NotificationsWorkspace from './pages/NotificationsWorkspace';
import MessagesWorkspace from './pages/MessagesWorkspace';
import ProfilePage from './pages/ProfilePage';
import NetworkWorkspace from './pages/NetworkWorkspace';
import { applyTheme, getStoredTheme, getStoredUser, isMentorRole } from './lib/session';
import './App.css';

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

const StudentOnlyRoute = ({ children }) => {
  const user = getStoredUser();
  return isMentorRole(user?.role) ? <Navigate to="/dashboard" replace /> : children;
};

function App() {
  useEffect(() => {
    applyTheme(getStoredTheme());
  }, []);

  return (
    <Router>
      <div className="app-shell">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          
          <Route element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/resources" element={<ResourceHub />} />
            <Route path="/summaries" element={<StudentOnlyRoute><Summaries /></StudentOnlyRoute>} />
            <Route path="/community" element={<DiscussionsWorkspace />} />
            <Route path="/live-classes" element={<LiveClassesWorkspace />} />
            <Route path="/announcements" element={<AnnouncementsWorkspace />} />
            <Route path="/study-rooms" element={<StudyRoomsPage />} />
            <Route path="/study-rooms/:roomId" element={<StudyRoomDetail />} />
            <Route path="/collab-score" element={<CollabScorePage />} />
            
            <Route path="/network" element={<NetworkWorkspace />} />
            <Route path="/team-finder" element={<DiscussionsWorkspace />} />
            <Route path="/resource-discussions" element={<DiscussionsWorkspace />} />
            <Route path="/saved-threads" element={<DiscussionsWorkspace />} />

            <Route path="/recommendations" element={<RecommendationsWorkspace />} />
            <Route path="/mentors" element={<MentorsWorkspace />} />
            <Route path="/roadmap" element={<RoadmapWorkspace />} />
            <Route path="/notifications" element={<NotificationsWorkspace />} />
            <Route path="/messages" element={<MessagesWorkspace />} />
            <Route path="/profile" element={<ProfilePage />} />
            
            <Route path="/upload-center" element={<StudentOnlyRoute><Navigate to="/resources?mode=upload" replace /></StudentOnlyRoute>} />
            <Route path="/search" element={<StudentOnlyRoute><Navigate to="/community" replace /></StudentOnlyRoute>} />
            <Route path="/groups" element={<StudentOnlyRoute><Navigate to="/network" replace /></StudentOnlyRoute>} />
            <Route path="/leaderboard" element={<StudentOnlyRoute><Navigate to="/collab-score" replace /></StudentOnlyRoute>} />
            <Route path="/saved" element={<StudentOnlyRoute><Navigate to="/resources?mode=saved" replace /></StudentOnlyRoute>} />
            <Route path="/settings" element={<Navigate to="/profile" replace />} />
          </Route>
        </Routes>
      </div>
    </Router>
  );
}

export default App;

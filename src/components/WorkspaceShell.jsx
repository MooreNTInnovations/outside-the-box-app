import { useEffect, useMemo, useState } from 'react';
import AdminPage from '../pages/AdminPage';
import ChatPage from '../pages/ChatPage';
import FilesPage from '../pages/FilesPage';
import HomePage from '../pages/HomePage';
import OAuthConsentPage from '../pages/OAuthConsentPage';
import ProfessionalsPage from '../pages/ProfessionalsPage';
import ProfilePage from '../pages/ProfilePage';
import ProjectsPage from '../pages/ProjectsPage';
import { getCurrentProfile } from '../services/profileService';
import Avatar from './Avatar';
import BrandMark from './BrandMark';

const navItems = [
  { key: 'home', label: 'Home' },
  { key: 'collaboration-chat', label: 'Collaboration Chat' },
  { key: 'ideas-chat', label: 'Ideas Chat' },
  { key: 'general-chat', label: 'General Chat' },
  { key: 'chat-rooms', label: 'Chat Rooms' },
  { key: 'projects', label: 'Projects' },
  { key: 'professionals', label: 'Professionals' },
  { key: 'files', label: 'Shared Files' },
  { key: 'profile', label: 'Profile' },
  { key: 'admin-moderator-channel', label: 'Admin Moderator Channel' },
  { key: 'admin', label: 'Admin Moderation' },
];

const WorkspaceShell = ({ user, signOut, initialPage = 'home' }) => {
  const [activePage, setActivePage] = useState(initialPage);
  const [currentProfile, setCurrentProfile] = useState(null);
  const [focusRequest, setFocusRequest] = useState(null);

  useEffect(() => {
    getCurrentProfile(user?.id)
      .then(setCurrentProfile)
      .catch(() => setCurrentProfile(null));
  }, [user?.id]);

  const visibleNavItems = useMemo(() => {
    const canViewAdmin =
      currentProfile?.role === 'admin' || currentProfile?.role === 'moderator';

    return navItems.filter(
      (item) =>
        !['admin', 'admin-moderator-channel'].includes(item.key) || canViewAdmin,
    );
  }, [currentProfile?.role]);

  const navigateTo = (page, target = null) => {
    setFocusRequest(target ? { page, target, requestedAt: Date.now() } : null);
    setActivePage(page);
  };

  const activeView = useMemo(() => {
    if (activePage === 'admin-moderator-channel') {
      return (
        <ChatPage
          roomKey="admin-moderator-channel"
          roomName="Admin Moderator Channel"
          user={user}
          currentProfile={currentProfile}
        />
      );
    }

    if (activePage.endsWith('-chat')) {
      const roomName = navItems.find((item) => item.key === activePage)?.label;
      return <ChatPage roomKey={activePage} roomName={roomName} user={user} currentProfile={currentProfile} />;
    }

    const views = {
      home: <HomePage user={user} currentProfile={currentProfile} onNavigate={navigateTo} />,
      'chat-rooms': <ChatPage user={user} currentProfile={currentProfile} />,
      projects: <ProjectsPage user={user} focusRequest={focusRequest} />,
      professionals: <ProfessionalsPage user={user} />,
      files: <FilesPage user={user} focusRequest={focusRequest} />,
      profile: <ProfilePage user={user} onProfileUpdated={setCurrentProfile} />,
      admin: <AdminPage user={user} currentProfile={currentProfile} />,
      'oauth-consent': <OAuthConsentPage user={user} />,
    };

    return views[activePage] || views.home;
  }, [activePage, currentProfile, focusRequest, user]);

  return (
    <div className="workspace">
      <aside className="sidebar">
        <BrandMark compact />
        <nav className="workspace-nav" aria-label="Workspace navigation">
          {visibleNavItems.map((item) => (
            <button
              key={item.key}
              className={activePage === item.key ? 'active' : ''}
              type="button"
              onClick={() => navigateTo(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>
      <div className="workspace-main">
        <header className="topbar">
          <span className="avatar-label">
            <Avatar profile={currentProfile} label={user?.email} size="sm" />
            <span>{user?.email}</span>
          </span>
          <button type="button" onClick={signOut}>
            Sign Out
          </button>
        </header>
        <main className="content">{activeView}</main>
      </div>
    </div>
  );
};

export default WorkspaceShell;

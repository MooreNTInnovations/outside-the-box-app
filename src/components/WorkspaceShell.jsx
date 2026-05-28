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
import BrandMark from './BrandMark';

const navItems = [
  { key: 'home', label: 'Home' },
  { key: 'collaboration-chat', label: 'Collaboration Chat' },
  { key: 'ideas-chat', label: 'Ideas Chat' },
  { key: 'general-chat', label: 'General Chat' },
  { key: 'projects', label: 'Projects' },
  { key: 'professionals', label: 'Professionals' },
  { key: 'files', label: 'Shared Files' },
  { key: 'profile', label: 'Profile' },
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

    return navItems.filter((item) => item.key !== 'admin' || canViewAdmin);
  }, [currentProfile?.role]);

  const navigateTo = (page, target = null) => {
    setFocusRequest(target ? { page, target, requestedAt: Date.now() } : null);
    setActivePage(page);
  };

  const activeView = useMemo(() => {
    if (activePage.endsWith('-chat')) {
      const roomName = navItems.find((item) => item.key === activePage)?.label;
      return <ChatPage roomKey={activePage} roomName={roomName} user={user} />;
    }

    const views = {
      home: <HomePage user={user} currentProfile={currentProfile} onNavigate={navigateTo} />,
      projects: <ProjectsPage user={user} focusRequest={focusRequest} />,
      professionals: <ProfessionalsPage />,
      files: <FilesPage user={user} focusRequest={focusRequest} />,
      profile: <ProfilePage user={user} />,
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
          <span>{user?.email}</span>
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

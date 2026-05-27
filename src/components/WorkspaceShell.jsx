import { useMemo, useState } from 'react';
import AdminPage from '../pages/AdminPage';
import ChatPage from '../pages/ChatPage';
import FilesPage from '../pages/FilesPage';
import HomePage from '../pages/HomePage';
import OAuthConsentPage from '../pages/OAuthConsentPage';
import ProfessionalsPage from '../pages/ProfessionalsPage';
import ProfilePage from '../pages/ProfilePage';
import ProjectsPage from '../pages/ProjectsPage';
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

  const activeView = useMemo(() => {
    if (activePage.endsWith('-chat')) {
      const roomName = navItems.find((item) => item.key === activePage)?.label;
      return <ChatPage roomKey={activePage} roomName={roomName} user={user} />;
    }

    const views = {
      home: <HomePage />,
      projects: <ProjectsPage user={user} />,
      professionals: <ProfessionalsPage />,
      files: <FilesPage user={user} />,
      profile: <ProfilePage user={user} />,
      admin: <AdminPage />,
      'oauth-consent': <OAuthConsentPage user={user} />,
    };

    return views[activePage] || views.home;
  }, [activePage, user]);

  return (
    <div className="workspace">
      <aside className="sidebar">
        <BrandMark compact />
        <nav className="workspace-nav" aria-label="Workspace navigation">
          {navItems.map((item) => (
            <button
              key={item.key}
              className={activePage === item.key ? 'active' : ''}
              type="button"
              onClick={() => setActivePage(item.key)}
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

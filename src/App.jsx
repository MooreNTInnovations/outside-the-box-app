import LaunchPage from './pages/LaunchPage';
import SetupError from './components/SetupError';
import WorkspaceShell from './components/WorkspaceShell';
import { isSupabaseConfigured } from './config/env';
import { useAuth } from './hooks/useAuth';

const routeFromPath = () => {
  if (window.location.pathname === '/oauth/consent') {
    return 'oauth-consent';
  }

  return 'home';
};

const LoadingScreen = () => (
  <main className="loading-screen">
    <p>Loading secure workspace...</p>
  </main>
);

const App = () => {
  const auth = useAuth();

  if (!isSupabaseConfigured) {
    return <SetupError />;
  }

  if (auth.loading && !auth.session) {
    return <LoadingScreen />;
  }

  if (!auth.session) {
    return <LaunchPage auth={auth} />;
  }

  return <WorkspaceShell user={auth.user} signOut={auth.signOut} initialPage={routeFromPath()} />;
};

export default App;

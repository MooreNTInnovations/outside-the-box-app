import AuthForm from '../components/AuthForm';
import BrandMark from '../components/BrandMark';

const LaunchPage = ({ auth }) => {
  const handleSignIn = async ({ email, password }) => {
    await auth.signIn({ email, password });
  };

  const handleSignUp = async ({ email, password, fullName }) => {
    await auth.signUp({ email, password, fullName });
  };

  return (
    <main className="launch-screen">
      <section className="launch-panel">
        <div className="launch-copy">
          <BrandMark />
          <p className="launch-description">
            A secure professional innovation workspace for cross-disciplinary collaboration,
            project incubation, controlled discussion rooms, professional profiles, and future
            research workflows.
          </p>
          <p className="access-required">Secure professional access required.</p>
          {auth.authError && (
            <div className="auth-error" role="alert">
              {auth.authError}
            </div>
          )}
        </div>
        <div className="auth-grid">
          <AuthForm mode="signin" onSubmit={handleSignIn} disabled={auth.loading} />
          <AuthForm mode="signup" onSubmit={handleSignUp} disabled={auth.loading} />
        </div>
      </section>
    </main>
  );
};

export default LaunchPage;

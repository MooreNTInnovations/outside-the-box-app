import BrandMark from './BrandMark';
import { missingEnv } from '../config/env';

const SetupError = () => (
  <main className="launch-screen">
    <section className="launch-panel">
      <BrandMark />
      <div className="setup-error" role="alert">
        <h1>Supabase configuration required</h1>
        <p>
          OutSide the Box requires a configured Supabase project before authentication or
          workspace access can run.
        </p>
        <p>Missing environment variables: {missingEnv.join(', ')}</p>
      </div>
    </section>
  </main>
);

export default SetupError;

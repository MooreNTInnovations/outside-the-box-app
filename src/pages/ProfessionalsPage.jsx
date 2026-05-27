import { useEffect, useState } from 'react';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import { getProfiles } from '../services/profileService';

const ProfessionalsPage = () => {
  const [profiles, setProfiles] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    getProfiles().then(setProfiles).catch((err) => setError(err.message));
  }, []);

  return (
    <>
      <PageHeader title="Professionals" eyebrow="Professional Directory">
        Live professional profile records will appear here when available.
      </PageHeader>
      {error && <p className="service-error">{error}</p>}
      {profiles.length === 0 && <EmptyState />}
      <section className="record-grid">
        {profiles.map((profile) => (
          <article className="record-card" key={profile.id}>
            <div>
              <h2>{profile.full_name || profile.id}</h2>
              {profile.discipline && <span>{profile.discipline}</span>}
            </div>
            {profile.title && <p>{profile.title}</p>}
            {profile.organization && <p>{profile.organization}</p>}
            {profile.expertise_tags?.length > 0 && (
              <p>{profile.expertise_tags.join(', ')}</p>
            )}
          </article>
        ))}
      </section>
    </>
  );
};

export default ProfessionalsPage;

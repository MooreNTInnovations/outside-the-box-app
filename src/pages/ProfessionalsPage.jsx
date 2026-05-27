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
    </>
  );
};

export default ProfessionalsPage;

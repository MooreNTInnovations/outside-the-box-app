import { useEffect, useState } from 'react';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import { getHomeRecords } from '../services/homeService';

const HomePage = () => {
  const [records, setRecords] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    getHomeRecords().then(setRecords).catch((err) => setError(err.message));
  }, []);

  return (
    <>
      <PageHeader title="Home" eyebrow="Authenticated Workspace">
        Coordinate serious interdisciplinary work from verified live records.
      </PageHeader>
      {error && <p className="service-error">{error}</p>}
      {records.length === 0 && <EmptyState />}
    </>
  );
};

export default HomePage;

import { useEffect, useState } from 'react';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import { getReports } from '../services/moderationService';

const AdminPage = () => {
  const [reports, setReports] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    getReports().then(setReports).catch((err) => setError(err.message));
  }, []);

  return (
    <>
      <PageHeader title="Admin Moderation" eyebrow="Governance">
        Moderator tools require authorized role.
      </PageHeader>
      {error && <p className="service-error">{error}</p>}
      {reports.length === 0 && <EmptyState />}
    </>
  );
};

export default AdminPage;

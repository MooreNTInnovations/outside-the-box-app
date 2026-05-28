import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import { getHomeDashboard } from '../services/homeService';

const defaultDashboard = {
  profileCompletion: { completedFields: 0, totalFields: 6, percent: 0, isComplete: false },
  publicRoomsCount: 0,
  recentMessagesCount: 0,
  myProjectsCount: 0,
  myFilesCount: 0,
  pendingReportsCount: null,
  isModeratorOrAdmin: false,
};

const HomePage = ({ user }) => {
  const [dashboard, setDashboard] = useState(defaultDashboard);
  const [error, setError] = useState('');

  useEffect(() => {
    getHomeDashboard(user?.id)
      .then(setDashboard)
      .catch((err) => setError(err.message));
  }, [user?.id]);

  const cards = [
    {
      label: 'My profile completion',
      value: `${dashboard.profileCompletion.percent}%`,
      detail: `${dashboard.profileCompletion.completedFields} of ${dashboard.profileCompletion.totalFields} fields complete`,
    },
    {
      label: 'Public rooms available',
      value: dashboard.publicRoomsCount,
      detail: 'Live rooms visible under Supabase RLS',
    },
    {
      label: 'My recent messages',
      value: dashboard.recentMessagesCount,
      detail: 'Messages posted in the last 30 days',
    },
    {
      label: 'My projects',
      value: dashboard.myProjectsCount,
      detail: 'Projects connected through membership',
    },
    {
      label: 'My files',
      value: dashboard.myFilesCount,
      detail: 'File metadata records owned by you',
    },
  ];

  if (dashboard.isModeratorOrAdmin) {
    cards.push({
      label: 'Pending reports',
      value: dashboard.pendingReportsCount || 0,
      detail: 'Open moderation reports',
    });
  }

  const emptyStates = [
    !dashboard.profileCompletion.isComplete && 'Complete your profile',
    dashboard.publicRoomsCount === 0 && 'Open a public room',
    dashboard.myProjectsCount === 0 && 'Create your first project',
    dashboard.myFilesCount === 0 && 'Upload your first file',
    'Invite collaborators coming soon',
  ].filter(Boolean);

  return (
    <>
      <PageHeader title="Home" eyebrow="Authenticated Workspace">
        Coordinate serious interdisciplinary work from verified live records.
      </PageHeader>
      {error && <p className="service-error">{error}</p>}
      <section className="dashboard-grid">
        {cards.map((card) => (
          <article className="dashboard-card" key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <p>{card.detail}</p>
          </article>
        ))}
      </section>
      {emptyStates.length > 0 && (
        <section className="action-grid" aria-label="Workspace next steps">
          {emptyStates.map((state) => (
            <article className="action-card" key={state}>
              <p>{state}</p>
            </article>
          ))}
        </section>
      )}
    </>
  );
};

export default HomePage;

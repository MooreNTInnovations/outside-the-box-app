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

const HomePage = ({ user, onNavigate }) => {
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
      page: 'profile',
    },
    {
      label: 'Public rooms available',
      value: dashboard.publicRoomsCount,
      detail: 'Live rooms visible under Supabase RLS',
      page: 'collaboration-chat',
    },
    {
      label: 'My recent messages',
      value: dashboard.recentMessagesCount,
      detail: 'Messages posted in the last 30 days',
      page: 'collaboration-chat',
    },
    {
      label: 'My projects',
      value: dashboard.myProjectsCount,
      detail: 'Projects connected through membership',
      page: 'projects',
      target: 'create-project',
    },
    {
      label: 'My files',
      value: dashboard.myFilesCount,
      detail: 'File metadata records owned by you',
      page: 'files',
      target: 'upload-file',
    },
  ];

  if (dashboard.isModeratorOrAdmin) {
    cards.push({
      label: 'Pending reports',
      value: dashboard.pendingReportsCount || 0,
      detail: 'Open moderation reports',
      page: 'admin',
    });
  }

  const emptyStates = [
    !dashboard.profileCompletion.isComplete && {
      label: 'Complete your profile',
      page: 'profile',
    },
    dashboard.myProjectsCount === 0 && {
      label: 'Create or join a project',
      page: 'projects',
      target: 'create-project',
    },
    dashboard.recentMessagesCount === 0 && {
      label: 'Start a discussion in a public room',
      page: 'collaboration-chat',
    },
    dashboard.myFilesCount === 0 && {
      label: 'Upload project resources',
      page: 'files',
      target: 'upload-file',
    },
  ].filter(Boolean);

  return (
    <>
      <PageHeader title="Home" eyebrow="Authenticated Workspace">
        Coordinate serious interdisciplinary work from verified live records.
      </PageHeader>
      {error && <p className="service-error">{error}</p>}
      <section className="dashboard-grid">
        {cards.map((card) => (
          <button
            className="dashboard-card"
            key={card.label}
            type="button"
            onClick={() => onNavigate(card.page, card.target)}
          >
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <p>{card.detail}</p>
          </button>
        ))}
      </section>
      {emptyStates.length > 0 && (
        <section className="action-grid" aria-label="Workspace next steps">
          {emptyStates.map((state) => (
            <button
              className={state.disabled ? 'action-card coming-soon-card' : 'action-card'}
              disabled={state.disabled}
              key={state.label}
              type="button"
              onClick={() => !state.disabled && onNavigate(state.page, state.target)}
            >
              <p>{state.label}</p>
              {state.disabled && <span>Coming soon</span>}
            </button>
          ))}
        </section>
      )}
    </>
  );
};

export default HomePage;

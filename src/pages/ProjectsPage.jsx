import { useEffect, useState } from 'react';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import { getProjects } from '../services/projectService';

const ProjectsPage = () => {
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    getProjects().then(setProjects).catch((err) => setError(err.message));
  }, []);

  return (
    <>
      <PageHeader title="Projects" eyebrow="Project Incubation">
        Live project records will appear here when they exist in Supabase.
      </PageHeader>
      {error && <p className="service-error">{error}</p>}
      {projects.length === 0 && <EmptyState />}
    </>
  );
};

export default ProjectsPage;

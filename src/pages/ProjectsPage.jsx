import { useEffect, useRef, useState } from 'react';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import {
  createProject,
  getProjects,
  joinProject,
  leaveProject,
  subscribeToProjects,
} from '../services/projectService';

const ProjectsPage = ({ user, focusRequest }) => {
  const formRef = useRef(null);
  const nameInputRef = useRef(null);
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState({ name: '', summary: '', visibility: 'private' });
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  const loadProjects = () => {
    getProjects(user?.id).then(setProjects).catch((err) => setError(err.message));
  };

  useEffect(() => {
    loadProjects();
    return subscribeToProjects(loadProjects);
  }, [user?.id]);

  useEffect(() => {
    if (focusRequest?.page !== 'projects' || focusRequest?.target !== 'create-project') return;

    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    nameInputRef.current?.focus();
  }, [focusRequest]);

  const updateField = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    setError('');
    setStatus('');
    setSaving(true);
    try {
      await createProject({ ownerId: user?.id, ...form });
      setForm({ name: '', summary: '', visibility: 'private' });
      setStatus('Project created.');
      loadProjects();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleJoin = async (projectId) => {
    setError('');
    try {
      await joinProject({ projectId, userId: user?.id });
      loadProjects();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLeave = async (projectId) => {
    setError('');
    try {
      await leaveProject({ projectId, userId: user?.id });
      loadProjects();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <PageHeader title="Projects" eyebrow="Project Incubation">
        Live project records will appear here when they exist in Supabase.
      </PageHeader>
      {error && <p className="service-error">{error}</p>}
      {status && <p className="service-success">{status}</p>}
      <form
        aria-label="Create project"
        className="record-form"
        onSubmit={handleCreate}
        ref={formRef}
      >
        <label>
          Project name
          <input name="name" value={form.name} onChange={updateField} ref={nameInputRef} required />
        </label>
        <label>
          Summary
          <textarea name="summary" value={form.summary} onChange={updateField} rows="3" />
        </label>
        <label>
          Visibility
          <select name="visibility" value={form.visibility} onChange={updateField}>
            <option value="private">Private</option>
            <option value="discoverable">Discoverable</option>
            <option value="public">Public</option>
          </select>
        </label>
        <button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create Project'}</button>
      </form>
      {projects.length === 0 && <EmptyState />}
      <section className="record-grid">
        {projects.map((project) => (
          <article className="record-card" key={project.id}>
            <div>
              <h2>{project.name}</h2>
              <span>{project.visibility}</span>
            </div>
            {project.summary && <p>{project.summary}</p>}
            <div className="record-actions">
              {project.currentUserMembership ? (
                <button type="button" onClick={() => handleLeave(project.id)}>
                  Leave Project
                </button>
              ) : (
                <button type="button" onClick={() => handleJoin(project.id)}>
                  Join Project
                </button>
              )}
            </div>
          </article>
        ))}
      </section>
    </>
  );
};

export default ProjectsPage;

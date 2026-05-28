import { useEffect, useRef, useState } from 'react';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import {
  createProject,
  getProjectDetail,
  getProjects,
  joinProject,
  leaveProject,
  subscribeToProjectDetail,
  subscribeToProjects,
} from '../services/projectService';

const emptyDetail = {
  project: null,
  ownerLabel: '',
  members: [],
  memberCount: 0,
  currentUserMembership: null,
  files: [],
  discussionRoom: null,
  discussionMessages: [],
};

const ProjectsPage = ({ user, focusRequest }) => {
  const formRef = useRef(null);
  const nameInputRef = useRef(null);
  const workspaceRef = useRef(null);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [projectDetail, setProjectDetail] = useState(emptyDetail);
  const [form, setForm] = useState({ name: '', summary: '', visibility: 'private' });
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadProjects = () => {
    setLoading(true);
    getProjects(user?.id)
      .then((records) => {
        setProjects(records);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  const loadProjectDetail = (projectId) => {
    if (!projectId) return;

    setDetailLoading(true);
    getProjectDetail({ projectId, userId: user?.id })
      .then((detail) => {
        setProjectDetail(detail || emptyDetail);
        setDetailLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setDetailLoading(false);
      });
  };

  useEffect(() => {
    loadProjects();
    return subscribeToProjects(loadProjects);
  }, [user?.id]);

  useEffect(() => {
    if (!selectedProjectId) return undefined;

    loadProjectDetail(selectedProjectId);
    return subscribeToProjectDetail({
      projectId: selectedProjectId,
      onChange: () => loadProjectDetail(selectedProjectId),
    });
  }, [selectedProjectId, user?.id]);

  useEffect(() => {
    if (focusRequest?.page !== 'projects' || focusRequest?.target !== 'create-project') return;

    setSelectedProjectId(null);
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
      const project = await createProject({ ownerId: user?.id, ...form });
      setForm({ name: '', summary: '', visibility: 'private' });
      setStatus('Project created.');
      setSelectedProjectId(project?.id || null);
      loadProjects();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleJoin = async (projectId) => {
    setError('');
    setStatus('');
    try {
      await joinProject({ projectId, userId: user?.id });
      setStatus('Project joined.');
      loadProjects();
      loadProjectDetail(projectId);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLeave = async (projectId) => {
    setError('');
    setStatus('');
    try {
      await leaveProject({ projectId, userId: user?.id });
      setStatus('Project left.');
      loadProjects();
      loadProjectDetail(projectId);
    } catch (err) {
      setError(err.message);
    }
  };

  const openProject = (projectId) => {
    setError('');
    setStatus('');
    setSelectedProjectId(projectId);
  };

  const renderProjectList = () => (
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
          Description
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
      {loading && <p className="loading-note">Loading projects...</p>}
      {!loading && projects.length === 0 && <EmptyState />}
      <section className="record-grid">
        {projects.map((project) => (
          <article className="record-card project-card" key={project.id}>
            <div>
              <h2>{project.name}</h2>
              <span>{project.visibility}</span>
            </div>
            {project.summary && <p>{project.summary}</p>}
            <p>Created {new Date(project.created_at).toLocaleDateString()}</p>
            <div className="record-actions">
              <button type="button" onClick={() => openProject(project.id)}>
                Open Project
              </button>
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

  const renderProjectDetail = () => {
    const detail = projectDetail;
    const project = detail.project;
    const isMember = Boolean(detail.currentUserMembership);

    if (detailLoading) {
      return (
        <>
          <PageHeader title="Project" eyebrow="Project Workspace">
            Loading project workspace.
          </PageHeader>
          <p className="loading-note">Loading project records...</p>
        </>
      );
    }

    if (!project) {
      return (
        <>
          <PageHeader title="Project Not Found" eyebrow="Project Workspace">
            The selected project is not visible under the current Supabase policies.
          </PageHeader>
          {error && <p className="service-error">{error}</p>}
          <button type="button" onClick={() => setSelectedProjectId(null)}>
            Back to Projects
          </button>
        </>
      );
    }

    return (
      <>
        <PageHeader title={project.name} eyebrow="Project Workspace">
          {project.summary || 'No project description has been saved yet.'}
        </PageHeader>
        {error && <p className="service-error">{error}</p>}
        {status && <p className="service-success">{status}</p>}
        <section className="project-detail-grid">
          <article className="detail-panel">
            <h2>Project Details</h2>
            <dl className="detail-list">
              <div>
                <dt>Created</dt>
                <dd>{new Date(project.created_at).toLocaleString()}</dd>
              </div>
              <div>
                <dt>Owner</dt>
                <dd>{detail.ownerLabel}</dd>
              </div>
              <div>
                <dt>Membership</dt>
                <dd>{isMember ? detail.currentUserMembership.role : 'Not a member'}</dd>
              </div>
              <div>
                <dt>Member count</dt>
                <dd>{detail.memberCount}</dd>
              </div>
            </dl>
            <div className="record-actions">
              <button type="button" onClick={() => setSelectedProjectId(null)}>
                Back to Projects
              </button>
              {isMember ? (
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
          <article className="detail-panel">
            <h2>Project Actions</h2>
            <button
              type="button"
              disabled={!isMember}
              onClick={() => workspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            >
              Open Project
            </button>
            {!isMember && <p>Join this project to open its member workspace.</p>}
            {isMember && <p>Project workspace is open for live collaboration records.</p>}
          </article>
        </section>

        {!isMember && (
          <section className="detail-panel">
            <h2>Limited Preview</h2>
            <p>Join this project to view its discussion area, files, and member list.</p>
          </section>
        )}

        {isMember && (
          <section className="project-workspace" ref={workspaceRef}>
            <article className="detail-panel">
              <h2>Project Discussion</h2>
              {detail.discussionMessages.length === 0 && <EmptyState />}
              {detail.discussionMessages.map((message) => (
                <article className="message-item" key={message.id}>
                  <div>
                    <strong>{message.author_id === user?.id ? 'You' : message.author_id}</strong>
                    <time dateTime={message.created_at}>{new Date(message.created_at).toLocaleString()}</time>
                  </div>
                  <p>{message.body}</p>
                </article>
              ))}
            </article>
            <article className="detail-panel">
              <h2>Project Files</h2>
              {detail.files.length === 0 && <EmptyState />}
              {detail.files.map((file) => (
                <article className="record-card" key={file.id}>
                  <div>
                    <h3>{file.display_name || file.object_path}</h3>
                    <span>{file.bucket_id}</span>
                  </div>
                  <p>{file.object_path}</p>
                </article>
              ))}
            </article>
            <article className="detail-panel">
              <h2>Project Members</h2>
              {detail.members.length === 0 && <EmptyState />}
              {detail.members.map((member) => (
                <article className="member-row" key={`${member.project_id}-${member.user_id}`}>
                  <strong>{member.user_id}</strong>
                  <span>{member.role}</span>
                </article>
              ))}
            </article>
          </section>
        )}
      </>
    );
  };

  return selectedProjectId ? renderProjectDetail() : renderProjectList();
};

export default ProjectsPage;

import { useEffect, useRef, useState } from 'react';
import Avatar from '../components/Avatar';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import {
  createProject,
  getProjectDetail,
  getProjects,
  joinProject,
  leaveProject,
  postProjectMessage,
  subscribeToProjectDetail,
  subscribeToProjects,
} from '../services/projectService';
import { uploadWorkspaceFile } from '../services/fileService';
import { createModerationReport } from '../services/moderationService';

const emptyDetail = {
  project: null,
  ownerLabel: '',
  members: [],
  memberCount: 0,
  currentUserMembership: null,
  files: [],
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
  const [discussionDraft, setDiscussionDraft] = useState('');
  const [fileForm, setFileForm] = useState({ displayName: '' });
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [reportTarget, setReportTarget] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [postingMessage, setPostingMessage] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);

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

  const updateFileField = (event) => {
    setFileForm((current) => ({ ...current, [event.target.name]: event.target.value }));
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

  const handlePostMessage = async (event) => {
    event.preventDefault();
    setError('');
    setStatus('');
    setPostingMessage(true);
    try {
      await postProjectMessage({
        projectId: selectedProjectId,
        authorId: user?.id,
        body: discussionDraft,
      });
      setDiscussionDraft('');
      loadProjectDetail(selectedProjectId);
    } catch (err) {
      setError(err.message);
    } finally {
      setPostingMessage(false);
    }
  };

  const handleUploadProjectFile = async (event) => {
    event.preventDefault();
    setError('');
    setStatus('');
    setUploadingFile(true);
    try {
      await uploadWorkspaceFile({
        file: selectedFile,
        ownerId: user?.id,
        displayName: fileForm.displayName || selectedFile?.name,
        projectId: selectedProjectId,
      });
      setSelectedFile(null);
      setFileForm({ displayName: '' });
      setStatus('Project file uploaded.');
      loadProjectDetail(selectedProjectId);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingFile(false);
    }
  };

  const openProject = (projectId) => {
    setError('');
    setStatus('');
    setSelectedProjectId(projectId);
  };

  const submitReport = async (event) => {
    event.preventDefault();
    if (!reportTarget) return;

    setError('');
    setStatus('');
    try {
      await createModerationReport({
        reporterId: user?.id,
        targetType: reportTarget.type,
        targetId: reportTarget.id,
        projectId: selectedProjectId,
        reason: reportReason,
      });
      setReportTarget(null);
      setReportReason('');
      setStatus('Concern submitted for governance review.');
    } catch (err) {
      setError(err.message);
    }
  };

  const renderReportForm = () => {
    if (!reportTarget) return null;

    return (
      <form className="record-form compact-form" onSubmit={submitReport}>
        <label>
          Report a Concern
          <textarea
            value={reportReason}
            onChange={(event) => setReportReason(event.target.value)}
            rows="3"
            required
          />
        </label>
        <div className="record-actions">
          <button type="submit">Submit Concern</button>
          <button type="button" onClick={() => setReportTarget(null)}>
            Cancel
          </button>
        </div>
      </form>
    );
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
      {!loading && projects.length === 0 && <EmptyState message="Create or join a project." />}
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
    const isOwner = project?.owner_id === user?.id || detail.currentUserMembership?.role === 'owner';
    const isMember = Boolean(detail.currentUserMembership || isOwner);
    const membershipLabel = isOwner
      ? 'owner'
      : detail.currentUserMembership?.role || 'Not a member';

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
        <section className="project-header-panel">
          <dl className="detail-list project-meta-list">
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
              <dd>{membershipLabel}</dd>
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
              <button
                type="button"
                disabled={isOwner}
                onClick={() => handleLeave(project.id)}
                title={isOwner ? 'Project owners cannot leave until ownership transfer is available.' : undefined}
              >
                Leave Project
              </button>
            ) : (
              <button type="button" onClick={() => handleJoin(project.id)}>
                Join Project
              </button>
            )}
            <button type="button" onClick={() => setReportTarget({ type: 'project', id: project.id })}>
              Report a Concern
            </button>
          </div>
          {renderReportForm()}
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
              {detail.discussionMessages.length === 0 && (
                <EmptyState message="No project discussion messages yet." />
              )}
              <form className="composer project-composer" onSubmit={handlePostMessage}>
                <label>
                  Message
                  <textarea
                    value={discussionDraft}
                    onChange={(event) => setDiscussionDraft(event.target.value)}
                    rows="3"
                    required
                  />
                </label>
                <button type="submit" disabled={postingMessage}>
                  {postingMessage ? 'Posting...' : 'Post Project Message'}
                </button>
              </form>
              {detail.discussionMessages.map((message) => (
                <article className="message-item" key={message.id}>
                  <div className="message-meta">
                    <span className="avatar-label">
                      <Avatar profile={message.authorProfile} label={message.authorLabel} size="sm" />
                      <strong>{message.author_id === user?.id ? 'You' : message.authorLabel}</strong>
                    </span>
                    <time dateTime={message.created_at}>{new Date(message.created_at).toLocaleString()}</time>
                  </div>
                  <p>{message.body}</p>
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => setReportTarget({ type: 'message', id: message.id })}
                  >
                    Report a Concern
                  </button>
                </article>
              ))}
            </article>
            <article className="detail-panel">
              <h2>Project Files</h2>
              {detail.files.length === 0 && <EmptyState message="No project files uploaded yet." />}
              <form className="record-form compact-form" onSubmit={handleUploadProjectFile}>
                <label>
                  Upload file
                  <input
                    type="file"
                    onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                  />
                </label>
                <label>
                  Display name
                  <input name="displayName" value={fileForm.displayName} onChange={updateFileField} />
                </label>
                <button type="submit" disabled={uploadingFile || !selectedFile}>
                  {uploadingFile ? 'Uploading...' : 'Upload Project File'}
                </button>
              </form>
              {detail.files.map((file) => (
                <article className="record-card" key={file.id}>
                  <div>
                    <h3>{file.display_name || file.storage_path || file.object_path}</h3>
                    <span>{new Date(file.created_at).toLocaleDateString()}</span>
                  </div>
                  <p>{file.storage_path || file.object_path}</p>
                  {file.mime_type && <p>{file.mime_type}</p>}
                  {file.size_bytes != null && <p>{file.size_bytes} bytes</p>}
                  <p>Owner: {file.ownerLabel}</p>
                  <button
                    className="text-button"
                    type="button"
                    onClick={() => setReportTarget({ type: 'file', id: file.id })}
                  >
                    Report a Concern
                  </button>
                </article>
              ))}
            </article>
            <article className="detail-panel">
              <h2>Project Members ({detail.memberCount})</h2>
              {detail.members.length === 0 && <EmptyState message="No project members are visible yet." />}
              {detail.members.length === 1 && (
                <EmptyState message="Only one member currently in this project." />
              )}
              {detail.members.map((member) => (
                <article className="member-row" key={`${member.project_id}-${member.user_id}`}>
                  <span className="avatar-label">
                    <Avatar profile={member.profile} label={member.displayName} size="sm" />
                    <strong>{member.displayName}</strong>
                  </span>
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

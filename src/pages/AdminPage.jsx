import { useEffect, useMemo, useState } from 'react';
import Avatar from '../components/Avatar';
import BrandMark from '../components/BrandMark';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import RoleBadge from '../components/RoleBadge';
import {
  adminCreateRoom,
  adminDeleteRecord,
  adminRemoveProjectMembership,
  adminRemoveRoomMembership,
  adminSetProfileRole,
  adminSetProfileSuspension,
  adminUpdateProject,
  adminUpdateReportStatus,
  adminUpdateRoom,
  getAdminSnapshot,
} from '../services/adminService';

const emptySnapshot = {
  profiles: [],
  reports: [],
  projects: [],
  rooms: [],
  messages: [],
  roomMembers: [],
  projectMembers: [],
  files: [],
  adminActions: [],
};

const roleOptions = ['member', 'verified_professional', 'moderator', 'admin'];
const reportStatuses = ['open', 'reviewed', 'resolved', 'dismissed'];
const projectVisibilities = ['private', 'discoverable', 'public'];
const profileLabel = (profile) => profile?.full_name || profile?.email || 'Unavailable profile';
const recordLabel = (record, field = 'name') => record?.[field] || 'Unavailable record';

const targetLabel = (report, snapshot) => {
  if (report.target_type === 'room') return recordLabel(snapshot.rooms.find((room) => room.id === report.target_id));
  if (report.target_type === 'project') return recordLabel(snapshot.projects.find((project) => project.id === report.target_id));
  if (report.target_type === 'file') {
    const file = snapshot.files.find((item) => item.id === report.target_id);
    return file?.display_name || file?.storage_path?.split('/').pop() || 'Unavailable file';
  }
  if (report.target_type === 'message') {
    const message = snapshot.messages.find((item) => item.id === report.target_id);
    return message?.body ? `${message.body.slice(0, 48)}${message.body.length > 48 ? '...' : ''}` : 'Unavailable message';
  }
  if (['profile', 'user'].includes(report.target_type)) {
    return profileLabel(snapshot.profiles.find((profile) => profile.id === report.target_id));
  }
  return 'Unavailable record';
};

const AdminPage = ({ user, currentProfile }) => {
  const [snapshot, setSnapshot] = useState(emptySnapshot);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [roleEdits, setRoleEdits] = useState({});
  const [reportEdits, setReportEdits] = useState({});
  const [projectEdits, setProjectEdits] = useState({});
  const [roomEdits, setRoomEdits] = useState({});
  const [roomForm, setRoomForm] = useState({
    roomKey: '',
    name: '',
    description: '',
    isPublic: true,
  });

  const effectiveRole = snapshot.currentProfile?.role || currentProfile?.role;
  const isAdmin = effectiveRole === 'admin';

  const loadSnapshot = async () => {
    setError('');
    setLoading(true);
    const data = await getAdminSnapshot(user?.id);
    setSnapshot(data);
    setRoleEdits(
      Object.fromEntries((data.profiles || []).map((profile) => [profile.id, profile.role])),
    );
    setReportEdits(
      Object.fromEntries((data.reports || []).map((report) => [report.id, report.status])),
    );
    setProjectEdits(
      Object.fromEntries(
        (data.projects || []).map((project) => [
          project.id,
          {
            name: project.name || '',
            summary: project.summary || '',
            visibility: project.visibility,
          },
        ]),
      ),
    );
    setRoomEdits(
      Object.fromEntries(
        (data.rooms || []).map((room) => [
          room.id,
          {
            name: room.name || '',
            description: room.description || '',
            isPublic: room.is_public,
          },
        ]),
      ),
    );
    setLoading(false);
  };

  useEffect(() => {
    loadSnapshot().catch((err) => {
      setError(err.message);
      setLoading(false);
    });
  }, [user?.id]);

  const totals = useMemo(
    () => [
      { label: 'Users', value: snapshot.profiles.length },
      { label: 'Reports', value: snapshot.reports.length },
      { label: 'Projects', value: snapshot.projects.length },
      { label: 'Rooms', value: snapshot.rooms.length },
      { label: 'Messages', value: snapshot.messages.length },
      { label: 'Files', value: snapshot.files.length },
    ],
    [snapshot],
  );

  const runAction = async (action, successMessage) => {
    setError('');
    setStatus('');
    try {
      await action();
      setStatus(successMessage);
      await loadSnapshot();
    } catch (err) {
      setError(err.message);
    }
  };

  const confirmDestructive = (label) =>
    window.confirm(`${label}\n\nThis destructive admin action will be recorded in admin_actions.`);

  const createRoom = (event) => {
    event.preventDefault();
    runAction(
      () => adminCreateRoom(roomForm),
      'Room created and admin action recorded.',
    ).then(() =>
      setRoomForm({
        roomKey: '',
        name: '',
        description: '',
        isPublic: true,
      }),
    );
  };

  if (loading) {
    return (
      <>
        <div className="page-brand-strip">
          <BrandMark compact />
        </div>
        <PageHeader title="Admin" eyebrow="Governance">
          Loading authorized admin records.
        </PageHeader>
      </>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <div className="page-brand-strip">
          <BrandMark compact />
        </div>
        <PageHeader title="Admin" eyebrow="Governance">
          Admin page access requires admin role.
        </PageHeader>
        <EmptyState message="No admin records available for this account." />
      </>
    );
  }

  return (
    <>
      <div className="page-brand-strip">
        <BrandMark compact />
      </div>
      <PageHeader title="Admin" eyebrow="Governance">
        Full administrative controls connected to Supabase RLS and the profile role field.
      </PageHeader>
      {error && <p className="service-error">{error}</p>}
      {status && <p className="service-success">{status}</p>}

      <section className="dashboard-grid">
        {totals.map((total) => (
          <article className="dashboard-card" key={total.label}>
            <span>{total.label}</span>
            <strong>{total.value}</strong>
            <p>Live Supabase records</p>
          </article>
        ))}
      </section>

      <section className="admin-section">
        <h2>Reports</h2>
        {snapshot.reports.length === 0 && (
          <EmptyState message="No moderation activity currently requires review." />
        )}
        {snapshot.reports.map((report) => (
          <article className="admin-row" key={report.id}>
            <div>
              <strong>{targetLabel(report, snapshot)}</strong>
              <span>
                {report.target_type} | {report.reason}
                {report.rooms?.name ? ` | room ${report.rooms.name}` : ''}
                {report.projects?.name ? ` | project ${report.projects.name}` : ''}
              </span>
            </div>
            <select
              value={reportEdits[report.id] || report.status}
              onChange={(event) =>
                setReportEdits((current) => ({ ...current, [report.id]: event.target.value }))
              }
            >
              {reportStatuses.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() =>
                runAction(
                  () => adminUpdateReportStatus({ reportId: report.id, status: reportEdits[report.id] }),
                  'Report status updated and admin action recorded.',
                )
              }
            >
              Update
            </button>
            <button
              className="danger-button"
              type="button"
              onClick={() =>
                confirmDestructive('Delete this report?') &&
                runAction(
                  () => adminDeleteRecord({ targetType: 'report', targetId: report.id, notes: report.reason }),
                  'Report deleted and admin action recorded.',
                )
              }
            >
              Delete
            </button>
          </article>
        ))}
      </section>

      <section className="admin-section">
        <h2>Users And Roles</h2>
        {snapshot.profiles.map((profile) => (
          <article className="admin-row" key={profile.id}>
            <div>
              <span className="avatar-label">
                <Avatar profile={profile} label={profileLabel(profile)} size="sm" />
                <strong>{profileLabel(profile)}</strong>
              </span>
              <span>
                {profile.suspended_at ? 'Suspended' : 'Active'} | {profile.title || profile.discipline || 'Profile record'}
              </span>
            </div>
            <select
              disabled={!isAdmin}
              value={roleEdits[profile.id] || profile.role}
              onChange={(event) =>
                setRoleEdits((current) => ({ ...current, [profile.id]: event.target.value }))
              }
            >
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!isAdmin}
              onClick={() =>
                runAction(
                  () => adminSetProfileRole({ userId: profile.id, role: roleEdits[profile.id] }),
                  'User role updated and admin action recorded.',
                )
              }
            >
              Save Role
            </button>
            <button
              className={profile.suspended_at ? '' : 'danger-button'}
              type="button"
              disabled={!isAdmin}
              onClick={() =>
                runAction(
                  () =>
                    adminSetProfileSuspension({
                      userId: profile.id,
                      shouldSuspend: !profile.suspended_at,
                    }),
                  profile.suspended_at
                    ? 'User reactivated and admin action recorded.'
                    : 'User suspended and admin action recorded.',
                )
              }
            >
              {profile.suspended_at ? 'Reactivate' : 'Suspend'}
            </button>
          </article>
        ))}
      </section>

      <section className="admin-section">
          <h2>Rooms</h2>
          <form className="record-form" onSubmit={createRoom}>
            <label>
              Room key
              <input
                value={roomForm.roomKey}
                onChange={(event) => setRoomForm((current) => ({ ...current, roomKey: event.target.value }))}
                required
              />
            </label>
            <label>
              Name
              <input
                value={roomForm.name}
                onChange={(event) => setRoomForm((current) => ({ ...current, name: event.target.value }))}
                required
              />
            </label>
            <label>
              Description
              <input
                value={roomForm.description}
                onChange={(event) => setRoomForm((current) => ({ ...current, description: event.target.value }))}
              />
            </label>
            <label className="inline-control">
              <input
                type="checkbox"
                checked={roomForm.isPublic}
                onChange={(event) => setRoomForm((current) => ({ ...current, isPublic: event.target.checked }))}
              />
              Public room
            </label>
            <button type="submit">Create Room</button>
          </form>
          {snapshot.rooms.map((room) => (
            <article className="admin-row" key={room.id}>
              <input
                value={roomEdits[room.id]?.name || ''}
                onChange={(event) =>
                  setRoomEdits((current) => ({
                    ...current,
                    [room.id]: { ...current[room.id], name: event.target.value },
                  }))
                }
              />
              <input
                value={roomEdits[room.id]?.description || ''}
                onChange={(event) =>
                  setRoomEdits((current) => ({
                    ...current,
                    [room.id]: { ...current[room.id], description: event.target.value },
                  }))
                }
              />
              <label className="inline-control">
                <input
                  type="checkbox"
                checked={Boolean(roomEdits[room.id]?.isPublic)}
                  onChange={(event) =>
                    setRoomEdits((current) => ({
                      ...current,
                      [room.id]: { ...current[room.id], isPublic: event.target.checked },
                    }))
                  }
                />
                Public
              </label>
              <span>{room.archived_at ? 'Archived' : room.visibility || (room.is_public ? 'public' : 'private')}</span>
              <button
                type="button"
                onClick={() =>
                  runAction(
                    () => adminUpdateRoom({ roomId: room.id, ...roomEdits[room.id] }),
                    'Room updated and admin action recorded.',
                  )
                }
              >
                Save
              </button>
              <button
                className="danger-button"
                type="button"
                disabled={room.is_system}
                onClick={() =>
                  confirmDestructive('Delete this room? System rooms are protected.') &&
                  runAction(
                    () => adminDeleteRecord({ targetType: 'room', targetId: room.id, notes: room.name }),
                    'Room deleted and admin action recorded.',
                  )
                }
              >
                Delete
              </button>
            </article>
          ))}
      </section>

      <section className="admin-section">
          <h2>Projects</h2>
          {snapshot.projects.map((project) => (
            <article className="admin-row" key={project.id}>
              <input
                value={projectEdits[project.id]?.name || ''}
                onChange={(event) =>
                  setProjectEdits((current) => ({
                    ...current,
                    [project.id]: { ...current[project.id], name: event.target.value },
                  }))
                }
              />
              <select
                value={projectEdits[project.id]?.visibility || project.visibility}
                onChange={(event) =>
                  setProjectEdits((current) => ({
                    ...current,
                    [project.id]: { ...current[project.id], visibility: event.target.value },
                  }))
                }
              >
                {projectVisibilities.map((visibility) => (
                  <option key={visibility} value={visibility}>
                    {visibility}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() =>
                  runAction(
                    () => adminUpdateProject({ projectId: project.id, ...projectEdits[project.id] }),
                    'Project updated and admin action recorded.',
                  )
                }
              >
                Save
              </button>
              <button
                className="danger-button"
                type="button"
                onClick={() =>
                  confirmDestructive('Delete this project?') &&
                  runAction(
                    () => adminDeleteRecord({ targetType: 'project', targetId: project.id, notes: project.name }),
                    'Project deleted and admin action recorded.',
                  )
                }
              >
                Delete
              </button>
            </article>
          ))}
      </section>

      <section className="admin-section">
          <h2>Messages, Memberships, And Files</h2>
          {snapshot.messages.map((message) => (
            <article className="admin-row" key={message.id}>
              <div>
                <strong>Message</strong>
                <span>
                  {profileLabel(message.profiles)} | {message.rooms?.name || 'Project discussion'} | {message.body}
                </span>
              </div>
              <button
                className="danger-button"
                type="button"
                onClick={() =>
                  confirmDestructive('Delete this message?') &&
                  runAction(
                    () => adminDeleteRecord({ targetType: 'message', targetId: message.id, notes: message.body }),
                    'Message deleted and admin action recorded.',
                  )
                }
              >
                Delete
              </button>
            </article>
          ))}
          {snapshot.roomMembers.map((member) => (
            <article className="admin-row" key={`${member.room_id}-${member.user_id}`}>
              <div>
                <span className="avatar-label">
                  <Avatar profile={member.profiles} label={profileLabel(member.profiles)} size="sm" />
                  <strong>{profileLabel(member.profiles)}</strong>
                </span>
                <span>{member.rooms?.name || 'Unavailable room'} | <RoleBadge role={member.role} /></span>
              </div>
              <button
                className="danger-button"
                type="button"
                onClick={() =>
                  confirmDestructive('Remove this room membership?') &&
                  runAction(
                    () =>
                      adminRemoveRoomMembership({
                        roomId: member.room_id,
                        userId: member.user_id,
                        notes: member.role,
                      }),
                    'Room membership removed and admin action recorded.',
                  )
                }
              >
                Remove
              </button>
            </article>
          ))}
          {snapshot.projectMembers.map((member) => (
            <article className="admin-row" key={`${member.project_id}-${member.user_id}`}>
              <div>
                <span className="avatar-label">
                  <Avatar profile={member.profiles} label={profileLabel(member.profiles)} size="sm" />
                  <strong>{profileLabel(member.profiles)}</strong>
                </span>
                <span>{member.projects?.name || 'Unavailable project'} | <RoleBadge role={member.role} /></span>
              </div>
              <button
                className="danger-button"
                type="button"
                onClick={() =>
                  confirmDestructive('Remove this project membership?') &&
                  runAction(
                    () =>
                      adminRemoveProjectMembership({
                        projectId: member.project_id,
                        userId: member.user_id,
                        notes: member.role,
                      }),
                    'Project membership removed and admin action recorded.',
                  )
                }
              >
                Remove
              </button>
            </article>
          ))}
          {snapshot.files.map((file) => (
            <article className="admin-row" key={file.id}>
              <div>
                <strong>{file.display_name || file.storage_path?.split('/').pop() || 'File record'}</strong>
                <span>{profileLabel(file.profiles)} | {file.projects?.name || file.rooms?.name || 'Personal upload'}</span>
              </div>
              <button
                className="danger-button"
                type="button"
                onClick={() =>
                  confirmDestructive('Delete this file metadata record?') &&
                  runAction(
                    () =>
                      adminDeleteRecord({
                        targetType: 'file',
                        targetId: file.id,
                        notes: file.storage_path || file.object_path,
                      }),
                    'File metadata deleted and admin action recorded.',
                  )
                }
              >
                Delete
              </button>
            </article>
          ))}
      </section>

      <section className="admin-section">
        <h2>Admin Actions</h2>
        {snapshot.adminActions.length === 0 && (
          <EmptyState message="No moderation activity currently requires review." />
        )}
        {snapshot.adminActions.map((action) => (
          <article className="admin-row" key={action.id}>
            <div>
              <strong>{action.action_type}</strong>
              <span>
                {profileLabel(action.actor)} | {action.target_type}
                {action.target_user ? ` | ${profileLabel(action.target_user)}` : ''}
              </span>
            </div>
            <time dateTime={action.created_at}>{new Date(action.created_at).toLocaleString()}</time>
          </article>
        ))}
      </section>
    </>
  );
};

export default AdminPage;

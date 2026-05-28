import { useEffect, useState } from 'react';
import Avatar from '../components/Avatar';
import BrandMark from '../components/BrandMark';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import {
  createModerationReport,
  getReports,
  updateModerationReportStatus,
} from '../services/moderationService';

const reportTargets = ['message', 'room', 'project', 'profile', 'file', 'user'];
const moderatorStatuses = ['open', 'reviewed'];
const profileLabel = (profile) => profile?.full_name || profile?.email || 'Unavailable profile';
const reportContext = (report) => report.rooms?.name || report.projects?.name || 'Context not attached';

const ModeratorPage = ({ user, currentProfile }) => {
  const [reports, setReports] = useState([]);
  const [reportEdits, setReportEdits] = useState({});
  const [form, setForm] = useState({
    targetType: 'message',
    targetId: '',
    roomId: '',
    projectId: '',
    reason: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const canUseModeratorPage =
    currentProfile?.role === 'moderator' || currentProfile?.role === 'admin';

  const loadReports = () => {
    setError('');
    setLoading(true);
    getReports()
      .then((records) => {
        setReports(records);
        setReportEdits(Object.fromEntries(records.map((report) => [report.id, report.status])));
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!canUseModeratorPage) {
      setLoading(false);
      return;
    }

    loadReports();
  }, [canUseModeratorPage]);

  const updateField = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const submitConcern = async (event) => {
    event.preventDefault();
    setError('');
    setStatus('');

    try {
      await createModerationReport({
        reporterId: user?.id,
        targetType: form.targetType,
        targetId: form.targetId,
        roomId: form.roomId || null,
        projectId: form.projectId || null,
        reason: form.reason,
      });
      setForm({ targetType: 'message', targetId: '', roomId: '', projectId: '', reason: '' });
      setStatus('Concern reported for admin and moderator review.');
      loadReports();
    } catch (err) {
      setError(err.message);
    }
  };

  const updateReport = async (reportId) => {
    setError('');
    setStatus('');

    try {
      await updateModerationReportStatus({ reportId, status: reportEdits[reportId] });
      setStatus('Report status updated.');
      loadReports();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!canUseModeratorPage) {
    return (
      <>
        <div className="page-brand-strip">
          <BrandMark compact />
        </div>
        <PageHeader title="Moderator" eyebrow="Governance">
          Moderator access requires moderator or admin role.
        </PageHeader>
        <EmptyState message="No moderator records available for this account." />
      </>
    );
  }

  return (
    <>
      <div className="page-brand-strip">
        <BrandMark compact />
      </div>
      <PageHeader title="Moderator" eyebrow="Governance">
        Review visible reports and send concerns to admins without full administrative privileges.
      </PageHeader>
      {error && <p className="service-error">{error}</p>}
      {status && <p className="service-success">{status}</p>}

      <section className="admin-section">
        <h2>Report a Concern</h2>
        <form className="record-form compact-form" onSubmit={submitConcern}>
          <label>
            Target type
            <select name="targetType" value={form.targetType} onChange={updateField}>
              {reportTargets.map((target) => (
                <option key={target} value={target}>
                  {target}
                </option>
              ))}
            </select>
          </label>
          <label>
            Target ID
            <input name="targetId" value={form.targetId} onChange={updateField} required />
          </label>
          <label>
            Room ID
            <input name="roomId" value={form.roomId} onChange={updateField} />
          </label>
          <label>
            Project ID
            <input name="projectId" value={form.projectId} onChange={updateField} />
          </label>
          <label>
            Concern
            <textarea name="reason" value={form.reason} onChange={updateField} rows="3" required />
          </label>
          <button type="submit">Submit Concern</button>
        </form>
      </section>

      <section className="admin-section">
        <h2>Visible Reports</h2>
        {loading && <p className="loading-note">Loading reports...</p>}
        {!loading && reports.length === 0 && (
          <EmptyState message="No moderation activity currently requires review." />
        )}
        {reports.map((report) => (
          <article className="admin-row" key={report.id}>
            <div>
              <span className="avatar-label">
                <Avatar profile={report.reporter} label={profileLabel(report.reporter)} size="sm" />
                <strong>{report.target_type}</strong>
              </span>
              <span>
                {profileLabel(report.reporter)} | {reportContext(report)} | {report.reason}
              </span>
            </div>
            <select
              value={reportEdits[report.id] || report.status}
              onChange={(event) =>
                setReportEdits((current) => ({ ...current, [report.id]: event.target.value }))
              }
            >
              {moderatorStatuses.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <button type="button" onClick={() => updateReport(report.id)}>
              Update
            </button>
          </article>
        ))}
      </section>
    </>
  );
};

export default ModeratorPage;

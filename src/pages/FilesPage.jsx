import { useEffect, useRef, useState } from 'react';
import EmptyState from '../components/EmptyState';
import FileRecord from '../components/FileRecord';
import PageHeader from '../components/PageHeader';
import { acceptedUploadTypes, getFiles, subscribeToFiles, uploadWorkspaceFile } from '../services/fileService';
import { createModerationReport } from '../services/moderationService';

const FilesPage = ({ user, focusRequest }) => {
  const formRef = useRef(null);
  const fileInputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [form, setForm] = useState({ displayName: '', roomId: '', projectId: '' });
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [reportTarget, setReportTarget] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [saving, setSaving] = useState(false);

  const loadFiles = () => {
    getFiles().then(setFiles).catch((err) => setError(err.message));
  };

  useEffect(() => {
    loadFiles();
    return subscribeToFiles(loadFiles);
  }, []);

  useEffect(() => {
    if (focusRequest?.page !== 'files' || focusRequest?.target !== 'upload-file') return;

    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    fileInputRef.current?.focus();
  }, [focusRequest]);

  const updateField = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setStatus('');
    setSaving(true);
    try {
      await uploadWorkspaceFile({
        file: selectedFile,
        ownerId: user?.id,
        displayName: form.displayName || selectedFile?.name,
        roomId: form.roomId || null,
        projectId: form.projectId || null,
      });
      setForm({ displayName: '', roomId: '', projectId: '' });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setStatus('File uploaded.');
      loadFiles();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const submitReport = async (event) => {
    event.preventDefault();
    if (!reportTarget) return;

    setError('');
    setStatus('');
    try {
      await createModerationReport({
        reporterId: user?.id,
        targetType: 'file',
        targetId: reportTarget.id,
        projectId: reportTarget.project_id,
        roomId: reportTarget.room_id,
        reason: reportReason,
      });
      setReportTarget(null);
      setReportReason('');
      setStatus('Concern submitted for governance review.');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <PageHeader title="Shared Files" eyebrow="Storage-Ready Metadata">
        Live file records from the configured Supabase bucket will appear here.
      </PageHeader>
      {error && <p className="service-error">{error}</p>}
      {status && <p className="service-success">{status}</p>}
      {reportTarget && (
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
      )}
      <form
        aria-label="Upload file metadata"
        className="record-form"
        onSubmit={handleSubmit}
        ref={formRef}
      >
        <label>
          Upload file
          <input
            accept={acceptedUploadTypes}
            type="file"
            onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
            ref={fileInputRef}
          />
        </label>
        <label>
          Display name
          <input name="displayName" value={form.displayName} onChange={updateField} />
        </label>
        <label>
          Room ID
          <input name="roomId" value={form.roomId} onChange={updateField} />
        </label>
        <label>
          Project ID
          <input name="projectId" value={form.projectId} onChange={updateField} />
        </label>
        <button type="submit" disabled={saving || !selectedFile}>
          {saving ? 'Uploading...' : 'Upload File'}
        </button>
      </form>
      {files.length === 0 && <EmptyState message="No shared files available yet." />}
      <section className="record-grid">
        {files.map((file) => (
          <FileRecord file={file} key={file.id} onReport={setReportTarget} />
        ))}
      </section>
    </>
  );
};

export default FilesPage;

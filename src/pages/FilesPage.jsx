import { useEffect, useRef, useState } from 'react';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import { createFileMetadata, getFiles, subscribeToFiles, uploadFileToStorage } from '../services/fileService';

const FilesPage = ({ user, focusRequest }) => {
  const formRef = useRef(null);
  const fileInputRef = useRef(null);
  const [files, setFiles] = useState([]);
  const [form, setForm] = useState({ objectPath: '', displayName: '', roomId: '', projectId: '' });
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
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
      let objectPath = form.objectPath;

      if (selectedFile) {
        objectPath = objectPath || `${user.id}/${Date.now()}-${selectedFile.name}`;
        await uploadFileToStorage({ file: selectedFile, objectPath });
      }

      await createFileMetadata({
        ownerId: user?.id,
        objectPath,
        displayName: form.displayName || selectedFile?.name || objectPath,
        roomId: form.roomId,
        projectId: form.projectId,
      });
      setForm({ objectPath: '', displayName: '', roomId: '', projectId: '' });
      setSelectedFile(null);
      setStatus('File metadata saved.');
      loadFiles();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Shared Files" eyebrow="Storage-Ready Metadata">
        Live file records from the configured Supabase bucket will appear here.
      </PageHeader>
      {error && <p className="service-error">{error}</p>}
      {status && <p className="service-success">{status}</p>}
      <form
        aria-label="Upload file metadata"
        className="record-form"
        onSubmit={handleSubmit}
        ref={formRef}
      >
        <label>
          Upload file
          <input
            type="file"
            onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
            ref={fileInputRef}
          />
        </label>
        <label>
          Storage object path
          <input name="objectPath" value={form.objectPath} onChange={updateField} />
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
        <button type="submit" disabled={saving || (!selectedFile && !form.objectPath)}>
          {saving ? 'Saving...' : 'Save File Metadata'}
        </button>
      </form>
      {files.length === 0 && <EmptyState />}
      <section className="record-grid">
        {files.map((file) => (
          <article className="record-card" key={file.id}>
            <div>
              <h2>{file.display_name || file.object_path}</h2>
              <span>{file.bucket_id}</span>
            </div>
            <p>{file.object_path}</p>
          </article>
        ))}
      </section>
    </>
  );
};

export default FilesPage;

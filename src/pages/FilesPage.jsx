import { useEffect, useState } from 'react';
import EmptyState from '../components/EmptyState';
import PageHeader from '../components/PageHeader';
import { getFiles } from '../services/fileService';

const FilesPage = () => {
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    getFiles().then(setFiles).catch((err) => setError(err.message));
  }, []);

  return (
    <>
      <PageHeader title="Shared Files" eyebrow="Storage-Ready Metadata">
        Live file records from the configured Supabase bucket will appear here.
      </PageHeader>
      {error && <p className="service-error">{error}</p>}
      {files.length === 0 && <EmptyState />}
    </>
  );
};

export default FilesPage;

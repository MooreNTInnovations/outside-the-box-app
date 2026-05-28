import { useEffect, useState } from 'react';
import {
  classifyFile,
  createSignedFileUrl,
  formatFileSize,
  getFileStoragePath,
} from '../services/fileService';

const FileRecord = ({ file, ownerLabel, onReport }) => {
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [openError, setOpenError] = useState('');
  const [opening, setOpening] = useState(false);
  const category = classifyFile(file);
  const storagePath = getFileStoragePath(file);
  const displayName = file.display_name || storagePath || 'File record';
  const uploader = ownerLabel || file.ownerLabel || file.profiles?.full_name || file.profiles?.email || file.owner_id;

  useEffect(() => {
    let isMounted = true;

    if (category !== 'Image' || !storagePath) {
      setThumbnailUrl('');
      return () => {
        isMounted = false;
      };
    }

    createSignedFileUrl(file, 300)
      .then((signedUrl) => {
        if (isMounted) setThumbnailUrl(signedUrl);
      })
      .catch(() => {
        if (isMounted) setThumbnailUrl('');
      });

    return () => {
      isMounted = false;
    };
  }, [category, file, storagePath]);

  const openFile = async () => {
    setOpenError('');
    setOpening(true);
    try {
      const signedUrl = await createSignedFileUrl(file);
      if (!signedUrl) throw new Error('Unable to create a secure file link.');
      window.open(signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setOpenError(err.message || 'Unable to open this file.');
    } finally {
      setOpening(false);
    }
  };

  return (
    <article className="record-card file-card">
      {thumbnailUrl && <img className="file-thumbnail" src={thumbnailUrl} alt="" />}
      <div>
        <h2>
          <button className="profile-name-button" type="button" onClick={openFile}>
            {displayName}
          </button>
        </h2>
        <span>{category}</span>
      </div>
      {category === 'Video' && <p>Video file</p>}
      <p>{storagePath}</p>
      <p>{formatFileSize(file.size_bytes)}</p>
      {file.mime_type && <p>{file.mime_type}</p>}
      <p>Uploaded {new Date(file.created_at).toLocaleString()}</p>
      {uploader && <p>Uploader: {uploader}</p>}
      {openError && <p className="service-error">{openError}</p>}
      <div className="record-actions">
        <button type="button" onClick={openFile} disabled={opening || !storagePath}>
          {opening ? 'Opening...' : 'Open/View'}
        </button>
        {onReport && (
          <button className="text-button" type="button" onClick={() => onReport(file)}>
            Report a Concern
          </button>
        )}
      </div>
    </article>
  );
};

export default FileRecord;

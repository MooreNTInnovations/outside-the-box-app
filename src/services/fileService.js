import { env } from '../config/env';
import { supabase } from './supabaseClient';

const fileColumns =
  'id, bucket_id, object_path, storage_path, display_name, mime_type, size_bytes, owner_id, room_id, project_id, created_at, profiles:owner_id(id, full_name, email, avatar_path)';

const megabyte = 1024 * 1024;

const uploadRules = {
  Document: {
    extensions: ['pdf', 'doc', 'docx', 'txt'],
    mimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ],
    maxBytes: 25 * megabyte,
  },
  Image: {
    extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    maxBytes: 10 * megabyte,
  },
  Video: {
    extensions: ['mp4', 'mov', 'webm'],
    mimeTypes: ['video/mp4', 'video/quicktime', 'video/webm'],
    maxBytes: 250 * megabyte,
  },
  Spreadsheet: {
    extensions: ['xls', 'xlsx', 'csv'],
    mimeTypes: [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv',
      'application/csv',
    ],
    maxBytes: 25 * megabyte,
  },
  Presentation: {
    extensions: ['ppt', 'pptx'],
    mimeTypes: [
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
    maxBytes: 25 * megabyte,
  },
};

const acceptedUploadTypes = Object.values(uploadRules)
  .flatMap((rule) => [
    ...rule.mimeTypes,
    ...rule.extensions.map((extension) => `.${extension}`),
  ])
  .join(',');

const getExtension = (fileName = '') => fileName.split('.').pop()?.toLowerCase() || '';

const formatFileSize = (bytes) => {
  if (bytes == null) return 'Size not recorded';
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < megabyte) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / megabyte).toFixed(1)} MB`;
};

const classifyFile = (fileOrRecord) => {
  const mimeType = fileOrRecord?.type || fileOrRecord?.mime_type || '';
  const name = fileOrRecord?.name || fileOrRecord?.display_name || fileOrRecord?.storage_path || fileOrRecord?.object_path || '';
  const extension = getExtension(name);

  const matchedCategory = Object.entries(uploadRules).find(([, rule]) =>
    rule.mimeTypes.includes(mimeType) || rule.extensions.includes(extension),
  );

  return matchedCategory?.[0] || 'Other';
};

const validateUploadFile = (file) => {
  if (!file) throw new Error('Choose a file to upload.');

  const category = classifyFile(file);
  const rule = uploadRules[category];
  if (!rule) {
    throw new Error('Unsupported file type. Upload a document, image, video, spreadsheet, or presentation file.');
  }

  if (file.size > rule.maxBytes) {
    throw new Error(`${category} files must be ${formatFileSize(rule.maxBytes)} or smaller.`);
  }

  return category;
};

const safeFileName = (fileName) => {
  const cleaned = fileName
    .normalize('NFKD')
    .replace(/[^\w.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  return cleaned || 'file';
};

const buildStoragePath = ({ ownerId, projectId, roomId, file }) => {
  const timestamp = Date.now();
  const safeName = safeFileName(file.name);

  if (projectId) return `projects/${projectId}/${timestamp}-${safeName}`;
  if (roomId) return `rooms/${roomId}/${timestamp}-${safeName}`;
  return `uploads/${ownerId}/${timestamp}-${safeName}`;
};

const getFiles = async () => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('files')
    .select(fileColumns)
    .eq('bucket_id', env.filesBucket)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map((file) => ({
    ...file,
    ownerLabel: file.profiles?.full_name || file.profiles?.email || 'Uploader unavailable',
  }));
};

const createFileMetadata = async ({
  ownerId,
  storagePath,
  displayName,
  roomId,
  projectId,
  mimeType,
  sizeBytes,
}) => {
  if (!supabase || !ownerId) return null;

  const cleanedPath = storagePath.trim();
  if (!cleanedPath) return null;

  const { data, error } = await supabase
    .from('files')
    .insert({
      bucket_id: env.filesBucket,
      object_path: cleanedPath,
      storage_path: cleanedPath,
      display_name: displayName?.trim() || cleanedPath,
      mime_type: mimeType || null,
      size_bytes: sizeBytes ?? null,
      owner_id: ownerId,
      room_id: roomId || null,
      project_id: projectId || null,
    })
    .select(fileColumns)
    .single();

  if (error) throw error;
  return data;
};

const uploadFileToStorage = async ({ file, storagePath }) => {
  if (!supabase || !file || !storagePath) return null;

  const { data, error } = await supabase.storage.from(env.filesBucket).upload(storagePath, file, {
    contentType: file.type || undefined,
    upsert: false,
  });

  if (error) throw error;
  return data;
};

const uploadWorkspaceFile = async ({ file, ownerId, displayName, roomId, projectId }) => {
  if (!supabase || !ownerId || !file) return null;

  validateUploadFile(file);
  const storagePath = buildStoragePath({ ownerId, projectId, roomId, file });
  await uploadFileToStorage({ file, storagePath });

  return createFileMetadata({
    ownerId,
    storagePath,
    displayName: displayName || file.name,
    roomId,
    projectId,
    mimeType: file.type || null,
    sizeBytes: file.size,
  });
};

const getFileStoragePath = (fileRecord) => fileRecord?.storage_path || fileRecord?.object_path || '';

const createSignedFileUrl = async (fileRecord, expiresIn = 300) => {
  if (!supabase) throw new Error('Supabase is not configured.');

  const storagePath = getFileStoragePath(fileRecord);
  if (!storagePath) {
    throw new Error('No storage path is recorded for this file.');
  }

  const { data, error } = await supabase.storage
    .from(fileRecord.bucket_id || env.filesBucket)
    .createSignedUrl(storagePath, expiresIn);

  if (error) {
    throw new Error(`Unable to create a secure file link: ${error.message}`);
  }

  return data?.signedUrl || '';
};

const subscribeToFiles = (onChange) => {
  if (!supabase) return () => {};

  const channel = supabase
    .channel('files:workspace')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'files' }, onChange)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

export {
  acceptedUploadTypes,
  buildStoragePath,
  classifyFile,
  createFileMetadata,
  createSignedFileUrl,
  formatFileSize,
  getFileStoragePath,
  getFiles,
  subscribeToFiles,
  uploadFileToStorage,
  uploadWorkspaceFile,
  validateUploadFile,
};

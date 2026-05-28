import { env } from '../config/env';
import { supabase } from './supabaseClient';

const fileColumns =
  'id, bucket_id, object_path, storage_path, display_name, mime_type, size_bytes, owner_id, room_id, project_id, created_at';

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
  return data || [];
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
  buildStoragePath,
  createFileMetadata,
  getFiles,
  subscribeToFiles,
  uploadFileToStorage,
  uploadWorkspaceFile,
};

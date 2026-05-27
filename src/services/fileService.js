import { env } from '../config/env';
import { supabase } from './supabaseClient';

const getFiles = async () => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('files')
    .select('id, bucket_id, object_path, display_name, owner_id, room_id, project_id, created_at')
    .eq('bucket_id', env.filesBucket)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

const createFileMetadata = async ({ ownerId, objectPath, displayName, roomId, projectId }) => {
  if (!supabase || !ownerId) return null;

  const cleanedPath = objectPath.trim();
  if (!cleanedPath) return null;

  const { data, error } = await supabase
    .from('files')
    .insert({
      bucket_id: env.filesBucket,
      object_path: cleanedPath,
      display_name: displayName.trim() || cleanedPath,
      owner_id: ownerId,
      room_id: roomId || null,
      project_id: projectId || null,
    })
    .select('id, bucket_id, object_path, display_name, owner_id, room_id, project_id, created_at')
    .single();

  if (error) throw error;
  return data;
};

const uploadFileToStorage = async ({ file, objectPath }) => {
  if (!supabase || !file || !objectPath) return null;

  const { data, error } = await supabase.storage.from(env.filesBucket).upload(objectPath, file, {
    upsert: false,
  });

  if (error) throw error;
  return data;
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

export { createFileMetadata, getFiles, subscribeToFiles, uploadFileToStorage };

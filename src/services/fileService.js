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

export { getFiles };

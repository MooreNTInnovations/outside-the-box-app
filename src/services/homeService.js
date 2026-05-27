import { supabase } from './supabaseClient';

const getHomeRecords = async () => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('projects')
    .select('id, name, summary, visibility, updated_at')
    .limit(10);

  if (error) throw error;
  return data || [];
};

export { getHomeRecords };

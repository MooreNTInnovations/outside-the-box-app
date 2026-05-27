import { supabase } from './supabaseClient';

const getProjects = async () => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('projects')
    .select('id, name, summary, visibility, owner_id, created_at, updated_at')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export { getProjects };

import { supabase } from './supabaseClient';

const getReports = async () => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('reports')
    .select('id, reporter_id, target_type, target_id, reason, status, created_at')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export { getReports };

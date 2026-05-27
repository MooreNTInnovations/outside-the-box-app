import { supabase } from './supabaseClient';

const getProfiles = async () => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, title, organization, discipline, updated_at')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

const getCurrentProfile = async (userId) => {
  if (!supabase || !userId) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, title, organization, discipline, bio, updated_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
};

const updateCurrentProfile = async (userId, updates) => {
  if (!supabase || !userId) return null;

  const safeUpdates = {
    full_name: updates.fullName || null,
    title: updates.title || null,
    organization: updates.organization || null,
    discipline: updates.discipline || null,
    bio: updates.bio || null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('profiles')
    .update(safeUpdates)
    .eq('id', userId)
    .select('id, full_name, title, organization, discipline, bio, updated_at')
    .single();

  if (error) throw error;
  return data;
};

export { getCurrentProfile, getProfiles, updateCurrentProfile };

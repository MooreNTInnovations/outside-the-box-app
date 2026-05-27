import { supabase } from './supabaseClient';

const getProjects = async (userId) => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('projects')
    .select('id, name, summary, visibility, owner_id, created_at, updated_at, project_members(user_id, role)')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data || []).map((project) => ({
    ...project,
    currentUserMembership:
      project.project_members?.find((membership) => membership.user_id === userId) || null,
  }));
};

const createProject = async ({ ownerId, name, summary, visibility }) => {
  if (!supabase || !ownerId) return null;

  const cleanedName = name.trim();
  if (!cleanedName) return null;

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      owner_id: ownerId,
      name: cleanedName,
      summary: summary.trim() || null,
      visibility,
    })
    .select('id, name, summary, visibility, owner_id, created_at, updated_at')
    .single();

  if (projectError) throw projectError;

  const { error: membershipError } = await supabase.from('project_members').insert({
    project_id: project.id,
    user_id: ownerId,
    role: 'owner',
  });

  if (membershipError) throw membershipError;
  return project;
};

const joinProject = async ({ projectId, userId }) => {
  if (!supabase || !projectId || !userId) return null;

  const { data, error } = await supabase
    .from('project_members')
    .upsert(
      {
        project_id: projectId,
        user_id: userId,
        role: 'member',
      },
      { onConflict: 'project_id,user_id', ignoreDuplicates: true },
    )
    .select('project_id, user_id, role')
    .maybeSingle();

  if (error) throw error;
  return data;
};

const leaveProject = async ({ projectId, userId }) => {
  if (!supabase || !projectId || !userId) return;

  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', userId);

  if (error) throw error;
};

const subscribeToProjects = (onChange) => {
  if (!supabase) return () => {};

  const channel = supabase
    .channel('projects:workspace')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'project_members' }, onChange)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

export { createProject, getProjects, joinProject, leaveProject, subscribeToProjects };

import { supabase } from './supabaseClient';

const isProjectMembershipPolicyError = (error) =>
  error?.code === '42501' && error?.message?.includes('project_members');

const projectMembershipPolicyError = () =>
  new Error(
    'Project membership is blocked by the current database RLS policy. Run supabase/migrations/20260527_membership_rls_fix.sql in the Supabase SQL Editor, then reload.',
  );

const profileLabel = (profile, fallback) =>
  profile?.full_name || profile?.email || fallback;

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

const getProjectMessages = async (projectId) => {
  const { data: messages, error: messagesError } = await supabase
    .from('messages')
    .select('id, project_id, author_id, body, created_at, profiles:author_id(id, full_name, email, avatar_path)')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (messagesError) throw messagesError;
  return messages || [];
};

const getProjectDetail = async ({ projectId, userId }) => {
  if (!supabase || !projectId) return null;

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, name, summary, visibility, owner_id, created_at, updated_at, profiles:owner_id(id, full_name, email, avatar_path)')
    .eq('id', projectId)
    .maybeSingle();

  if (projectError) throw projectError;
  if (!project) return null;

  const [
    { data: members, error: membersError },
    { count: memberCount, error: memberCountError },
    { data: files, error: filesError },
  ] = await Promise.all([
    supabase
      .from('project_members')
      .select('project_id, user_id, role, created_at, profiles:user_id(id, full_name, email, avatar_path)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true }),
    supabase
      .from('project_members')
      .select('project_id', { count: 'exact', head: true })
      .eq('project_id', projectId),
    supabase
      .from('files')
      .select('id, bucket_id, object_path, display_name, owner_id, room_id, project_id, created_at, profiles:owner_id(id, full_name, email, avatar_path)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false }),
  ]);

  if (membersError) throw membersError;
  if (memberCountError) throw memberCountError;
  if (filesError) throw filesError;

  const currentUserMembership =
    members?.find((membership) => membership.user_id === userId) || null;
  const canOpenWorkspace = Boolean(currentUserMembership || project.owner_id === userId);
  const discussionMessages = canOpenWorkspace ? await getProjectMessages(projectId) : [];

  return {
    project,
    ownerLabel: profileLabel(project.profiles, project.owner_id),
    members: (members || []).map((member) => ({
      ...member,
      displayName: profileLabel(member.profiles, member.user_id),
      profile: member.profiles || null,
    })),
    memberCount: memberCount || 0,
    currentUserMembership,
    files: (files || []).map((file) => ({
      ...file,
      ownerLabel: profileLabel(file.profiles, file.owner_id),
    })),
    discussionMessages: discussionMessages.map((message) => ({
      ...message,
      authorLabel: profileLabel(message.profiles, message.author_id),
      authorProfile: message.profiles || null,
    })),
  };
};

const postProjectMessage = async ({ projectId, authorId, body }) => {
  if (!supabase || !projectId || !authorId) return null;

  const cleanedBody = body.trim();
  if (!cleanedBody) return null;

  const { data, error } = await supabase
    .from('messages')
    .insert({
      project_id: projectId,
      author_id: authorId,
      body: cleanedBody,
    })
    .select('id, project_id, author_id, body, created_at, profiles:author_id(id, full_name, email, avatar_path)')
    .single();

  if (error) throw error;
  return {
    ...data,
    authorLabel: profileLabel(data.profiles, data.author_id),
    authorProfile: data.profiles || null,
  };
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

  if (membershipError) {
    if (isProjectMembershipPolicyError(membershipError)) throw projectMembershipPolicyError();
    throw membershipError;
  }

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

  if (error) {
    if (isProjectMembershipPolicyError(error)) throw projectMembershipPolicyError();
    throw error;
  }

  return data;
};

const leaveProject = async ({ projectId, userId }) => {
  if (!supabase || !projectId || !userId) return;

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('owner_id')
    .eq('id', projectId)
    .maybeSingle();

  if (projectError) throw projectError;
  if (project?.owner_id === userId) {
    throw new Error('Project owners cannot leave until ownership transfer is available.');
  }

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

const subscribeToProjectDetail = ({ projectId, onChange }) => {
  if (!supabase || !projectId) return () => {};

  const channel = supabase
    .channel(`project:${projectId}:detail`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'projects', filter: `id=eq.${projectId}` },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'project_members', filter: `project_id=eq.${projectId}` },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'files', filter: `project_id=eq.${projectId}` },
      onChange,
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'messages', filter: `project_id=eq.${projectId}` },
      onChange,
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

export {
  createProject,
  getProjectDetail,
  getProjects,
  joinProject,
  leaveProject,
  postProjectMessage,
  subscribeToProjectDetail,
  subscribeToProjects,
};

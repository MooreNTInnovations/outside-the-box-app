import { supabase } from './supabaseClient';

const countRows = async (query) => {
  const { count, error } = await query;
  if (error) throw error;
  return count || 0;
};

const getProfileCompletion = (profile) => {
  if (!profile) {
    return {
      completedFields: 0,
      totalFields: 6,
      percent: 0,
      isComplete: false,
    };
  }

  const fields = [
    profile.full_name,
    profile.discipline,
    profile.organization,
    profile.title,
    profile.bio,
    profile.expertise_tags?.length > 0,
  ];
  const completedFields = fields.filter(Boolean).length;
  const totalFields = fields.length;

  return {
    completedFields,
    totalFields,
    percent: Math.round((completedFields / totalFields) * 100),
    isComplete: completedFields === totalFields,
  };
};

const getHomeDashboard = async (userId) => {
  if (!supabase || !userId) {
    return {
      profile: null,
      profileCompletion: getProfileCompletion(null),
      publicRoomsCount: 0,
      recentMessagesCount: 0,
      myProjectsCount: 0,
      myFilesCount: 0,
      pendingReportsCount: null,
      isModeratorOrAdmin: false,
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, discipline, organization, title, bio, expertise_tags, role')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) throw profileError;

  const isModeratorOrAdmin = profile?.role === 'moderator' || profile?.role === 'admin';
  const recentSince = new Date();
  recentSince.setDate(recentSince.getDate() - 30);

  const [
    publicRoomsCount,
    recentMessagesCount,
    myProjectsCount,
    myFilesCount,
    pendingReportsCount,
  ] = await Promise.all([
    countRows(supabase.from('rooms').select('id', { count: 'exact', head: true }).eq('is_public', true)),
    countRows(
      supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('author_id', userId)
        .gte('created_at', recentSince.toISOString()),
    ),
    countRows(supabase.from('project_members').select('project_id', { count: 'exact', head: true }).eq('user_id', userId)),
    countRows(supabase.from('files').select('id', { count: 'exact', head: true }).eq('owner_id', userId)),
    isModeratorOrAdmin
      ? countRows(
          supabase
            .from('reports')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'open'),
        )
      : Promise.resolve(null),
  ]);

  return {
    profile,
    profileCompletion: getProfileCompletion(profile),
    publicRoomsCount,
    recentMessagesCount,
    myProjectsCount,
    myFilesCount,
    pendingReportsCount,
    isModeratorOrAdmin,
  };
};

export { getHomeDashboard };

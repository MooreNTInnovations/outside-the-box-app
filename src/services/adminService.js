import { supabase } from './supabaseClient';

const requireSupabase = () => {
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
};

const readTable = async (table, select, orderColumn = 'created_at') => {
  const client = requireSupabase();
  const { data, error } = await client
    .from(table)
    .select(select)
    .order(orderColumn, { ascending: false });

  if (error) throw error;
  return data || [];
};

const getAdminSnapshot = async (userId) => {
  const client = requireSupabase();
  const { data: currentProfile, error: profileError } = await client
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) throw profileError;

  if (currentProfile?.role !== 'admin') {
    return {
      currentProfile,
      profiles: [],
      reports: [],
      projects: [],
      rooms: [],
      messages: [],
      roomMembers: [],
      projectMembers: [],
      files: [],
      adminActions: [],
    };
  }

  const [
    profiles,
    reports,
    projects,
    rooms,
    messages,
    roomMembers,
    projectMembers,
    files,
    adminActions,
  ] = await Promise.all([
    readTable('profiles', 'id, email, full_name, discipline, organization, title, role, suspended_at, avatar_path, updated_at', 'updated_at'),
    readTable('reports', 'id, reporter_id, target_type, target_id, room_id, project_id, reason, status, created_at, updated_at, reporter:reporter_id(id, full_name, email, avatar_path), rooms:room_id(id, name), projects:project_id(id, name)'),
    readTable('projects', 'id, owner_id, name, summary, visibility, created_at, updated_at, profiles:owner_id(id, full_name, email, avatar_path)', 'updated_at'),
    readTable('rooms', 'id, room_key, name, description, is_public, is_system, visibility, owner_id, archived_at, created_at, updated_at, profiles:owner_id(id, full_name, email, avatar_path)'),
    readTable('messages', 'id, room_id, author_id, body, created_at, profiles:author_id(id, full_name, email, avatar_path), rooms:room_id(id, name)'),
    readTable('room_members', 'room_id, user_id, role, status, invited_by, created_at, profiles:user_id(id, full_name, email, avatar_path), rooms:room_id(id, name)'),
    readTable('project_members', 'project_id, user_id, role, created_at, profiles:user_id(id, full_name, email, avatar_path), projects:project_id(id, name)'),
    readTable('files', 'id, bucket_id, object_path, storage_path, display_name, mime_type, size_bytes, owner_id, room_id, project_id, created_at, profiles:owner_id(id, full_name, email, avatar_path), rooms:room_id(id, name), projects:project_id(id, name)'),
    readTable('admin_actions', 'id, actor_id, target_user_id, action_type, target_type, target_id, notes, details, created_at, actor:actor_id(id, full_name, email, avatar_path), target_user:target_user_id(id, full_name, email, avatar_path)'),
  ]);

  return {
    currentProfile,
    profiles,
    reports,
    projects,
    rooms,
    messages,
    roomMembers,
    projectMembers,
    files,
    adminActions,
  };
};

const rpc = async (name, params) => {
  const client = requireSupabase();
  const { data, error } = await client.rpc(name, params);
  if (error) throw error;
  return data;
};

const adminSetProfileRole = ({ userId, role }) =>
  rpc('admin_set_profile_role', { target_user_id: userId, next_role: role });

const adminSetProfileSuspension = ({ userId, shouldSuspend }) =>
  rpc('admin_set_profile_suspension', {
    target_user_id: userId,
    should_suspend: shouldSuspend,
  });

const adminUpdateReportStatus = ({ reportId, status }) =>
  rpc('admin_update_report_status', { target_report_id: reportId, next_status: status });

const adminCreateRoom = ({ roomKey, name, description, isPublic }) =>
  rpc('admin_create_room', {
    new_room_key: roomKey,
    new_name: name,
    new_description: description || null,
    new_is_public: isPublic,
  });

const adminUpdateRoom = ({ roomId, name, description, isPublic }) =>
  rpc('admin_update_room', {
    target_room_id: roomId,
    next_name: name,
    next_description: description || null,
    next_is_public: isPublic,
  });

const adminUpdateProject = ({ projectId, name, summary, visibility }) =>
  rpc('admin_update_project', {
    target_project_id: projectId,
    next_name: name,
    next_summary: summary || null,
    next_visibility: visibility,
  });

const adminDeleteRecord = ({ targetType, targetId, notes }) =>
  rpc('admin_delete_record', {
    target_type: targetType,
    target_id: targetId,
    action_notes: notes || null,
  });

const adminRemoveRoomMembership = ({ roomId, userId, notes }) =>
  rpc('admin_remove_room_membership', {
    target_room_id: roomId,
    target_user_id: userId,
    action_notes: notes || null,
  });

const adminRemoveProjectMembership = ({ projectId, userId, notes }) =>
  rpc('admin_remove_project_membership', {
    target_project_id: projectId,
    target_user_id: userId,
    action_notes: notes || null,
  });

export {
  adminCreateRoom,
  adminDeleteRecord,
  adminRemoveProjectMembership,
  adminRemoveRoomMembership,
  adminSetProfileRole,
  adminSetProfileSuspension,
  adminUpdateProject,
  adminUpdateReportStatus,
  adminUpdateRoom,
  getAdminSnapshot,
};

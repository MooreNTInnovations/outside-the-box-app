import { supabase } from './supabaseClient';

const isMembershipPolicyError = (error) =>
  error?.code === '42501' && error?.message?.includes('room_members');

const membershipPolicyError = () =>
  new Error(
    'Room membership is blocked by the current database RLS policy. Run supabase/migrations/20260527_membership_rls_fix.sql in the Supabase SQL Editor, then reload.',
  );

const getRoomByKeyOrName = async (roomKey, roomName) => {
  if (!supabase) return null;

  let query = supabase
    .from('rooms')
    .select('id, room_key, name, description, is_public, is_system, visibility, owner_id, archived_at, profiles:owner_id(id, full_name, email, avatar_path)')
    .limit(1)
    .maybeSingle();
  query = roomKey ? query.eq('room_key', roomKey) : query.eq('name', roomName);

  const { data, error } = await query;
  if (error) {
    if (isMembershipPolicyError(error)) throw membershipPolicyError();
    throw error;
  }

  return data;
};

const getRoomById = async (roomId) => {
  if (!supabase || !roomId) return null;

  const { data, error } = await supabase
    .from('rooms')
    .select('id, room_key, name, description, is_public, is_system, visibility, owner_id, archived_at, profiles:owner_id(id, full_name, email, avatar_path)')
    .eq('id', roomId)
    .maybeSingle();

  if (error) throw error;
  return data;
};

const profileLabel = (profile, fallback = 'Member') =>
  profile?.full_name || profile?.email || fallback;

const normalizeMessage = (message) => ({
  ...message,
  body: message.body || message.content || '',
  authorLabel: profileLabel(message.profiles, message.author_id),
  authorProfile: message.profiles || null,
});

const getRooms = async () => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('rooms')
    .select('id, room_key, name, description, is_public, is_system, visibility, owner_id, archived_at, created_at, profiles:owner_id(id, full_name, email, avatar_path), room_members(user_id, role, status)')
    .is('archived_at', null)
    .order('is_system', { ascending: false })
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
};

const getRoomMembers = async (roomId) => {
  if (!supabase || !roomId) return [];

  const { data, error } = await supabase
    .from('room_members')
    .select('room_id, user_id, role, status, invited_by, created_at, profiles:user_id(id, full_name, email, avatar_path)')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []).map((member) => ({
    ...member,
    displayName: profileLabel(member.profiles, member.user_id),
  }));
};

const joinRoom = async ({ roomId, userId }) => {
  if (!supabase || !roomId || !userId) return null;

  const { data, error } = await supabase
    .from('room_members')
    .upsert(
      {
        room_id: roomId,
        user_id: userId,
        role: 'member',
        status: 'active',
      },
      { onConflict: 'room_id,user_id', ignoreDuplicates: true },
    )
    .select('room_id, user_id, role')
    .maybeSingle();

  if (error) throw error;
  return data;
};

const createRoom = async ({ name, description, visibility, invitedUserIds }) => {
  if (!supabase) return null;

  const { data, error } = await supabase.rpc('create_member_room', {
    new_name: name.trim(),
    new_description: description.trim() || null,
    new_visibility: visibility,
    invited_user_ids: invitedUserIds || [],
  });

  if (error) throw error;
  return data;
};

const updateRoom = async ({ roomId, name, description, visibility }) => {
  if (!supabase) return null;

  const { data, error } = await supabase.rpc('update_owned_room', {
    target_room_id: roomId,
    next_name: name.trim(),
    next_description: description.trim() || null,
    next_visibility: visibility,
  });

  if (error) throw error;
  return data;
};

const inviteRoomMembers = async ({ roomId, invitedUserIds }) => {
  if (!supabase) return null;

  const { data, error } = await supabase.rpc('invite_room_members', {
    target_room_id: roomId,
    invited_user_ids: invitedUserIds || [],
  });

  if (error) throw error;
  return data;
};

const removeRoomMember = async ({ roomId, userId }) => {
  if (!supabase) return null;

  const { data, error } = await supabase.rpc('remove_room_member', {
    target_room_id: roomId,
    target_user_id: userId,
  });

  if (error) throw error;
  return data;
};

const leaveRoom = async ({ roomId }) => {
  if (!supabase) return null;

  const { data, error } = await supabase.rpc('leave_room', {
    target_room_id: roomId,
  });

  if (error) throw error;
  return data;
};

const archiveRoom = async ({ roomId }) => {
  if (!supabase) return null;

  const { data, error } = await supabase.rpc('archive_owned_room', {
    target_room_id: roomId,
  });

  if (error) throw error;
  return data;
};

const getMessagesForRoom = async ({ roomId, roomKey, roomName }) => {
  if (!supabase) return [];

  const room = roomId ? await getRoomById(roomId) : await getRoomByKeyOrName(roomKey, roomName);
  if (!room) return [];

  const { data, error } = await supabase
    .from('messages')
    .select('id, body, content, created_at, author_id, room_id, profiles:author_id(id, full_name, email, avatar_path)')
    .eq('room_id', room.id)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []).map(normalizeMessage);
};

const postMessage = async ({ roomId, authorId, body }) => {
  if (!supabase || !roomId || !authorId) return null;

  const cleanedBody = body.trim();
  if (!cleanedBody) return null;

  const { data, error } = await supabase
    .from('messages')
    .insert({
      room_id: roomId,
      author_id: authorId,
      body: cleanedBody,
      content: cleanedBody,
    })
    .select('id, body, content, created_at, author_id, room_id, profiles:author_id(id, full_name, email, avatar_path)')
    .single();

  if (error) throw error;
  return normalizeMessage(data);
};

const createReport = async ({ reporterId, targetType, targetId, reason, roomId, projectId }) => {
  if (!supabase || !reporterId || !targetType || !targetId) return null;

  const { data, error } = await supabase
    .from('reports')
    .insert({
      reporter_id: reporterId,
      target_type: targetType,
      target_id: targetId,
      room_id: roomId || null,
      project_id: projectId || null,
      reason: reason.trim(),
      status: 'open',
    })
    .select('id, reporter_id, target_type, target_id, room_id, project_id, reason, status, created_at')
    .single();

  if (error) throw error;
  return data;
};

const subscribeToRoomMessages = ({ roomId, onInsert }) => {
  if (!supabase || !roomId) return () => {};

  const channel = supabase
    .channel(`room:${roomId}:messages`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => onInsert(payload.new),
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};

export {
  archiveRoom,
  createReport,
  createRoom,
  getMessagesForRoom,
  getRoomById,
  getRoomByKeyOrName,
  getRoomMembers,
  getRooms,
  inviteRoomMembers,
  joinRoom,
  leaveRoom,
  postMessage,
  removeRoomMember,
  subscribeToRoomMessages,
  updateRoom,
};

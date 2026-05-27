import { supabase } from './supabaseClient';

const getRoomByKeyOrName = async (roomKey, roomName) => {
  if (!supabase) return null;

  let query = supabase
    .from('rooms')
    .select('id, room_key, name, description, is_public, is_system')
    .limit(1)
    .maybeSingle();
  query = roomKey ? query.eq('room_key', roomKey) : query.eq('name', roomName);

  const { data, error } = await query;
  if (error) throw error;
  return data;
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
      },
      { onConflict: 'room_id,user_id', ignoreDuplicates: true },
    )
    .select('room_id, user_id, role')
    .maybeSingle();

  if (error) throw error;
  return data;
};

const getMessagesForRoom = async ({ roomKey, roomName }) => {
  if (!supabase) return [];

  const room = await getRoomByKeyOrName(roomKey, roomName);
  if (!room) return [];

  const { data, error } = await supabase
    .from('messages')
    .select('id, body, created_at, author_id, room_id')
    .eq('room_id', room.id)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
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
    })
    .select('id, body, created_at, author_id, room_id')
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

export { getMessagesForRoom, getRoomByKeyOrName, joinRoom, postMessage, subscribeToRoomMessages };

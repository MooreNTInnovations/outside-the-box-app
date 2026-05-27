import { supabase } from './supabaseClient';

const getRoomByKeyOrName = async (roomKey, roomName) => {
  if (!supabase) return null;

  let query = supabase.from('rooms').select('id, room_key, name').limit(1).maybeSingle();
  query = roomKey ? query.eq('room_key', roomKey) : query.eq('name', roomName);

  const { data, error } = await query;
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

export { getMessagesForRoom, getRoomByKeyOrName };

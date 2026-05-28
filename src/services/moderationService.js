import { supabase } from './supabaseClient';

const getReports = async () => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('reports')
    .select('id, reporter_id, target_type, target_id, room_id, project_id, reason, status, created_at, updated_at, reporter:reporter_id(id, full_name, email, avatar_path), rooms:room_id(id, name), projects:project_id(id, name)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

const createModerationReport = async ({ reporterId, targetType, targetId, reason, roomId, projectId }) => {
  if (!supabase || !reporterId || !targetType || !targetId) return null;

  const cleanedReason = reason.trim();
  if (!cleanedReason) return null;

  const { data, error } = await supabase
    .from('reports')
    .insert({
      reporter_id: reporterId,
      target_type: targetType,
      target_id: targetId,
      room_id: roomId || null,
      project_id: projectId || null,
      reason: cleanedReason,
      status: 'open',
    })
    .select('id, reporter_id, target_type, target_id, room_id, project_id, reason, status, created_at')
    .single();

  if (error) throw error;
  return data;
};

const updateModerationReportStatus = async ({ reportId, status }) => {
  if (!supabase || !reportId) return null;

  const { data, error } = await supabase.rpc('admin_update_report_status', {
    target_report_id: reportId,
    next_status: status,
  });

  if (error) throw error;
  return data;
};

export { createModerationReport, getReports, updateModerationReportStatus };

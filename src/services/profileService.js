import { supabase } from './supabaseClient';

const AVATAR_BUCKET = 'profile-avatars';
const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024;

const isMissingExpertiseTagsColumn = (error) =>
  error?.code === '42703' && error?.message?.includes('profiles.expertise_tags');

const profileSchemaError = () =>
  new Error(
    'Database schema is missing profiles.expertise_tags. Run supabase/migrations/20260527_profile_expertise_tags_hotfix.sql in the Supabase SQL Editor, then reload.',
  );

const getProfiles = async () => {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, title, organization, discipline, expertise_tags, role, avatar_path, updated_at')
    .order('updated_at', { ascending: false });

  if (error) {
    if (isMissingExpertiseTagsColumn(error)) throw profileSchemaError();
    throw error;
  }

  return data || [];
};

const getProfileById = async (profileId) => {
  if (!supabase || !profileId) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, title, organization, discipline, bio, expertise_tags, role, avatar_path, updated_at')
    .eq('id', profileId)
    .maybeSingle();

  if (error) {
    if (isMissingExpertiseTagsColumn(error)) throw profileSchemaError();
    throw error;
  }

  return data;
};

const getCurrentProfile = async (userId) => {
  if (!supabase || !userId) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, title, organization, discipline, bio, expertise_tags, role, avatar_path, updated_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    if (isMissingExpertiseTagsColumn(error)) throw profileSchemaError();
    throw error;
  }

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
    expertise_tags: updates.expertiseTags
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('profiles')
    .update(safeUpdates)
    .eq('id', userId)
    .select('id, email, full_name, title, organization, discipline, bio, expertise_tags, role, avatar_path, updated_at')
    .single();

  if (error) {
    if (isMissingExpertiseTagsColumn(error)) throw profileSchemaError();
    throw error;
  }

  return data;
};

const getAvatarUrl = (avatarPath) => {
  if (!supabase || !avatarPath) return '';

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(avatarPath);
  return data?.publicUrl || '';
};

const uploadProfileAvatar = async ({ userId, file }) => {
  if (!supabase || !userId || !file) return null;

  if (!file.type?.startsWith('image/')) {
    throw new Error('Profile photo must be an image file.');
  }

  if (file.size > MAX_AVATAR_SIZE_BYTES) {
    throw new Error('Profile photo must be 2MB or smaller.');
  }

  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const objectPath = `${userId}/${Date.now()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(objectPath, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from('profiles')
    .update({
      avatar_path: objectPath,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select('id, email, full_name, title, organization, discipline, bio, expertise_tags, role, avatar_path, updated_at')
    .single();

  if (error) throw error;
  return data;
};

export {
  getAvatarUrl,
  getCurrentProfile,
  getProfileById,
  getProfiles,
  updateCurrentProfile,
  uploadProfileAvatar,
};

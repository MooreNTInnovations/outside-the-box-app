import { createClient } from '@supabase/supabase-js';
import { env, isSupabaseConfigured } from '../config/env';

const supabase = isSupabaseConfigured
  ? createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export { supabase };

const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL || '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
  filesBucket: import.meta.env.VITE_SUPABASE_FILES_BUCKET || 'collaboration-files',
  authRedirectUrl: import.meta.env.VITE_AUTH_REDIRECT_URL || window.location.origin,
};

const requiredEnv = {
  VITE_SUPABASE_URL: env.supabaseUrl,
  VITE_SUPABASE_ANON_KEY: env.supabaseAnonKey,
};

const missingEnv = Object.entries(requiredEnv)
  .filter(([, value]) => !value)
  .map(([key]) => key);

const isSupabaseConfigured = missingEnv.length === 0;

export { env, missingEnv, isSupabaseConfigured };

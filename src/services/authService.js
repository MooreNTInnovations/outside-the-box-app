import { env } from '../config/env';
import { supabase } from './supabaseClient';

const requireSupabase = () => {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
  }

  return supabase;
};

const authService = {
  async getSession() {
    const client = requireSupabase();
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  onAuthStateChange(callback) {
    const client = requireSupabase();
    return client.auth.onAuthStateChange(callback);
  },

  async signUp({ email, password, fullName }) {
    const client = requireSupabase();
    const { data, error } = await client.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: env.authRedirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    if (error) throw error;
    return data;
  },

  async signIn({ email, password }) {
    const client = requireSupabase();
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const client = requireSupabase();
    const { error } = await client.auth.signOut();
    if (error) throw error;
  },
};

export { authService };

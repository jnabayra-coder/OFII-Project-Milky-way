import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Retrieve environment variables for Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl && 
    supabaseUrl.trim() !== '' && 
    supabaseUrl.startsWith('http') &&
    supabaseAnonKey && 
    supabaseAnonKey.trim() !== ''
  );
};

export const getSupabaseConfig = () => ({
  url: supabaseUrl,
  configured: isSupabaseConfigured(),
  maskedKey: supabaseAnonKey ? `${supabaseAnonKey.slice(0, 8)}...${supabaseAnonKey.slice(-6)}` : 'Not set',
});

// Create single Supabase client instance if configured
let clientInstance: SupabaseClient | null = null;

if (isSupabaseConfigured()) {
  try {
    clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  } catch (err) {
    console.warn('[Supabase] Initialization warning:', err);
  }
}

export const supabase = clientInstance;

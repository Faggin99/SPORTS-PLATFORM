import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    storageKey: 'sports-platform-auth',
    storage: window.localStorage,
    autoRefreshToken: true,
    detectSessionInUrl: false
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'X-Client-Info': 'sports-platform-desktop',
      // Removido Content-Type global para não interferir com uploads de arquivos
      // O Supabase define automaticamente o Content-Type correto para cada requisição
    }
  }
});

// Helper function to get current tenant_id from logged user
// For clubs table, we use the auth.uid() directly as tenant_id
export const getCurrentTenantId = async () => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Return the Supabase Auth user ID (UUID) directly
  return user.id;
};

// Helper function to get current user profile
export const getCurrentUserProfile = async () => {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', user.email)
    .single();

  if (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }

  return data;
};

export default supabase;

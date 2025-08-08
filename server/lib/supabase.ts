import { createClient } from '@supabase/supabase-js';

if (!process.env.VITE_SUPABASE_URL) {
  throw new Error("VITE_SUPABASE_URL environment variable must be set");
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY environment variable must be set");
}

// Service Role Client - Backend için (RLS bypass)
export const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role key kullan
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Public Client - Frontend auth kontrolü için
export const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);
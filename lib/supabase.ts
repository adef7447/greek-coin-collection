import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,       // Force tokens to save in the browser
    autoRefreshToken: true,     // Silently refresh expired session tokens
    detectSessionInUrl: true,   // Important if you ever use Magic Links or Google OAuth
  },
});
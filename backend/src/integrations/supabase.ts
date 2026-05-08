import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;
const supabasePublishableKey =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing SUPABASE_URL and service key environment variables");
}

if (!supabasePublishableKey) {
  throw new Error("Missing SUPABASE_PUBLISHABLE_KEY or SUPABASE_ANON_KEY environment variable");
}

const authOptions = {
  persistSession: false,
  autoRefreshToken: false,
  detectSessionInUrl: false,
};

export const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: authOptions });
export const supabaseAuth = createClient(supabaseUrl, supabasePublishableKey, { auth: authOptions });

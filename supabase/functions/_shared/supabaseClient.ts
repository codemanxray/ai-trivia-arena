import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
if (!supabaseUrl) {
  throw new Error("SUPABASE_URL is not defined");
}

const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (!supabaseServiceRoleKey) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is not defined");
}

const supabaseClient: SupabaseClient = createClient(supabaseUrl, supabaseServiceRoleKey);

export default supabaseClient;
import { createClient } from "@supabase/supabase-js";

import type { Database } from "./types";

/**
 * Supabase admin client with service_role key.
 * Use ONLY on the server for privileged operations (user management, bypassing RLS).
 * NEVER expose to the client.
 */
export function getSupabaseAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}

import { createClient } from "@supabase/supabase-js";

import type { Database } from "./types";

/**
 * Server-side Supabase client using the service_role key.
 *
 * This client is used exclusively inside Server Actions (`src/actions/`),
 * which are already guarded by `requireAuth` / `requirePermission`.
 * The service_role key bypasses Row Level Security so writes succeed
 * regardless of whether RLS is enabled on a table.
 *
 * NEVER expose this client or import this module from client code.
 */
export async function getSupabaseServerClient() {
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

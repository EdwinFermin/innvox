import type { Session } from "next-auth";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const isUuid = (value: string | null | undefined): value is string =>
  !!value && UUID_PATTERN.test(value);

export async function resolveSessionUserId(
  session: Session,
  supabase: SupabaseClient<Database>,
) {
  if (isUuid(session.user.id)) {
    return session.user.id;
  }

  const email = session.user.email?.trim().toLowerCase();

  if (!email) {
    throw new Error(
      "No se pudo resolver el usuario autenticado porque la sesion no tiene un email valido.",
    );
  }

  const { data: user, error } = await supabase
    .from("users")
    .select("id")
    .ilike("email", email)
    .single();

  if (error || !user?.id) {
    throw new Error(
      "No se pudo resolver el usuario autenticado en la base de datos.",
    );
  }

  return user.id;
}

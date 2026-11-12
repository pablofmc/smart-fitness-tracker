import { createClient } from "./server";

/** RLS can't guard work done with the admin client, so Server Actions call this first. */
export async function requireSession() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims || data.claims.is_anonymous) {
    throw new Error("Inicia sesión para continuar.");
  }
  return data.claims;
}

/** The signed-in person's id. Admin-client code filters and writes every row by it (ADR-0007). */
export async function requireUserId() {
  const claims = await requireSession();
  if (typeof claims.sub !== "string" || claims.sub === "") throw new Error("Inicia sesión para continuar.");
  return claims.sub;
}

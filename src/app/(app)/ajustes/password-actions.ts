"use server";

import { createClient as createPlainClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { newPasswordProblem, TEMP_PASSWORD_FLAG } from "@/lib/account/password";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSession } from "@/lib/supabase/auth";
import { createClient } from "@/lib/supabase/server";

export type PasswordState = { message?: string; saved?: boolean };

/**
 * Changes the signed-in person's password (R-USR-03). The current one is checked first with a client that
 * keeps no session, so a wrong guess never touches the session cookies. Saving clears the temporary flag.
 */
export async function changePassword(_prev: PasswordState, form: FormData): Promise<PasswordState> {
  const claims = await requireSession();
  const [current, next, repeat] = ["current", "next", "repeat"].map((k) => String(form.get(k) ?? ""));
  const problem = newPasswordProblem(current, next, repeat);
  if (problem) return { message: problem };
  if (typeof claims.email !== "string") return { message: "No pudimos cambiar la contraseña." };

  const check = createPlainClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: wrong } = await check.auth.signInWithPassword({ email: claims.email, password: current });
  if (wrong) return { message: "La contraseña actual no es correcta." };
  await check.auth.signOut({ scope: "local" });

  const db = await createClient();
  const { error } = await db.auth.updateUser({ password: next });
  if (error) return { message: "No pudimos cambiar la contraseña. Intenta de nuevo." };

  if (claims.app_metadata?.[TEMP_PASSWORD_FLAG]) {
    await createAdminClient().auth.admin.updateUserById(claims.sub, { app_metadata: { [TEMP_PASSWORD_FLAG]: false } });
    // A fresh token carries the cleared flag, so the notices go away now rather than at the next refresh.
    await db.auth.refreshSession();
  }
  revalidatePath("/", "layout");
  return { saved: true };
}

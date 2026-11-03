"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { message?: string; email?: string };

const credentials = z.object({ email: z.email(), password: z.string().min(1) });

export async function signIn(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const parsed = credentials.safeParse({
    email,
    password: formData.get("password"),
  });
  if (!parsed.success) return { message: "Correo o contraseña incorrectos.", email };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return {
      message: error.status === 429 ? "Demasiados intentos. Espera un momento." : "Correo o contraseña incorrectos.",
      email,
    };
  }
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

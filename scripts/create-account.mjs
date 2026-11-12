// Creates an account with a temporary password (R-USR-03, ADR-0007). Sign-ups stay off: this script,
// run by the owner, is the only way an account exists. The person is asked to choose their own password
// when they sign in.
//
//   Local:       node --env-file=.env.local scripts/create-account.mjs ella@correo.com
//   Production:  SUPABASE_URL=… SUPABASE_SECRET_KEY=… node scripts/create-account.mjs ella@correo.com
//
// The temporary password is printed once, here in the terminal, to hand over in person.
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const email = process.argv[2]?.trim().toLowerCase();
const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;

if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Uso: node scripts/create-account.mjs correo@ejemplo.com");
  process.exit(1);
}
if (!url || !secret) {
  console.error("Faltan SUPABASE_URL (o NEXT_PUBLIC_SUPABASE_URL) y SUPABASE_SECRET_KEY.");
  process.exit(1);
}

// 16 characters from an unambiguous alphabet: easy to type from a note, hard to guess.
const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
const password = [...randomBytes(16)].map((b) => ALPHABET[b % ALPHABET.length]).join("");

const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  // app_metadata, not user_metadata: the person can't edit it (ADR-0007).
  app_metadata: { temp_password: true },
});

if (error) {
  console.error(`No se pudo crear la cuenta: ${error.message}`);
  process.exit(1);
}

console.log(`Cuenta creada para ${data.user.email} en ${new URL(url).host}.`);
console.log(`Contraseña temporal: ${password}`);
console.log("Dásela en persona. Al entrar, la app le pide elegir una suya.");

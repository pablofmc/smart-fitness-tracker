"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/supabase/auth";
import { startSync } from "@/lib/sync/start";

export type SyncNowState = { message?: string };

const BUDGET_MS = 45_000;

const MESSAGES = {
  finished: undefined,
  failed: "No pudimos traer todos los datos. Reintentamos solos en 30 min.",
  blocked: "Garmin rechazó la clave. Pega una nueva en Ajustes.",
  "no-key": "Primero pega tu clave de Garmin en Ajustes.",
  "already-running": "Ya hay una sincronización en curso.",
};

export async function syncNow(): Promise<SyncNowState> {
  await requireSession();
  const outcome = await startSync("manual", BUDGET_MS);
  revalidatePath("/", "layout");
  return { message: MESSAGES[outcome] };
}

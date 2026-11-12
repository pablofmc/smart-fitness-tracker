"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/supabase/auth";
import { startSync } from "@/lib/sync/start";

export type SyncNowState = { message?: string };

const BUDGET_MS = 45_000;

const MESSAGES = {
  finished: undefined,
  failed: "No pudimos traer todos los datos. Reintentamos solos en 30 min.",
  blocked: "Garmin rechazó la clave. Pega una nueva en Ajustes.",
  "no-key": "Primero pega tu clave de Garmin en Ajustes.",
  "already-running": "Ya hay una sincronización en curso. Prueba de nuevo en unos minutos.",
};

export async function syncNow(): Promise<SyncNowState> {
  const userId = await requireUserId();
  const outcome = await startSync("manual", BUDGET_MS, userId);
  revalidatePath("/", "layout");
  return { message: MESSAGES[outcome] };
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { saveGarminKey } from "@/lib/garmin/key";

export type SaveKeyState = { message?: string; saved?: boolean };

const input = z.object({
  apiKey: z.string().trim().min(1),
  expiresOn: z.iso.date(),
});

export async function saveKey(_prev: SaveKeyState, formData: FormData): Promise<SaveKeyState> {
  const parsed = input.safeParse({ apiKey: formData.get("apiKey"), expiresOn: formData.get("expiresOn") });
  if (!parsed.success) return { message: "Pega la clave y elige su fecha de vencimiento." };
  if (parsed.data.expiresOn < new Date().toISOString().slice(0, 10)) {
    return { message: "Esa fecha ya pasó. Revisa cuándo vence la clave." };
  }

  try {
    await saveGarminKey(parsed.data.apiKey, parsed.data.expiresOn);
  } catch {
    return { message: "No pudimos guardar la clave. Intenta de nuevo." };
  }
  revalidatePath("/", "layout");
  return { saved: true };
}

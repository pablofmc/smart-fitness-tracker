"use client";

import { uploadSession } from "@/app/(app)/sesion/actions";
import { hasPending, uploadOf, type ActiveSession } from "./session";

export type Confirmed = ReturnType<typeof uploadOf>;

/** The session in progress lives on the phone (R-STR-08): it survives no signal, a closed tab and a reload. */
const KEY = "sft.activeSession";

export function loadActiveSession(): ActiveSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ActiveSession) : null;
  } catch {
    return null;
  }
}

export function saveActiveSession(session: ActiveSession | null) {
  try {
    if (session) localStorage.setItem(KEY, JSON.stringify(session));
    else localStorage.removeItem(KEY);
  } catch {
    // Storage full or blocked: the session still works while the page stays open.
  }
}

/**
 * Sends whatever the server hasn't confirmed and returns what it confirmed, or null when there's no
 * signal or the server said no; the caller tries again later. The caller applies the confirmation to
 * its latest session with `markSynced`, so sets logged during the upload stay waiting.
 */
export async function pushSession(session: ActiveSession): Promise<Confirmed | null> {
  if (!hasPending(session)) return null;
  const sent = uploadOf(session);
  const position = new Map(session.exercises.map((e, i) => [e.key, i]));
  const exercise = new Map(session.exercises.map((e) => [e.key, e]));
  try {
    const result = await uploadSession({
      session: { id: session.id, routineId: session.routineId, name: session.name, localDay: session.localDay, startedAt: session.startedAt, endedAt: session.endedAt },
      sets: sent.sets.map((s) => ({
        id: s.id,
        exerciseName: exercise.get(s.exerciseKey)?.name ?? "Ejercicio",
        category: exercise.get(s.exerciseKey)?.category ?? null,
        exercisePosition: position.get(s.exerciseKey) ?? 0,
        setNumber: s.setNumber,
        kg: s.kg,
        reps: s.reps,
        loggedAt: s.loggedAt,
      })),
      deletedSetIds: sent.deletedSetIds,
    });
    return result.ok ? { ...sent, headerSent: true } : null;
  } catch {
    return null;
  }
}

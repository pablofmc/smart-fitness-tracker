"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { addSet, hasPending, KG_STEP, markSynced, pendingCount, prefill, recordSetIds, removeSet, setsOf, type ActiveSession, type Effort, type SessionExercise } from "@/modules/workouts/session";
import { loadActiveSession, pushSession, saveActiveSession } from "@/modules/workouts/store";

export type SessionTemplate = {
  routineId: number | null;
  name: string;
  localDay: string;
  exercises: SessionExercise[];
  lastByName: Record<string, Effort & { day: string }>;
  /** Earlier best weight and estimated 1RM per exercise id (see read-sets). */
  bestById: Record<string, { kg: number; e1rm: number }>;
  fileUrl: string | null;
};

const KG = new Intl.NumberFormat("es", { maximumFractionDigits: 1 });
const TIME = new Intl.DateTimeFormat("es", { hour: "2-digit", minute: "2-digit" });
const DAY = new Intl.DateTimeFormat("es", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
const RETRY_MS = 10_000;

const started = (s: ActiveSession) => s.sets.length > 0 || s.deletedSetIds.length > 0;

function newSession(t: SessionTemplate): ActiveSession {
  return { id: crypto.randomUUID(), routineId: t.routineId, name: t.name, localDay: t.localDay, startedAt: new Date().toISOString(), endedAt: null, exercises: t.exercises, sets: [], headerSynced: false, deletedSetIds: [] };
}

/** Logging sets as I train: one tap per set after the first, saved on each tap, and kept on the phone without signal. */
export function SessionScreen({ template, knownExercises }: { template: SessionTemplate; knownExercises: { key: string; name: string }[] }) {
  const router = useRouter();
  // Rendered only in the browser (see session-loader), so the phone's storage can seed the state.
  const [initial] = useState(() => {
    const stored = loadActiveSession();
    const start = stored && (!stored.endedAt || hasPending(stored)) ? stored : newSession(template);
    return { start, resumed: start === stored && stored.routineId !== template.routineId };
  });
  const [session, setSession] = useState<ActiveSession>(initial.start);
  const resumed = initial.resumed;
  const first = initial.start.endedAt ? undefined : initial.start.exercises[0];
  const [open, setOpen] = useState<string | null>(first?.key ?? null);
  const [effort, setEffort] = useState<Effort>(() => (first ? prefill(initial.start, first.key) : { kg: 0, reps: 8 }));
  const [online, setOnline] = useState(() => navigator.onLine);
  // The phone may say it's online on a weak gym wifi while uploads still fail.
  const [stuck, setStuck] = useState(false);
  const [adding, setAdding] = useState("");
  const [fileOpen, setFileOpen] = useState(false);
  const sending = useRef(false);
  const latest = useRef<ActiveSession>(initial.start);

  useEffect(() => {
    latest.current = session;
    // A session exists from its first set on: opening the screen and leaving creates nothing.
    if (started(session)) saveActiveSession(session);
  }, [session]);

  const flush = useCallback(async () => {
    const current = latest.current;
    if (sending.current || !started(current) || !hasPending(current)) return;
    sending.current = true;
    const confirmed = await pushSession(current);
    sending.current = false;
    setStuck(!confirmed);
    if (confirmed) setSession((s) => markSynced(s, confirmed));
  }, []);

  // Upload after every change, when the signal comes back, and every few seconds while something waits.
  useEffect(() => {
    if (hasPending(session)) void flush();
  }, [session, flush]);
  useEffect(() => {
    const up = () => {
      setOnline(true);
      void flush();
    };
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    const timer = setInterval(() => void flush(), RETRY_MS);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
      clearInterval(timer);
    };
  }, [flush]);

  // A finished session leaves the phone once the server has all of it.
  useEffect(() => {
    if (session.endedAt && (!started(session) || !hasPending(session))) {
      saveActiveSession(null);
      router.push("/rutinas");
    }
  }, [session, router]);

  const pending = pendingCount(session);
  const records = recordSetIds(session);
  const total = session.sets.length;

  function openExercise(key: string) {
    setOpen((o) => (o === key ? null : key));
    setEffort(prefill(session, key));
  }

  function log(e: Effort) {
    if (!open) return;
    setSession((s) => addSet(s, open, e, crypto.randomUUID(), new Date()));
  }

  function addExercise() {
    const name = adding.trim();
    if (!name) return;
    const known = knownExercises.find((k) => k.name.toLowerCase() === name.toLowerCase());
    const category = known?.key ?? null;
    const exercise: SessionExercise = {
      key: `x${crypto.randomUUID().slice(0, 8)}`,
      name: known?.name ?? name,
      category,
      target: null,
      targetKg: null,
      targetReps: null,
      last: template.lastByName[name.toLowerCase()] ?? null,
      best: template.bestById[category ?? `name:${name.toLowerCase()}`] ?? null,
    };
    const next = { ...session, exercises: [...session.exercises, exercise] };
    setSession(next);
    setAdding("");
    setOpen(exercise.key);
    setEffort(prefill(next, exercise.key));
  }

  const step = "size-11 rounded-full bg-sunk text-xl font-extrabold disabled:opacity-40";

  return (
    <div className="flex max-w-xl flex-col gap-3.5">
      <div className="flex items-center gap-2">
        <Link href="/rutinas" aria-label="Volver a Rutinas" className="flex size-11 shrink-0 items-center justify-center rounded-full bg-card">
          <svg viewBox="0 0 24 24" aria-hidden className="size-5 fill-none stroke-current" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </Link>
        <div className="flex min-w-0 flex-1 flex-col">
          <h1 className="truncate text-xl font-extrabold">{session.name}</h1>
          <span className="text-[13px] text-muted">
            Hoy · desde las {TIME.format(new Date(session.startedAt))} · {total} {total === 1 ? "serie" : "series"}
          </span>
        </div>
        {template.fileUrl && session.routineId === template.routineId && (
          <button type="button" onClick={() => setFileOpen(true)} className="flex h-11 shrink-0 items-center gap-1.5 rounded-[14px] bg-card px-3 text-[13px] font-bold">
            <svg viewBox="0 0 24 24" aria-hidden className="size-[18px] fill-none stroke-current" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4" />
            </svg>
            Ver rutina
          </button>
        )}
      </div>

      {resumed && !session.endedAt && <p className="rounded-[14px] bg-nav-on px-3.5 py-2.5 text-sm font-bold text-on-nav-on">Seguiste con la sesión que tenías abierta. Termínala para empezar otra.</p>}

      {pending > 0 && (
        <div role="status" className="grid grid-cols-[20px_minmax(0,1fr)] gap-2 rounded-[14px] bg-amber-bg px-3.5 py-2.5 text-sm leading-snug font-bold text-amber-text">
          <svg viewBox="0 0 24 24" aria-hidden className="size-5 fill-none stroke-current" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d={online && !stuck ? "M21 12a9 9 0 1 1-3-6.7M21 4v5h-5" : "M2 8.5a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0M12 19h.01M3 3l18 18"} />
          </svg>
          <span>
            {online && !stuck ? "Subiendo" : "Sin conexión:"} {pending} {pending === 1 ? "serie esperando" : "series esperando"} en el teléfono.{online && !stuck ? "" : " Se suben solas cuando vuelva la conexión."}
          </span>
        </div>
      )}

      {session.endedAt ? (
        <p className="rounded-[20px] bg-card px-[18px] py-6 text-center text-[15px] leading-snug text-muted">Sesión terminada. Cuando se suban las series pendientes vuelves a Rutinas.</p>
      ) : (
        <>
          {session.exercises.length === 0 && <p className="rounded-[20px] bg-card px-[18px] py-5 text-center text-[15px] text-muted">Sesión sin rutina: agrega el primer ejercicio abajo.</p>}

          {session.exercises.map((exercise) => {
            const sets = setsOf(session, exercise.key);
            const isOpen = open === exercise.key;
            const targetSets = Number(exercise.target?.match(/(\d+) (?:×|series)/)?.[1] ?? 0);
            const full = targetSets > 0 && sets.length >= targetSets;
            return (
              <section key={exercise.key} className="overflow-hidden rounded-[20px] bg-card">
                <button type="button" onClick={() => openExercise(exercise.key)} aria-expanded={isOpen} className="grid min-h-14 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 px-4 py-3 text-left">
                  <span className="flex flex-col gap-0.5">
                    <span className="text-base font-extrabold">{exercise.name}</span>
                    {exercise.target && <span className="text-[13px] text-muted">{exercise.target}</span>}
                  </span>
                  <span className={`rounded-[10px] px-2.5 py-1 text-[13px] font-extrabold ${full ? "bg-nav-on text-on-nav-on" : "bg-sunk"}`}>
                    {sets.length}
                    {targetSets ? ` / ${targetSets}` : ""} series
                  </span>
                </button>

                {isOpen && (
                  <div className="flex flex-col gap-3 px-4 pb-4">
                    {sets.map((s) => (
                      <div key={s.id} className="grid grid-cols-[28px_minmax(0,1fr)_auto_36px] items-center gap-2.5 border-t border-sunk py-2">
                        <span className="text-sm font-extrabold text-muted">{s.setNumber}</span>
                        <span className="text-base font-bold tabular-nums">
                          {KG.format(s.kg)} kg × {s.reps}
                        </span>
                        <span className="flex items-center gap-1">
                          {records.has(s.id) && <span className="rounded-[10px] bg-amber-bg px-2 py-0.5 text-xs font-extrabold text-amber-title">Récord</span>}
                          <span className={`rounded-[10px] px-2 py-0.5 text-xs font-extrabold ${s.synced ? "bg-nav-on text-on-nav-on" : "bg-amber-bg text-amber-text"}`}>{s.synced ? "Guardada" : "Esperando"}</span>
                        </span>
                        <button type="button" aria-label={`Quitar serie ${s.setNumber}`} onClick={() => setSession((x) => removeSet(x, s.id))} className="flex h-9 w-9 items-center justify-center text-muted">
                          <svg viewBox="0 0 24 24" aria-hidden className="size-4 fill-none stroke-current" strokeWidth={2} strokeLinecap="round">
                            <path d="M6 6l12 12M18 6L6 18" />
                          </svg>
                        </button>
                      </div>
                    ))}

                    <span className="text-[13px] text-muted">{exercise.last ? `La última vez (${DAY.format(new Date(`${exercise.last.day}T00:00:00Z`)).replaceAll(".", "")}): ${KG.format(exercise.last.kg)} kg × ${exercise.last.reps}` : "Primera vez que lo anotas"}</span>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs font-bold text-muted">Peso</span>
                        <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-1">
                          <button type="button" aria-label="Bajar 2,5 kg" disabled={effort.kg <= 0} onClick={() => setEffort((e) => ({ ...e, kg: Math.max(0, e.kg - KG_STEP) }))} className={step}>
                            −
                          </button>
                          <span className="text-center text-[22px] font-extrabold tabular-nums">
                            {KG.format(effort.kg)}
                            <span className="text-[13px] font-semibold text-muted"> kg</span>
                          </span>
                          <button type="button" aria-label="Subir 2,5 kg" onClick={() => setEffort((e) => ({ ...e, kg: e.kg + KG_STEP }))} className={step}>
                            +
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs font-bold text-muted">Repeticiones</span>
                        <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-1">
                          <button type="button" aria-label="Una repetición menos" disabled={effort.reps <= 1} onClick={() => setEffort((e) => ({ ...e, reps: Math.max(1, e.reps - 1) }))} className={step}>
                            −
                          </button>
                          <span className="text-center text-[22px] font-extrabold tabular-nums">{effort.reps}</span>
                          <button type="button" aria-label="Una repetición más" onClick={() => setEffort((e) => ({ ...e, reps: Math.min(200, e.reps + 1) }))} className={step}>
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-2.5">
                      <button type="button" onClick={() => log(effort)} className="h-14 rounded-2xl bg-primary text-base font-extrabold text-on-primary">
                        Guardar serie {sets.length + 1}
                      </button>
                      <button type="button" disabled={sets.length === 0} onClick={() => log(sets[sets.length - 1])} className="h-14 rounded-2xl border border-line text-sm font-bold disabled:opacity-50">
                        Repetir serie
                      </button>
                    </div>
                  </div>
                )}
              </section>
            );
          })}

          <div className="flex gap-2">
            <label className="sr-only" htmlFor="add-exercise">
              Ejercicio fuera de la rutina
            </label>
            <input id="add-exercise" list="session-exercises" value={adding} onChange={(e) => setAdding(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addExercise())} placeholder="+ Ejercicio fuera de la rutina" maxLength={80} className="h-12 min-w-0 flex-1 rounded-2xl border border-dashed border-line bg-card px-3.5 text-[15px] font-semibold" />
            <datalist id="session-exercises">
              {knownExercises.map((k) => (
                <option key={k.key} value={k.name} />
              ))}
            </datalist>
            <button type="button" onClick={addExercise} disabled={!adding.trim()} className="h-12 rounded-2xl bg-sunk px-4 text-sm font-bold disabled:opacity-50">
              Agregar
            </button>
          </div>

          <button
            type="button"
            onClick={() => setSession((s) => ({ ...s, endedAt: new Date().toISOString(), headerSynced: false }))}
            className="h-[52px] rounded-2xl border border-line bg-card text-[15px] font-extrabold"
          >
            Terminar sesión
          </button>
          <span className="text-xs leading-snug text-muted">Cada serie se guarda al tocar. Si grabas la sesión en el reloj, se une a esa actividad en el próximo sync.</span>
        </>
      )}

      {fileOpen && template.fileUrl && (
        <div role="dialog" aria-label="Archivo de la rutina" className="fixed inset-0 z-20 flex flex-col gap-3 bg-black/85 p-4">
          <button type="button" onClick={() => setFileOpen(false)} className="h-11 self-end rounded-full bg-white px-4 text-sm font-extrabold text-black">
            Cerrar
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={template.fileUrl} alt="La rutina tal como la subiste" className="min-h-0 flex-1 rounded-2xl bg-white object-contain" />
          <a href={template.fileUrl} target="_blank" rel="noreferrer" className="self-center text-sm font-bold text-white underline">
            Abrir aparte (PDF)
          </a>
        </div>
      )}
    </div>
  );
}

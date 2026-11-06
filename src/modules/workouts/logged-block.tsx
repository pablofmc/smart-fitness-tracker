import { sportsInGroup } from "@/lib/activities/list";
import { createClient } from "@/lib/supabase/server";
import { ownerTimeZone } from "@/lib/today";
import { exerciseName, type ExerciseTotal } from "@/modules/strength/sets";
import { lineText } from "./history";
import { candidatesFor, compareRows } from "./link";
import { SessionPicker } from "./session-picker";


/**
 * On a Garmin strength activity: my logged sets next to what the watch detected, without merging them
 * (R-STR-09, canvas: C2-Fuerza-Vinculada). With an unlinked session that overlaps two activities, asks
 * which one it was.
 */
export async function LoggedBlock({ activityId }: { activityId: number }) {
  const db = await createClient();
  const [timeZone, { data: activity }, { data: linked }] = await Promise.all([
    ownerTimeZone(),
    db.from("activities").select("id, local_day, started_at, duration_s, strength_sessions(exercises)").eq("id", activityId).maybeSingle(),
    db.from("logged_sessions").select("id, name, started_at, ended_at, logged_sets(exercise_name, category, exercise_position, weight_kg, reps, logged_at)").eq("activity_id", activityId),
  ]);
  if (!activity) return null;
  const time = new Intl.DateTimeFormat("es", { hour: "2-digit", minute: "2-digit", timeZone });

  if (linked?.length) {
    const watch = ((activity.strength_sessions?.exercises ?? []) as ExerciseTotal[]).map((e) => ({ category: e.category, name: exerciseName(e.category), sets: e.sets, reps: e.reps }));
    return (
      <>
        {linked.map((session) => {
          const sets = session.logged_sets.map((s) => ({ exerciseName: s.exercise_name, category: s.category, position: s.exercise_position, kg: Number(s.weight_kg), reps: s.reps }));
          const end = session.ended_at ?? session.logged_sets.map((s) => s.logged_at).sort().at(-1) ?? session.started_at;
          const rows = compareRows(sets, linked.length === 1 ? watch : []);
          return (
            <section key={session.id} className="flex flex-col gap-1 rounded-3xl bg-card p-[18px]">
              <div className="mb-2 grid grid-cols-[20px_minmax(0,1fr)] gap-2 rounded-2xl bg-nav-on px-3.5 py-3 text-sm leading-snug font-bold text-on-nav-on">
                <svg viewBox="0 0 24 24" aria-hidden className="size-5 fill-none stroke-current" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
                </svg>
                <span>
                  Unida a tu sesión «{session.name}», anotada de {time.format(new Date(session.started_at))} a {time.format(new Date(end))}.
                </span>
              </div>
              <h2 className="mb-1 text-[17px] font-extrabold">Anotado y reloj</h2>
              <div className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)] gap-2 pb-1 text-xs font-bold text-muted">
                <span>Ejercicio</span>
                <span>Lo que anotaste</span>
                <span>Lo que vio el reloj</span>
              </div>
              {rows.map((r, i) => (
                <div key={`${r.name}-${i}`} className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)] items-start gap-2 border-t border-field py-2.5 text-sm">
                  <span className={`font-bold ${r.unclassified ? "text-muted italic" : ""}`}>{r.logged ? r.name : r.unclassified ? "—" : r.name}</span>
                  <span className="tabular-nums">
                    {r.logged ? lineText(r.logged) : "—"}
                  </span>
                  <span className={`tabular-nums ${r.unclassified ? "text-muted italic" : ""}`}>{r.watch ? `${r.watch.sets} ${r.watch.sets === 1 ? "serie" : "series"}${r.watch.reps ? ` · ${r.watch.reps} reps` : ""}${r.unclassified ? " sin clasificar" : ""}` : "—"}</span>
                </div>
              ))}
              <span className="pt-2 text-xs leading-snug text-muted">Se muestran juntos, sin mezclarse: el reloj sigue contando sus series y tiempos, y los kg salen solo de lo que anotaste.</span>
            </section>
          );
        })}
      </>
    );
  }

  // Not linked: is there a session of that day that overlaps this activity and another one?
  const [{ data: sessions }, { data: dayActivities }] = await Promise.all([
    db.from("logged_sessions").select("id, name, local_day, started_at, ended_at, logged_sets(logged_at)").is("link_source", null).eq("local_day", activity.local_day),
    db.from("activities").select("id, local_day, started_at, duration_s").in("sport", sportsInGroup("strength_training")).eq("local_day", activity.local_day).order("started_at"),
  ]);
  const toLink = (dayActivities ?? []).map((a) => ({ id: a.id, localDay: a.local_day, startedAt: a.started_at, durationS: a.duration_s }));
  const waiting = (sessions ?? []).flatMap((s) => {
    const lastSetAt = s.logged_sets.map((x) => x.logged_at).sort().at(-1) ?? null;
    const found = candidatesFor({ id: s.id, localDay: s.local_day, startedAt: s.started_at, endedAt: s.ended_at, lastSetAt, activityId: null, linkSource: null }, toLink);
    return found.length > 1 && found.some((a) => a.id === activityId) ? [{ session: s, found, end: s.ended_at ?? lastSetAt ?? s.started_at }] : [];
  });

  return waiting.map(({ session, found, end }) => (
    <SessionPicker
      key={session.id}
      sessionId={session.id}
      title={`Tu sesión «${session.name}» (${time.format(new Date(session.started_at))}–${time.format(new Date(end))}) se cruza con ${found.length} actividades de fuerza de ese día.`}
      options={found.map((a) => ({
        id: a.id,
        label: `Fuerza · ${a.startedAt ? time.format(new Date(a.startedAt)) : "?"}–${a.startedAt ? time.format(new Date(Date.parse(a.startedAt) + (a.durationS ?? 0) * 1000)) : "?"}`,
        sub: `${Math.round((a.durationS ?? 0) / 60)} min${a.id === activityId ? " · esta actividad" : ""}`,
      }))}
    />
  ));
}

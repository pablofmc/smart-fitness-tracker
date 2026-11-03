import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivityChart } from "@/components/activity-chart";
import { chartSeries, decodeActivityZip, lapRows, missingCharts, RUN_CHARTS, type LapRow } from "@/lib/activities/fit";
import { formatDuration, formatKm, sportGroup, sportsInGroup } from "@/lib/activities/list";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Actividad" };

const LONG_DATE = new Intl.DateTimeFormat("es", { weekday: "long", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const SYNCED = new Intl.DateTimeFormat("es", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const WHOLE = new Intl.NumberFormat("es", { maximumFractionDigits: 0, useGrouping: "always" });
const ZONE_COLORS = ["bg-field", "bg-nav-on", "bg-primary", "bg-amber-btn", "bg-warn-btn"];

const number = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : null);
const clean = (date: string) => date.replaceAll(".", "").replace(",", "");

function clock(seconds: number) {
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}` : `${m}:${String(s % 60).padStart(2, "0")}`;
}

function pace(speed: number, metres = 1000) {
  const minutes = metres / 60 / speed;
  return `${Math.floor(minutes)}:${String(Math.round((minutes % 1) * 60)).padStart(2, "0")}`;
}

/** Reads the archived .FIT through the session. A missing or broken file only hides the charts. */
async function readFit(db: Awaited<ReturnType<typeof createClient>>, path: string | undefined) {
  if (!path) return null;
  const { data } = await db.storage.from("raw").download(path);
  if (!data) return null;
  try {
    return decodeActivityZip(new Uint8Array(await data.arrayBuffer()));
  } catch {
    return null;
  }
}

export default async function ActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const db = await createClient();

  const [{ data: activity }, { data: fitFile }] = await Promise.all([
    db
      .from("activities")
      .select("id, name, sport, local_day, duration_s, distance_m, avg_hr, max_hr, data, activity_loads(trimp, zone_seconds, unavailable_reason, hr_settings(effective_from, lthr))")
      .eq("id", Number(id))
      .maybeSingle(),
    db.from("raw_files").select("id, storage_path, size_bytes, fetched_at").eq("kind", "activity_fit").eq("source_key", id).maybeSingle(),
  ]);
  if (!activity) notFound();

  const group = sportGroup(activity.sport);
  const usesSpeed = group === "Ciclismo";
  // Pools are measured in metres and per 100 m, and their cadence counts strokes, not steps.
  const isSwim = group === "Natación";
  const data = (activity.data ?? {}) as Record<string, unknown>;

  const [fit, { data: others }] = await Promise.all([
    readFit(db, fitFile?.storage_path),
    db
      .from("activities")
      .select("id, distance_m, duration_s")
      .in("sport", sportsInGroup(activity.sport))
      .lte("local_day", activity.local_day)
      .order("local_day", { ascending: false })
      .order("id", { ascending: false })
      .limit(8),
  ]);

  const series = fit ? chartSeries(fit.records, { speedAsPace: !usesSpeed }) : [];
  const missing = missingCharts(series, group === "Correr" ? RUN_CHARTS : []);
  const laps = fit ? lapRows(fit.laps).filter((lap) => lap.time_s) : [];
  const elevation = number(data.elevationGain);
  const calories = number(data.calories);
  const garminLoad = number(data.activityTrainingLoad);
  const load = activity.activity_loads;
  const zones = load?.zone_seconds ?? null;
  const zoneTotal = zones ? zones.reduce((sum, s) => sum + s, 0) : 0;

  const stats = [
    activity.duration_s === null ? null : { v: clock(activity.duration_s), l: "duración" },
    activity.distance_m
      ? isSwim
        ? { v: WHOLE.format(activity.distance_m), l: "m" }
        : { v: formatKm(activity.distance_m).replace(" km", ""), l: "km" }
      : null,
    elevation ? { v: `+${WHOLE.format(elevation)}`, l: "m desnivel" } : null,
    activity.avg_hr === null ? null : { v: WHOLE.format(activity.avg_hr), l: "FC media" },
    activity.max_hr === null ? null : { v: WHOLE.format(activity.max_hr), l: "FC máx" },
    load?.trimp != null ? { v: WHOLE.format(load.trimp), l: "TRIMP" } : null,
    // Garmin's own value, shown beside ours and never used in our formulas (R-LOAD-04, ADR-0004).
    garminLoad === null ? null : { v: WHOLE.format(garminLoad), l: "carga Garmin" },
    calories === null ? null : { v: WHOLE.format(calories), l: "kcal" },
  ].filter((stat) => stat !== null);

  // Compare by distance when the activity has one, otherwise by time.
  const byDistance = Boolean(activity.distance_m);
  const history = [...(others ?? [])].reverse().map((other) => ({ id: other.id, value: (byDistance ? other.distance_m : other.duration_s) ?? 0 }));
  const peak = Math.max(1, ...history.map((h) => h.value));

  const hasHr = laps.some((lap) => lap.hr);
  const hasCadence = !isSwim && laps.some((lap) => lap.cadence);
  const fastest = Math.max(0, ...laps.map((lap) => lap.speed ?? 0));
  const day = clean(LONG_DATE.format(new Date(`${activity.local_day}T00:00:00Z`)));

  return (
    <div className="flex flex-col gap-3.5">
      <Link href="/actividades" className="flex h-11 items-center gap-1.5 self-start rounded-full bg-card pr-3.5 pl-2.5 text-sm font-bold">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
          <path d="M15 6l-6 6 6 6" />
        </svg>
        Actividades
      </Link>

      <section className="flex flex-col gap-3 rounded-3xl bg-card p-5">
        <span className="text-[13px] font-semibold text-muted first-letter:uppercase">
          {day} · {group === "Otros" ? activity.sport.replaceAll("_", " ") : group}
        </span>
        <h1 className="text-2xl leading-tight font-extrabold">{activity.name ?? group}</h1>
        <dl className="grid grid-cols-3 gap-x-2.5 gap-y-3.5 pt-1">
          {stats.map((stat) => (
            <div key={stat.l} className="flex flex-col-reverse gap-px">
              <dt className="text-xs text-muted">{stat.l}</dt>
              <dd className="text-xl font-extrabold tabular-nums">{stat.v}</dd>
            </div>
          ))}
        </dl>
        {load?.unavailable_reason ? <span className="text-xs text-muted">Sin TRIMP: {load.unavailable_reason.toLowerCase()}.</span> : null}
      </section>

      {series.length ? (
        <section className="flex flex-col gap-3 rounded-3xl bg-card p-4">
          <ActivityChart series={series} missing={missing} />
          {zones && zoneTotal > 0 ? (
            <>
              <div className="flex h-2.5 gap-0.5 overflow-hidden rounded" aria-hidden>
                {zones.map((seconds, i) => (seconds > 0 ? <div key={i} className={ZONE_COLORS[i]} style={{ width: `${(seconds / zoneTotal) * 100}%` }} /> : null))}
              </div>
              <span className="text-xs text-muted">
                Zonas: {zones.map((seconds, i) => `Z${i + 1} ${Math.round(seconds / 60)}`).join(" · ")} min
                {load?.hr_settings ? ` · umbral ${load.hr_settings.lthr} lpm` : ""}
              </span>
            </>
          ) : null}
        </section>
      ) : fitFile ? (
        <p className="rounded-[20px] bg-card px-[18px] py-4 text-sm text-muted">Esta actividad no grabó datos por segundo, así que no hay gráficos.</p>
      ) : null}

      {laps.length > 1 ? (
        <section className="flex flex-col gap-2 rounded-3xl bg-card p-[18px]">
          <h2 className="mb-1 text-[17px] font-extrabold">Vueltas</h2>
          <table className="w-full border-collapse text-sm tabular-nums">
            <thead>
              <tr className="text-xs text-muted">
                <th className="py-1 text-left font-bold">Vuelta</th>
                <th className="w-[42%] text-left font-bold">{usesSpeed ? "Velocidad" : isSwim ? "Ritmo /100 m" : "Ritmo"}</th>
                {hasHr ? <th className="text-right font-bold">FC</th> : null}
                {hasCadence ? <th className="text-right font-bold">Cad.</th> : null}
              </tr>
            </thead>
            <tbody>
              {laps.map((lap: LapRow, index) => (
                <tr key={index} className="border-t border-field">
                  <td className="py-2.5 font-semibold">
                    {index + 1}
                    {lap.distance_m ? ` · ${isSwim ? `${WHOLE.format(lap.distance_m)} m` : formatKm(lap.distance_m)}` : ` · ${formatDuration(lap.time_s ?? 0)}`}
                  </td>
                  <td>
                    {lap.speed && lap.speed > 0.5 ? (
                      <div className="flex items-center gap-2">
                        <div aria-hidden className="h-2 rounded bg-primary" style={{ width: `${Math.round((lap.speed / fastest) * 60)}px` }} />
                        <span className="font-bold">{usesSpeed ? `${(lap.speed * 3.6).toFixed(1).replace(".", ",")} km/h` : isSwim ? pace(lap.speed, 100) : pace(lap.speed)}</span>
                      </div>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  {hasHr ? <td className="text-right">{lap.hr ?? "—"}</td> : null}
                  {hasCadence ? <td className="text-right">{lap.cadence === null ? "—" : Math.round(lap.cadence)}</td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}

      {history.length > 1 ? (
        <section className="flex flex-col gap-2.5 rounded-3xl bg-card p-[18px]">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[17px] font-extrabold">Frente a tus otras actividades de {group === "Otros" ? "este deporte" : group.toLowerCase()}</h2>
            <span className="shrink-0 text-xs text-muted">últimas {history.length}</span>
          </div>
          <div className="grid h-20 grid-cols-8 items-end gap-1.5" aria-hidden>
            {history.map((h) => (
              <div key={h.id} className={`rounded-md ${h.id === activity.id ? "bg-primary" : "bg-field"}`} style={{ height: `${Math.max(4, Math.round((h.value / peak) * 76))}px` }} />
            ))}
          </div>
          <span className="text-[13px] text-muted">Por {byDistance ? "distancia" : "duración"}; la barra oscura es esta.</span>
        </section>
      ) : null}

      {fitFile ? (
        <section className="flex items-center justify-between gap-3 rounded-[20px] bg-card px-[18px] py-3.5">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-bold">Archivo original</span>
            <span className="text-xs text-muted">
              .FIT · {WHOLE.format(Math.round(fitFile.size_bytes / 1024))} KB · sincronizado {clean(SYNCED.format(new Date(fitFile.fetched_at)))}
            </span>
          </div>
          <a href={`/api/raw/${fitFile.id}`} className="flex h-11 items-center rounded-full bg-sunk px-3.5 text-[13px] font-bold">
            Descargar
          </a>
        </section>
      ) : null}
    </div>
  );
}

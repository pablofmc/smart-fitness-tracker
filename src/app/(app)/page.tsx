import { Checkin } from "@/components/checkin";
import { SyncNotice } from "@/components/sync-notice";
import { TodayHeader } from "@/components/today-header";
import { formatDuration, formatKm, sportGroup } from "@/lib/activities/list";
import { recentSportOrder } from "@/lib/activities/recent";
import { formatRelativeTime } from "@/lib/format";
import { getGarminKeyStatus } from "@/lib/garmin/key";
import { HEALTH_METRIC_KINDS, metricByKey, metricSeries } from "@/lib/health/metrics";
import { readHealthDays } from "@/lib/health/read";
import { mondayOf } from "@/lib/load/weekly";
import { baseline, type Baseline } from "@/lib/metrics/baseline";
import { dailyLoads, formCurve } from "@/lib/metrics/form";
import { dayVerdict } from "@/lib/metrics/verdict";
import { createClient } from "@/lib/supabase/server";
import { addDays } from "@/lib/sync/streams";
import { getSyncOverview } from "@/lib/sync/overview";
import { ownerToday } from "@/lib/today";

const WHOLE = new Intl.NumberFormat("es", { maximumFractionDigits: 0 });
const SIGNED = new Intl.NumberFormat("es", { maximumFractionDigits: 0, signDisplay: "exceptZero" });
const DAY_LETTERS = ["L", "M", "M", "J", "V", "S", "D"];
const SPORT_COLORS = ["bg-primary", "bg-amber-btn", "bg-accent", "bg-warn-btn"];

function hours(h: number) {
  return formatDuration(h * 3600);
}

function vsRange(b: Baseline, format: (v: number) => string) {
  if (!b.available) return "Sin línea base aún: hacen falta al menos 14 días de datos.";
  const where = b.position === "below" ? "Por debajo de" : b.position === "above" ? "Por encima de" : "Dentro de";
  return `${where} tu rango normal (${format(b.low)}–${format(b.high)}).`;
}

export default async function HoyPage() {
  const today = await ownerToday();
  const db = await createClient();
  const [key, sync, health, { data: acts }, { data: tags }, { data: checkin }] = await Promise.all([
    getGarminKeyStatus(),
    getSyncOverview(),
    readHealthDays(HEALTH_METRIC_KINDS, addDays(today, -70)),
    db.from("activities").select("local_day, sport, distance_m, duration_s, activity_loads(trimp, zone_seconds)").gte("local_day", addDays(today, -400)).order("local_day"),
    db.from("checkin_tags").select("name").order("created_at"),
    db.from("checkins").select("feel, tags, weight_kg, note").eq("day", today).maybeSingle(),
  ]);
  const syncLabel = sync.lastSuccessAt ? formatRelativeTime(sync.lastSuccessAt, new Date()) : "Sin sincronizar";

  const series = (k: string) => metricSeries(metricByKey(k)!, health);
  const sleep = series("sleep");
  const hrvB = baseline(series("hrv"), today, { recent: 7 });
  const sleepB = baseline(sleep, today, { recent: 1 });
  const restB = baseline(series("restingHr"), today, { recent: 7 });
  const score = series("sleepScore").find((d) => d.day === today)?.value;
  const battery = series("bodyBattery").find((d) => d.day === today)?.value;
  const stress = series("stress").find((d) => d.day === addDays(today, -1))?.value;

  const activities = (acts ?? []).map((a) => ({
    day: a.local_day,
    sport: a.sport,
    distance: a.distance_m ?? 0,
    duration: a.duration_s ?? 0,
    trimp: a.activity_loads?.trimp ?? null,
    zoneSeconds: a.activity_loads?.zone_seconds ?? null,
  }));
  const curve = formCurve(dailyLoads(activities.filter((a) => a.trimp !== null).map((a) => ({ day: a.day, trimp: a.trimp! }))), today);
  const tsb = curve.length ? curve[curve.length - 1].tsb : null;
  const verdict = dayVerdict({ hrv: hrvB, sleep: sleepB, tsb });

  const order = recentSportOrder(activities, today);
  const colorOf = (group: string) => SPORT_COLORS[order.findIndex((s) => s.group === group)] ?? "bg-line";
  const monday = mondayOf(today);
  const thisWeek = activities.filter((a) => a.day >= monday && a.day <= today);
  const days = DAY_LETTERS.map((letter, i) => {
    const day = addDays(monday, i);
    const items = thisWeek.filter((a) => a.day === day);
    const load = items.reduce((s, a) => s + (a.trimp ?? 0), 0);
    const top = items.sort((a, b) => (b.trimp ?? 0) - (a.trimp ?? 0))[0];
    return { letter, day, load, color: top ? colorOf(sportGroup(top.sport)) : "bg-field" };
  });
  const peak = Math.max(1, ...days.map((d) => d.load));
  const weekKm = thisWeek.reduce((s, a) => s + a.distance, 0);
  const weekTime = thisWeek.reduce((s, a) => s + a.duration, 0);

  const cards = [
    {
      label: sleepB.available || sleep.length ? `Sueño${sleepB.available ? ` · ${hours(sleepB.value)}` : ""}` : "Sueño",
      badge: score === undefined ? "—" : WHOLE.format(score),
      text: vsRange(sleepB, hours),
      tone: sleepB.available && sleepB.position === "below" ? "warm" : "cool",
    },
    {
      label: hrvB.available ? `HRV · ${WHOLE.format(hrvB.value)} ms (7 días)` : "HRV",
      badge: hrvB.available ? SIGNED.format(hrvB.value - hrvB.mean) : "—",
      text: vsRange(hrvB, (v) => `${WHOLE.format(v)} ms`),
      tone: hrvB.available && hrvB.position === "below" ? "warm" : "cool",
    },
    {
      label: `Body Battery${battery === undefined ? "" : ` · ${WHOLE.format(battery)}`}`,
      badge: battery === undefined ? "—" : WHOLE.format(battery),
      text: [stress === undefined ? null : `Estrés medio ayer ${WHOLE.format(stress)}.`, restB.available ? `FC en reposo ${WHOLE.format(restB.value)} lpm: ${vsRange(restB, (v) => WHOLE.format(v)).toLowerCase()}` : null]
        .filter(Boolean)
        .join(" ") || "Sin datos de hoy todavía.",
      tone: "warm",
    },
  ];

  return (
    <div className="flex flex-col gap-3.5">
      <TodayHeader syncLabel={syncLabel} />
      <SyncNotice keyStatus={key} lastFailed={sync.lastFailed} stopped={sync.stopped} history={sync.history} activityCount={sync.activityCount} />

      <section className="flex flex-col gap-3.5 rounded-3xl bg-hero px-5 py-[22px] text-on-hero">
        <h1 className="text-[26px] leading-tight font-extrabold">{verdict.sentence}</h1>
        <p className="text-[15px] leading-normal opacity-90">{verdict.detail}</p>
        <details className="group">
          <summary className="flex h-11 w-fit cursor-pointer list-none items-center rounded-full bg-white/90 px-4 text-sm font-bold text-ink">Por qué</summary>
          <div className="mt-3 flex flex-col gap-1 text-sm opacity-90">
            <span className="font-bold">Regla {verdict.rule}</span>
            {verdict.inputs.map((input) => (
              <span key={input}>{input}</span>
            ))}
          </div>
        </details>
      </section>

      {cards.map((card) => (
        <section key={card.label} className="flex items-center gap-3.5 rounded-[20px] bg-card px-[18px] py-4">
          <div className={`flex size-[60px] shrink-0 items-center justify-center rounded-[18px] text-xl font-extrabold ${card.tone === "warm" ? "bg-amber-bg text-amber-title" : "bg-nav-on text-on-nav-on"}`}>
            {card.badge}
          </div>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[13px] font-bold text-muted">{card.label}</span>
            <span className="text-[15px] leading-snug">{card.text}</span>
          </div>
        </section>
      ))}

      <section className="flex flex-col gap-3 rounded-[20px] bg-card p-[18px]">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[17px] font-extrabold">Tu semana</h2>
          {tsb !== null ? <span className="text-[13px] text-muted">Forma {WHOLE.format(tsb)}</span> : null}
        </div>
        <div className="grid h-24 grid-cols-7 items-end gap-1.5">
          {days.map((d) => (
            <div key={d.day} className="flex h-full flex-col items-center justify-end gap-1.5">
              <div className={`w-full rounded-md ${d.load > 0 ? d.color : "bg-field"}`} style={{ height: `${Math.max(4, Math.round((d.load / peak) * 72))}px` }} />
              <span className={`text-xs text-muted ${d.day === today ? "font-extrabold" : "font-semibold"}`}>{d.letter}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-muted">
          {order.slice(0, 4).map((s) => (
            <span key={s.group} className="flex items-center gap-1">
              <span className={`inline-block size-2.5 rounded-full ${colorOf(s.group)}`} />
              {s.group}
            </span>
          ))}
          <span>{[weekKm > 0 ? formatKm(weekKm) : null, weekTime > 0 ? formatDuration(weekTime) : null].filter(Boolean).join(" · ") || "Sin actividades esta semana"}</span>
        </div>
      </section>

      {order.length ? (
        <section className="flex flex-col gap-2 rounded-[20px] bg-card p-[18px]">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[17px] font-extrabold">Tus deportes</h2>
            <span className="text-xs text-muted">últimas 4 semanas</span>
          </div>
          {order.map((s) => (
            <div key={s.group} className="flex items-center justify-between gap-3 border-t border-field py-2 text-sm">
              <span className="flex items-center gap-2 font-bold">
                <span className={`inline-block size-2.5 rounded-full ${colorOf(s.group)}`} />
                {s.group}
              </span>
              <span className="text-muted tabular-nums">{s.count === 1 ? "1 sesión" : `${s.count} sesiones`}</span>
            </div>
          ))}
        </section>
      ) : null}

      <Checkin
        day={today}
        tags={(tags ?? []).map((t) => t.name)}
        saved={checkin ? { feel: checkin.feel, tags: checkin.tags, weightKg: checkin.weight_kg, note: checkin.note } : null}
      />
    </div>
  );
}

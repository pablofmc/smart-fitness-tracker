import { ActivityTabs } from "@/components/activity-tabs";
import { NoDataYet } from "@/components/onboarding";
import type { Metadata } from "next";
import Link from "next/link";
import {
  formatDuration,
  formatRowDate,
  groupByWeek,
  headline,
  periodStart,
  pickPeriod,
  PERIODS,
  sportChips,
  sportGroup,
  type ListedActivity,
} from "@/lib/activities/list";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Actividades" };

const PAGE_SIZE = 1000;
const ALL = "Todas";
const COUNT = new Intl.NumberFormat("es", { useGrouping: "always" });

export const ICONS: Record<string, string> = {
  Correr: "M3 12h4l3-8 4 16 3-8h4",
  Fuerza: "M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12",
  Caminata: "M3 20l6-10 4 6 3-4 5 8z",
  Natación: "M2 16c2 0 2-1.5 4-1.5S8 16 10 16s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5M8 11l4-4 3 3",
};

/** Pages past the API's row limit, so "Todo" really is the full history. */
async function readActivities(from: string | null) {
  const db = await createClient();
  const rows: ListedActivity[] = [];
  for (let start = 0; ; start += PAGE_SIZE) {
    let query = db.from("activities").select("id, name, sport, local_day, duration_s, distance_m, avg_hr, exercise_count, activity_loads(trimp)");
    if (from) query = query.gte("local_day", from);
    const { data, error } = await query
      .order("local_day", { ascending: false })
      .order("id", { ascending: false })
      .range(start, start + PAGE_SIZE - 1);
    if (error) throw new Error("No pudimos leer tus actividades.");
    rows.push(...data.map(({ activity_loads, ...activity }) => ({ ...activity, trimp: activity_loads?.trimp ?? null })));
    if (data.length < PAGE_SIZE) return rows;
  }
}

function count(total: number) {
  return `${COUNT.format(total)} ${total === 1 ? "actividad" : "actividades"}`;
}

export default async function ActividadesPage({ searchParams }: { searchParams: Promise<{ deporte?: string; periodo?: string }> }) {
  const params = await searchParams;
  const period = pickPeriod(params.periodo);
  const today = new Date().toISOString().slice(0, 10);

  const inPeriod = await readActivities(periodStart(period, today));
  const groups = sportChips(inPeriod);
  const sport = params.deporte && groups.includes(params.deporte) ? params.deporte : ALL;
  const shown = sport === ALL ? inPeriod : inPeriod.filter((activity) => sportGroup(activity.sport) === sport);
  const weeks = groupByWeek(shown, today);

  const href = (next: { deporte?: string; periodo?: string }) => {
    const query = new URLSearchParams({ periodo: next.periodo ?? period.key });
    const nextSport = next.deporte ?? sport;
    if (nextSport !== ALL) query.set("deporte", nextSport);
    return `/actividades?${query}`;
  };

  return (
    <div className="flex flex-col gap-3.5">
      <ActivityTabs current="actividades" />
      <NoDataYet />
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="text-[28px] font-extrabold">Actividades</h1>
        <span className="text-[13px] text-muted">{count(shown.length)}</span>
      </div>

      <div role="group" aria-label="Deporte" className="flex flex-wrap gap-2">
        {[ALL, ...groups].map((group) => (
          <Link
            key={group}
            href={href({ deporte: group })}
            aria-current={group === sport ? "true" : undefined}
            className={`flex h-10 items-center rounded-full px-4 text-sm font-bold ${group === sport ? "bg-primary text-on-primary" : "bg-card text-ink-soft"}`}
          >
            {group}
          </Link>
        ))}
      </div>

      <div role="group" aria-label="Periodo" className="grid grid-cols-4 gap-1 rounded-2xl bg-card p-1">
        {PERIODS.map((option) => (
          <Link
            key={option.key}
            href={href({ periodo: option.key })}
            aria-current={option.key === period.key ? "true" : undefined}
            className={`flex h-10 items-center justify-center rounded-xl text-[13px] font-bold ${option.key === period.key ? "bg-primary text-on-primary" : "text-ink-soft"}`}
          >
            {option.label}
          </Link>
        ))}
      </div>

      {weeks.map((week) => (
        <section key={week.monday} className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3 px-0.5 pt-1.5">
            <h2 className="text-[15px] font-extrabold">{week.label}</h2>
            <span className="text-xs font-semibold text-muted">{sport === ALL ? week.total : count(week.items.length)}</span>
          </div>
          {week.items.map((activity) => {
            const main = headline(activity);
            return (
              <Link
                key={activity.id}
                href={`/actividades/${activity.id}`}
                className="grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-3 rounded-[20px] bg-card px-4 py-3.5 outline-primary focus-visible:outline-2"
              >
                <div aria-hidden="true" className="flex size-11 items-center justify-center rounded-[14px] bg-nav-on text-on-nav-on">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={ICONS[sportGroup(activity.sport)] ?? ICONS.Correr} />
                  </svg>
                </div>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-[15px] font-bold">{activity.name ?? sportGroup(activity.sport)}</span>
                  <span className="text-[13px] text-muted">
                    {formatRowDate(activity.local_day)}
                    {activity.duration_s === null ? "" : ` · ${formatDuration(activity.duration_s)}`}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  {main ? <span className="text-[15px] font-extrabold tabular-nums">{main}</span> : null}
                  <span className="text-xs font-semibold text-muted">
                    {activity.trimp != null ? `${Math.round(activity.trimp)} TRIMP` : activity.avg_hr === null ? "sin FC" : ""}
                  </span>
                </div>
              </Link>
            );
          })}
        </section>
      ))}

      {weeks.length === 0 ? (
        <p className="rounded-[20px] bg-card px-[18px] py-6 text-center text-[15px] text-muted">Sin actividades de este deporte en el periodo.</p>
      ) : null}
    </div>
  );
}

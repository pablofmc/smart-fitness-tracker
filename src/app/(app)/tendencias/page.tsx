import type { Metadata } from "next";
import Link from "next/link";
import { FormChart } from "@/components/form-chart";
import { periodStart, pickPeriod, PERIODS } from "@/lib/activities/list";
import { weeklyLoad, type LoadedActivity } from "@/lib/load/weekly";
import { dailyLoads, formCurve } from "@/lib/metrics/form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Tendencias" };

const PAGE_SIZE = 1000;
const ZONE_COLORS = ["bg-field", "bg-nav-on", "bg-primary", "bg-amber-btn", "bg-warn-btn"];
const SPORT_COLORS: Record<string, string> = { Correr: "bg-primary", Fuerza: "bg-amber-btn", HIIT: "bg-warn-btn", Caminata: "bg-nav-on", Ciclismo: "bg-accent" };
const WHOLE = new Intl.NumberFormat("es", { maximumFractionDigits: 0 });
const SHORT = new Intl.DateTimeFormat("es", { day: "numeric", month: "short", timeZone: "UTC" });

/** Every activity's load, past the API's row limit. The form curve needs the whole history to warm up. */
async function readLoads(): Promise<LoadedActivity[]> {
  const db = await createClient();
  const rows: LoadedActivity[] = [];
  for (let start = 0; ; start += PAGE_SIZE) {
    const { data, error } = await db
      .from("activities")
      .select("local_day, sport, activity_loads(trimp, zone_seconds)")
      .order("local_day")
      .order("id")
      .range(start, start + PAGE_SIZE - 1);
    if (error) throw new Error("No pudimos leer tu carga.");
    rows.push(...data.map((a) => ({ day: a.local_day, sport: a.sport, trimp: a.activity_loads?.trimp ?? null, zoneSeconds: a.activity_loads?.zone_seconds ?? null })));
    if (data.length < PAGE_SIZE) return rows;
  }
}

export default async function TendenciasPage({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  const period = pickPeriod((await searchParams).periodo ?? "3m");
  const today = new Date().toISOString().slice(0, 10);
  const activities = await readLoads();
  const loaded = activities.filter((a) => a.trimp !== null);

  const curve = formCurve(dailyLoads(loaded.map((a) => ({ day: a.day, trimp: a.trimp! }))), today);
  const from = periodStart(period, today) ?? curve[0]?.day ?? today;
  const shown = curve.filter((d) => d.day >= from);
  const last = shown[shown.length - 1];
  const weeks = weeklyLoad(activities, from, today).slice(-12);
  const zonePeak = Math.max(1, ...weeks.map((w) => w.zones.reduce((s, z) => s + z, 0)));
  const sportPeak = Math.max(1, ...weeks.map((w) => Object.values(w.bySport).reduce((s, v) => s + v, 0)));
  const sports = [...new Set(weeks.flatMap((w) => Object.keys(w.bySport)))];

  return (
    <div className="flex flex-col gap-3.5">
      <h1 className="text-[28px] font-extrabold">Tendencias</h1>

      <div role="group" aria-label="Periodo" className="grid grid-cols-4 gap-1 rounded-2xl bg-card p-1">
        {PERIODS.map((option) => (
          <Link
            key={option.key}
            href={`/tendencias?periodo=${option.key}`}
            aria-current={option.key === period.key ? "true" : undefined}
            className={`flex h-10 items-center justify-center rounded-xl text-[13px] font-bold ${option.key === period.key ? "bg-primary text-on-primary" : "text-ink-soft"}`}
          >
            {option.label}
          </Link>
        ))}
      </div>

      <section className="flex flex-col gap-2.5 rounded-3xl bg-card p-[18px]">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-[17px] font-extrabold">Forma y fatiga</h2>
          {last ? <span className="text-[13px] text-muted">TSB {WHOLE.format(last.tsb)}</span> : null}
        </div>
        {last ? (
          <>
            <FormChart days={shown} />
            <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-xs text-muted">
              <span>
                <span className="text-primary">━</span> Forma (CTL) {WHOLE.format(last.ctl)}
              </span>
              <span>
                <span className="text-warn-line">┅</span> Fatiga (ATL) {WHOLE.format(last.atl)}
              </span>
              <span>▮ Frescura (TSB)</span>
            </div>
            <span className="text-xs leading-snug text-muted">
              Calculado con tu TRIMP de {WHOLE.format(loaded.length)} de {WHOLE.format(activities.length)} actividades; las que no tienen FC no suman carga. Garmin no
              envía su forma ni su disposición por esta API, así que no hay valor suyo para comparar.
            </span>
          </>
        ) : (
          <p className="text-sm text-muted">Aún no hay carga calculada. Aparece después de la próxima sincronización.</p>
        )}
      </section>

      {weeks.length ? (
        <section className="flex flex-col gap-2.5 rounded-3xl bg-card p-[18px]">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[17px] font-extrabold">Tiempo en zonas por semana</h2>
            <span className="text-[13px] text-muted">últimas {weeks.length}</span>
          </div>
          <div className="grid h-24 items-end gap-1" style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }}>
            {weeks.map((w) => (
              <div key={w.monday} className="flex h-full flex-col-reverse gap-px" title={`Semana del ${SHORT.format(new Date(`${w.monday}T00:00:00Z`))}`}>
                {w.zones.map((s, i) => (s > 0 ? <div key={i} className={`rounded-sm ${ZONE_COLORS[i]}`} style={{ height: `${(s / zonePeak) * 100}%` }} /> : null))}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-x-3 text-xs text-muted">
            {ZONE_COLORS.map((c, i) => (
              <span key={c} className="flex items-center gap-1">
                <span className={`inline-block size-2.5 rounded-sm ${c}`} />Z{i + 1}
              </span>
            ))}
          </div>
          <span className="text-xs text-muted">
            Esta semana: {weeks[weeks.length - 1].zones.map((s, i) => `Z${i + 1} ${Math.round(s / 60)}`).join(" · ")} min
          </span>
        </section>
      ) : null}

      {weeks.length ? (
        <section className="flex flex-col gap-2.5 rounded-3xl bg-card p-[18px]">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[17px] font-extrabold">Carga por deporte</h2>
            <span className="text-[13px] text-muted">TRIMP por semana</span>
          </div>
          <div className="grid h-24 items-end gap-1" style={{ gridTemplateColumns: `repeat(${weeks.length}, minmax(0, 1fr))` }}>
            {weeks.map((w) => (
              <div key={w.monday} className="flex h-full flex-col-reverse gap-px">
                {sports.map((sport) =>
                  w.bySport[sport] ? <div key={sport} className={`rounded-sm ${SPORT_COLORS[sport] ?? "bg-line"}`} style={{ height: `${(w.bySport[sport] / sportPeak) * 100}%` }} /> : null,
                )}
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-x-3 text-xs text-muted">
            {sports.map((sport) => (
              <span key={sport} className="flex items-center gap-1">
                <span className={`inline-block size-2.5 rounded-sm ${SPORT_COLORS[sport] ?? "bg-line"}`} />
                {sport}
              </span>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

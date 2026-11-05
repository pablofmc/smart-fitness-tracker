import { sportsInGroup } from "@/lib/activities/list";
import { createClient } from "@/lib/supabase/server";
import { GROUP_COLORS } from "./format";
import { GROUP_ORDER, MUSCLE_GROUPS, UNCLASSIFIED, weeklySets, type GroupName } from "./sets";

const PAGE_SIZE = 1000;
const ONE = new Intl.NumberFormat("es", { maximumFractionDigits: 1 });
const SHORT = new Intl.DateTimeFormat("es", { day: "numeric", month: "short", timeZone: "UTC" });

/** The strength module in Tendencias (R-STR-04, R-STR-06): sets per muscle group per week, and how often each is trained. */
export async function StrengthTrends({ from, today }: { from: string; today: string }) {
  const db = await createClient();
  const rows: { day: string; groupSets: Partial<Record<GroupName, number>> }[] = [];
  for (let start = 0; ; start += PAGE_SIZE) {
    const { data, error } = await db
      .from("activities")
      .select("local_day, strength_sessions(group_sets)")
      .in("sport", sportsInGroup("strength_training"))
      .gte("local_day", from)
      .order("local_day")
      .order("id")
      .range(start, start + PAGE_SIZE - 1);
    if (error) throw new Error("No pudimos leer tus series.");
    rows.push(...data.filter((a) => a.strength_sessions).map((a) => ({ day: a.local_day, groupSets: a.strength_sessions!.group_sets as Partial<Record<GroupName, number>> })));
    if (data.length < PAGE_SIZE) break;
  }
  if (rows.length === 0) return null;

  const weeks = weeklySets(rows, from, today);
  const shown = weeks.slice(-12);
  const peak = Math.max(1, ...shown.map((w) => Object.values(w.sets).reduce((sum, n) => sum + (n ?? 0), 0)));
  const groups = GROUP_ORDER.filter((g) => shown.some((w) => w.sets[g]));

  // Over the whole period, not just the bars shown.
  const total = weeks.reduce((sum, w) => sum + Object.values(w.sets).reduce((s, n) => s + (n ?? 0), 0), 0);
  const unknown = weeks.reduce((sum, w) => sum + (w.sets[UNCLASSIFIED] ?? 0), 0);
  const [top] = MUSCLE_GROUPS.map((g) => ({ group: g, sessions: weeks.reduce((sum, w) => sum + (w.sessions[g] ?? 0), 0) }))
    .filter((g) => g.sessions > 0)
    .sort((a, b) => b.sessions - a.sessions);

  return (
    <section className="flex flex-col gap-2.5 rounded-3xl bg-card p-[18px]">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[17px] font-extrabold">Fuerza · series por semana</h2>
        <span className="text-[13px] text-muted">por grupo muscular</span>
      </div>
      <div className="grid h-24 items-end gap-1" style={{ gridTemplateColumns: `repeat(${shown.length}, minmax(0, 1fr))` }}>
        {shown.map((w) => (
          <div key={w.monday} className="flex h-full flex-col-reverse gap-px" title={`Semana del ${SHORT.format(new Date(`${w.monday}T00:00:00Z`))}`}>
            {groups.map((g) => (w.sets[g] ? <div key={g} className={`rounded-sm ${GROUP_COLORS[g]}`} style={{ height: `${(w.sets[g]! / peak) * 100}%` }} /> : null))}
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 text-xs text-muted">
        {groups.map((g) => (
          <span key={g} className="flex items-center gap-1">
            <span className={`inline-block size-2.5 rounded-sm ${GROUP_COLORS[g]}`} />
            {g}
          </span>
        ))}
      </div>
      <span className="text-sm leading-snug">
        {top ? `${top.group} ${ONE.format(top.sessions / weeks.length)} veces por semana de media. ` : ""}
        {total ? (
          <>
            {Math.round((unknown / total) * 100)} % de las series quedan <strong>sin clasificar</strong>.
          </>
        ) : null}
      </span>
    </section>
  );
}

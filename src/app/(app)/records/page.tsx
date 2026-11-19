import type { Metadata } from "next";
import Link from "next/link";
import { ActivityTabs } from "@/components/activity-tabs";
import { recordBoard, strengthRecords, type BoardRow } from "@/lib/metrics/strength";
import { addDays } from "@/lib/sync/streams";
import { ownerToday } from "@/lib/today";
import { GROUP_ORDER } from "@/modules/strength/sets";
import { readLoggedSets } from "@/modules/workouts/read-sets";
import { readWeightUnit } from "@/lib/account/weight-unit";
import { formatWeight } from "@/lib/units";
import { shortDay } from "./format";

export const metadata: Metadata = { title: "Récords" };

const SORTS = [
  { key: "recientes", label: "Recientes" },
  { key: "grupo", label: "Por grupo" },
  { key: "az", label: "A–Z" },
] as const;
type Sort = (typeof SORTS)[number]["key"];

function mondayOf(day: string) {
  return addDays(day, -((new Date(`${day}T00:00:00Z`).getUTCDay() + 6) % 7));
}

/** Every exercise I logged with weight, with its heaviest set and best estimated 1RM (R-STR-03, canvas: C2-Records). */
export default async function RecordsPage({ searchParams }: { searchParams: Promise<{ orden?: string }> }) {
  const { orden } = await searchParams;
  const sort: Sort = SORTS.some((s) => s.key === orden) ? (orden as Sort) : "recientes";
  const [today, { sets, labels }, unit] = await Promise.all([ownerToday(), readLoggedSets(), readWeightUnit()]);
  const board = recordBoard(sets);
  const label = (id: string) => labels.get(id) ?? id;

  // Records set this week (the first set of an exercise is only its baseline, never a record).
  const monday = mondayOf(today);
  const fresh = new Map<string, { kg: number; e1rm: number | null; weight: boolean }>();
  for (const r of strengthRecords(sets)) if (r.day >= monday) fresh.set(r.exercise, { kg: r.kg, e1rm: r.e1rm, weight: r.kinds.includes("weight") || (fresh.get(r.exercise)?.weight ?? false) });
  const freshWords = [...fresh.entries()].slice(0, 3).map(([id, r], i) => {
    const name = i === 0 ? label(id) : label(id).toLowerCase();
    return r.weight ? `${name} subió a ${formatWeight(r.kg, unit)}` : `${name} llegó a un 1RM de ${formatWeight(r.e1rm ?? r.kg, unit)}`;
  });

  const byRecent = [...board].sort((a, b) => b.bestDay.localeCompare(a.bestDay) || label(a.exercise).localeCompare(label(b.exercise), "es"));
  const byName = [...board].sort((a, b) => label(a.exercise).localeCompare(label(b.exercise), "es"));
  const sections: { title: string | null; rows: BoardRow[] }[] =
    sort === "grupo"
      ? GROUP_ORDER.map((g) => ({ title: g, rows: byName.filter((r) => r.group === g) })).filter((s) => s.rows.length)
      : [{ title: null, rows: sort === "az" ? byName : byRecent }];
  const since = board.length ? board.map((r) => r.firstDay).sort()[0] : null;

  return (
    <div className="flex max-w-xl flex-col gap-3.5">
      <ActivityTabs current="records" />
      <div className="flex flex-col gap-1">
        <h1 className="text-[28px] font-extrabold">Récords</h1>
        <span className="text-sm text-muted">
          {since ? `${board.length} ${board.length === 1 ? "ejercicio" : "ejercicios"} con peso anotado · desde el ${shortDay(since)}` : "Tu mejor marca de cada ejercicio"}
        </span>
      </div>

      {board.length === 0 ? (
        <section className="flex flex-col items-center gap-2.5 rounded-3xl bg-card px-5 py-7 text-center">
          <svg viewBox="0 0 24 24" aria-hidden className="size-10 fill-none stroke-current text-muted" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" />
            <path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4" />
          </svg>
          <span className="text-[17px] font-extrabold">Todavía no hay récords</span>
          <span className="text-sm leading-normal text-muted">Anota el peso y las reps de tus series en una sesión y aquí aparece tu mejor marca de cada ejercicio. El reloj no registra pesos.</span>
          <Link href="/rutinas" className="mt-1 flex h-11 items-center rounded-full bg-primary px-[18px] text-sm font-extrabold text-on-primary">
            Ir a Rutinas
          </Link>
        </section>
      ) : (
        <>
          {freshWords.length ? (
            <section className="flex flex-col gap-1 rounded-[20px] bg-amber-bg px-4 py-3.5 text-amber-text">
              <span className="text-xs font-extrabold tracking-wide">
                ESTA SEMANA · {fresh.size} {fresh.size === 1 ? "RÉCORD NUEVO" : "RÉCORDS NUEVOS"}
              </span>
              <span className="text-[15px] leading-snug font-semibold">
                {freshWords.length > 1 ? `${freshWords.slice(0, -1).join(", ")} y ${freshWords.at(-1)}` : freshWords[0]}
                {fresh.size > freshWords.length ? `, y ${fresh.size - freshWords.length} más` : ""}.
              </span>
            </section>
          ) : null}

          <nav aria-label="Ordenar" className="flex gap-1.5">
            {SORTS.map((s) => (
              <Link
                key={s.key}
                href={s.key === "recientes" ? "/records" : `/records?orden=${s.key}`}
                aria-current={s.key === sort ? "true" : undefined}
                scroll={false}
                className={`flex h-9 items-center rounded-full px-3.5 text-[13px] font-bold ${s.key === sort ? "bg-primary text-on-primary" : "bg-sunk"}`}
              >
                {s.label}
              </Link>
            ))}
          </nav>

          {sections.map((section) => (
            <section key={section.title ?? "all"} className="flex flex-col rounded-3xl bg-card px-4 py-1.5">
              {section.title ? <h2 className="pt-3 pb-1.5 text-[13px] font-extrabold tracking-wide text-muted uppercase">{section.title}</h2> : null}
              {section.rows.map((r, i) => (
                <Link
                  key={r.exercise}
                  href={`/records/${encodeURIComponent(r.exercise)}`}
                  className={`grid min-h-16 grid-cols-[minmax(0,1fr)_auto_18px] items-center gap-3 py-2.5 ${i ? "border-t border-field" : ""}`}
                >
                  <span className="flex min-w-0 flex-col gap-[3px]">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-[15px] font-extrabold">{label(r.exercise)}</span>
                      {fresh.has(r.exercise) ? <span className="shrink-0 rounded-[10px] bg-amber-btn px-2 py-0.5 text-[11px] font-extrabold text-on-amber-btn">Nuevo</span> : null}
                    </span>
                    <span className="text-xs text-muted">Mejor marca el {shortDay(r.bestDay)}</span>
                  </span>
                  <span className="flex flex-col items-end gap-0.5 tabular-nums">
                    <span className="text-lg font-extrabold">{formatWeight(r.heaviest.kg, unit)}</span>
                    <span className="text-xs text-muted">
                      × {r.heaviest.reps} · {r.best1rm ? `1RM ${formatWeight(r.best1rm.value, unit)}` : "sin 1RM: más de 10 reps"}
                    </span>
                  </span>
                  <svg viewBox="0 0 24 24" aria-hidden className="size-[18px] fill-none stroke-current text-muted" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </Link>
              ))}
            </section>
          ))}

          <p className="text-xs leading-normal text-muted">
            Peso máximo: la serie más pesada que anotaste, con sus reps. 1RM estimado con la fórmula de Epley (series de 1 a 10 reps). Solo cuentan las series que anotas.
          </p>
        </>
      )}
    </div>
  );
}

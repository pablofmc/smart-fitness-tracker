import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { bestByReps, recordBoard, sessionBests, weightProgression } from "@/lib/metrics/strength";
import { readLoggedSets } from "@/modules/workouts/read-sets";
import { readWeightUnit } from "@/lib/account/weight-unit";
import { formatWeight } from "@/lib/units";
import { shortDay } from "../format";
import { Calculator } from "./calculator";
import { RecordChart } from "./record-chart";

export const metadata: Metadata = { title: "Récord" };

const dayNumber = (day: string) => Date.parse(`${day}T00:00:00Z`) / 86_400_000;

/** One exercise's records: its bests, how they grew, the % calculator and the best weight per reps (#64, canvas: C2-Record-Ejercicio). */
export default async function RecordPage({ params }: { params: Promise<{ ejercicio: string }> }) {
  const exercise = decodeURIComponent((await params).ejercicio);
  const [{ sets, labels }, unit] = await Promise.all([readLoggedSets(), readWeightUnit()]);
  const row = recordBoard(sets).find((r) => r.exercise === exercise);
  if (!row) notFound();
  const name = labels.get(exercise) ?? exercise;

  const points = sessionBests(sets, exercise);
  const growth = weightProgression(sets, exercise);
  const byReps = bestByReps(sets, exercise);
  const first = growth[0];
  const gain = row.heaviest.kg - first.kg;
  const weeks = Math.max(1, Math.round((dayNumber(row.heaviest.day) - dayNumber(first.day)) / 7));
  const summary =
    gain > 0
      ? `Subiste ${formatWeight(gain, unit)} en ${weeks} ${weeks === 1 ? "semana" : "semanas"}, con ${growth.length - 1} ${growth.length === 2 ? "récord" : "récords"} de peso.`
      : row.sessions > 1
        ? "Tu peso máximo sigue siendo el de tu primera sesión."
        : "Es tu primera sesión con este ejercicio: queda como punto de partida.";

  return (
    <div className="flex max-w-xl flex-col gap-3.5">
      <Link href="/records" className="flex h-11 w-fit items-center gap-1.5 rounded-full bg-card pr-3.5 pl-2.5 text-sm font-bold">
        <svg viewBox="0 0 24 24" aria-hidden className="size-[18px] fill-none stroke-current" strokeWidth={2.2} strokeLinecap="round">
          <path d="M15 6l-6 6 6 6" />
        </svg>
        Récords
      </Link>

      <section className="flex flex-col gap-3.5 rounded-3xl bg-card p-5">
        <div className="flex flex-col gap-1">
          <span className="text-[13px] font-semibold text-muted">
            {row.group} · {row.sessions} {row.sessions === 1 ? "sesión" : "sesiones"} con peso desde el {shortDay(row.firstDay)}
          </span>
          <h1 className="text-[26px] font-extrabold">{name}</h1>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex flex-col gap-0.5 rounded-2xl bg-sunk px-3.5 py-3">
            <span className="text-xs font-bold text-muted">Peso máximo</span>
            <span className="text-[26px] font-extrabold tabular-nums">{formatWeight(row.heaviest.kg, unit)}</span>
            <span className="text-xs text-muted">
              × {row.heaviest.reps} {row.heaviest.reps === 1 ? "rep" : "reps"} · {shortDay(row.heaviest.day)}
            </span>
          </div>
          <div className="flex flex-col gap-0.5 rounded-2xl bg-sunk px-3.5 py-3">
            <span className="text-xs font-bold text-muted">1RM estimado</span>
            {row.best1rm ? (
              <>
                <span className="text-[26px] font-extrabold tabular-nums">{formatWeight(row.best1rm.value, unit)}</span>
                <span className="text-xs text-muted">
                  de {formatWeight(row.best1rm.kg, unit)} × {row.best1rm.reps} · {shortDay(row.best1rm.day)}
                </span>
              </>
            ) : (
              <>
                <span className="text-[26px] font-extrabold text-muted">—</span>
                <span className="text-xs text-muted">Epley solo usa series de 1 a 10 reps</span>
              </>
            )}
          </div>
        </div>
        <span className="text-[15px] leading-normal">{summary}</span>
      </section>

      <RecordChart points={points} name={name} unit={unit} />

      <Calculator e1rm={row.best1rm?.value ?? null} heaviest={row.heaviest.kg} unit={unit} />

      <section className="flex flex-col gap-2.5 rounded-3xl bg-card p-[18px]">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-[17px] font-extrabold">Tu mejor peso por repeticiones</h2>
          <span className="text-[13px] text-muted">La serie más pesada que hiciste con al menos esas reps</span>
        </div>
        <div className="grid grid-cols-5 gap-1.5">
          {byReps.map((b) => (
            <div key={b.reps} className={`flex flex-col items-center gap-0.5 rounded-[14px] px-1 py-2.5 ${b.kg !== null && b.kg === row.heaviest.kg ? "bg-primary/15" : "bg-sunk"}`}>
              <span className="text-[11px] font-bold text-muted">
                {b.reps} {b.reps === 1 ? "rep" : "reps"}
              </span>
              <span className={`text-[15px] font-extrabold tabular-nums ${b.kg === null ? "text-muted" : ""}`}>{b.kg === null ? "—" : `${formatWeight(b.kg, unit)}`}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col rounded-3xl bg-card px-[18px] py-1.5">
        <h2 className="pt-3 pb-1 text-[17px] font-extrabold">Cómo fue subiendo</h2>
        {[...growth].reverse().map((g, i) => (
          <div key={g.at} className={`grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 py-2 ${i ? "border-t border-field" : ""}`}>
            <span className="flex flex-col gap-0.5">
              <span className="text-[15px] font-bold tabular-nums">
                {formatWeight(g.kg, unit)} × {g.reps}
              </span>
              <span className="text-xs text-muted">{shortDay(g.day)}</span>
            </span>
            <span className={`text-[13px] font-extrabold tabular-nums ${g.delta === null ? "text-muted" : "text-accent"}`}>{g.delta === null ? "primera" : `+${formatWeight(g.delta, unit)}`}</span>
          </div>
        ))}
      </section>
    </div>
  );
}

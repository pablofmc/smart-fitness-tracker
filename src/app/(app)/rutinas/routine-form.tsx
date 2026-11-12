"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useState } from "react";
import { ROUTINE_SHRINK, shrinkPhoto } from "@/modules/gear/shrink-photo";
import { matchExercise, ROUTINE_EXERCISES, ROUTINE_FILE_MAX_BYTES, type RoutineExercise } from "@/modules/routines/routine";
import { deleteRoutine, readRoutine, saveRoutine, type SaveState } from "./actions";

type Row = { key: number; name: string; category: string | null; sets: string; reps: string; kg: string };
type Chosen = { blob: Blob; name: string; type: string; preview: string | null; size: number };
export type InitialRoutine = { id: number; name: string; fileUrl: string | null; fileType: string | null; exercises: RoutineExercise[] };

let nextKey = 1;
const toRow = (e: RoutineExercise): Row => ({
  key: nextKey++,
  name: e.name,
  category: e.category,
  sets: e.targetSets?.toString() ?? "",
  reps: e.targetReps ?? "",
  kg: e.targetKg?.toString().replace(".", ",") ?? "",
});
const emptyRow = (): Row => ({ key: nextKey++, name: "", category: null, sets: "", reps: "", kg: "" });
const numberOrNull = (text: string, integer = false) => {
  const n = Number(text.replace(",", ".").trim());
  return text.trim() === "" || !Number.isFinite(n) ? null : integer ? Math.round(n) : n;
};
const KB = (bytes: number) => (bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB` : `${Math.round(bytes / 1024)} KB`);

const field = "h-12 w-full rounded-xl border border-line bg-card px-3 text-base font-semibold outline-primary focus-visible:outline-2";
const small = "h-11 w-full rounded-[10px] border border-line bg-card px-1 text-center text-[15px] font-semibold outline-primary focus-visible:outline-2";

/** New or edited routine: file, optional AI read, then the exercise list to review (canvas: C2-Rutina-Nueva). */
export function RoutineForm({ initial, aiCapMessage = null }: { initial?: InitialRoutine; aiCapMessage?: string | null }) {
  const [state, dispatch, saving] = useActionState<SaveState, FormData>(saveRoutine, {});
  const [name, setName] = useState(initial?.name ?? "");
  const [chosen, setChosen] = useState<Chosen | null>(null);
  const [rows, setRows] = useState<Row[]>(() => initial?.exercises.map(toRow) ?? []);
  const [step, setStep] = useState<"pick" | "reading" | "list">(initial ? "list" : "pick");
  const [notice, setNotice] = useState<{ text: string; tone: "ok" | "warn" } | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);

  useEffect(() => () => {
    if (chosen?.preview) URL.revokeObjectURL(chosen.preview);
  }, [chosen]);

  async function choose(file: File | undefined) {
    if (!file) return;
    setFileError(null);
    if (file.type === "application/pdf") {
      if (file.size > ROUTINE_FILE_MAX_BYTES) return setFileError("El PDF pesa más de 4 MB. Prueba con una foto de la rutina.");
      return setChosen({ blob: file, name: file.name, type: file.type, preview: null, size: file.size });
    }
    if (!file.type.startsWith("image/")) return setFileError("Elige una foto o un PDF.");
    setPreparing(true);
    try {
      const blob = await shrinkPhoto(file, ROUTINE_SHRINK);
      if (!blob) setFileError("La foto es demasiado grande. Prueba con otra.");
      else setChosen({ blob, name: file.name, type: blob.type, preview: URL.createObjectURL(blob), size: blob.size });
    } catch {
      setFileError("No pudimos abrir esa foto. Prueba con otra o con un PDF.");
    } finally {
      setPreparing(false);
    }
  }

  const fileData = () => {
    const data = new FormData();
    if (chosen) data.set("file", chosen.blob, chosen.type === "application/pdf" ? "rutina.pdf" : chosen.type === "image/webp" ? "rutina.webp" : "rutina.jpg");
    return data;
  };

  async function readWithAi() {
    setStep("reading");
    setNotice(null);
    const result = await readRoutine(fileData());
    if (result.exercises) {
      setRows(result.exercises.map(toRow));
      setNotice({ text: `La IA encontró ${result.exercises.length} ${result.exercises.length === 1 ? "ejercicio" : "ejercicios"}. Revísalos: puede equivocarse con nombres o números.`, tone: "ok" });
    } else {
      setRows((r) => (r.length ? r : [emptyRow()]));
      setNotice({ text: `${result.message} La rutina se guarda igual.`, tone: "warn" });
    }
    setStep("list");
  }

  function update(key: number, patch: Partial<Row>) {
    setRows((all) => all.map((r) => (r.key === key ? { ...r, ...patch, ...(patch.name !== undefined ? { category: matchExercise(patch.name) } : {}) } : r)));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const data = fileData();
    if (initial) data.set("id", String(initial.id));
    data.set("name", name);
    const exercises: RoutineExercise[] = rows
      .filter((r) => r.name.trim())
      .map((r) => ({ name: r.name.trim(), category: r.category, targetSets: numberOrNull(r.sets, true), targetReps: r.reps.trim() || null, targetKg: numberOrNull(r.kg) }));
    data.set("exercises", JSON.stringify(exercises));
    startTransition(() => dispatch(data));
  }

  const hasFile = Boolean(chosen || initial?.fileUrl);

  return (
    <form onSubmit={submit} className="flex max-w-xl flex-col gap-4">
      <label className="flex flex-col gap-1.5 text-sm font-bold">
        Nombre
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required placeholder="Pierna y core" className={field} />
      </label>

      <section className="flex flex-col gap-2">
        <span className="text-sm font-bold">Archivo de la rutina</span>
        {hasFile ? (
          <div className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-card p-3">
            {chosen?.preview || (!chosen && initial?.fileUrl && initial.fileType?.startsWith("image/")) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={chosen?.preview ?? initial!.fileUrl!} alt="" className="h-20 w-16 rounded-[10px] object-cover" />
            ) : (
              <span className="flex h-20 w-16 items-center justify-center rounded-[10px] bg-sunk text-[11px] font-extrabold text-muted">{(chosen?.type ?? initial?.fileType) === "application/pdf" ? "PDF" : "FOTO"}</span>
            )}
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-[15px] font-bold">{chosen ? chosen.name : "Archivo guardado"}</span>
              <span className="text-xs text-muted">{chosen ? `${KB(chosen.size)} · solo tú lo ves` : <a href={initial!.fileUrl!} target="_blank" rel="noreferrer" className="font-bold text-accent">Ver archivo</a>}</span>
            </span>
            <label className="flex h-11 cursor-pointer items-center rounded-xl bg-sunk px-3 text-[13px] font-bold focus-within:outline-2 focus-within:outline-primary">
              Cambiar
              <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => choose(e.target.files?.[0])} />
            </label>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { text: "Tomar foto", capture: true, icon: "M4 8h3l2-3h6l2 3h3v11H4zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z", accept: "image/*" },
              { text: "Foto o PDF", capture: false, icon: "M6 3h9l4 4v14H6zM14 3v5h5", accept: "image/*,application/pdf" },
            ].map((b) => (
              <label key={b.text} className="flex h-[52px] cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-card text-sm font-bold focus-within:outline-2 focus-within:outline-primary">
                <svg viewBox="0 0 24 24" aria-hidden className="size-5 fill-none stroke-current" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d={b.icon} />
                </svg>
                {preparing ? "Preparando…" : b.text}
                <input type="file" accept={b.accept} capture={b.capture ? "environment" : undefined} className="sr-only" disabled={preparing} onChange={(e) => choose(e.target.files?.[0])} />
              </label>
            ))}
          </div>
        )}
        {fileError && (
          <p role="alert" className="text-[13px] font-semibold text-warn-text">
            {fileError}
          </p>
        )}
      </section>

      {step === "pick" && (
        <section className="flex flex-col gap-2.5">
          {aiCapMessage ? (
            <p role="status" className="rounded-2xl bg-warn-bg px-4 py-3 text-sm leading-snug font-bold text-warn-text">
              {aiCapMessage}
            </p>
          ) : (
            <button type="button" onClick={readWithAi} disabled={!chosen || preparing} className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-primary text-[15px] font-extrabold text-on-primary disabled:bg-sunk disabled:text-muted">
              <svg viewBox="0 0 24 24" aria-hidden className="size-5 fill-none stroke-current" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" />
              </svg>
              Leer ejercicios con IA
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setRows([emptyRow()]);
              setStep("list");
            }}
            className="h-12 rounded-2xl border border-line text-sm font-bold"
          >
            Escribirlos a mano
          </button>
          {!aiCapMessage && <span className="text-xs leading-snug text-muted">La IA propone la lista y tú la revisas antes de guardar. Cuesta menos de 0,1 centavo de dólar por rutina.</span>}
        </section>
      )}

      {step === "reading" && (
        <section role="status" className="flex flex-col gap-3 rounded-2xl bg-card px-4 py-[18px]">
          <span className="text-[15px] font-bold">Leyendo la rutina…</span>
          {["w-[90%]", "w-[75%]", "w-[82%]"].map((w) => (
            <span key={w} className={`h-3 animate-pulse rounded-md bg-sunk ${w}`} />
          ))}
        </section>
      )}

      {notice && (
        <div role={notice.tone === "warn" ? "alert" : "status"} className={`rounded-2xl px-4 py-3 text-sm leading-snug font-bold ${notice.tone === "warn" ? "bg-warn-bg text-warn-text" : "bg-nav-on text-on-nav-on"}`}>
          {notice.text}
        </div>
      )}

      {step === "list" && (
        <section className="flex flex-col gap-2">
          <div className="grid grid-cols-[minmax(0,1fr)_46px_52px_56px_36px] gap-1.5 px-0.5 text-xs font-bold text-muted">
            <span>Ejercicio</span>
            <span className="text-center">Series</span>
            <span className="text-center">Reps</span>
            <span className="text-center">kg</span>
            <span />
          </div>
          <datalist id="routine-exercises">
            {ROUTINE_EXERCISES.map((e) => (
              <option key={e.key} value={e.name} />
            ))}
          </datalist>
          {rows.map((r, i) => (
            <div key={r.key} className="grid grid-cols-[minmax(0,1fr)_46px_52px_56px_36px] items-center gap-1.5">
              <input aria-label={`Ejercicio ${i + 1}`} list="routine-exercises" value={r.name} onChange={(e) => update(r.key, { name: e.target.value })} maxLength={80} placeholder="Ejercicio" className={`${small} px-2.5 text-left`} />
              <input aria-label={`Series de ${r.name || `ejercicio ${i + 1}`}`} value={r.sets} onChange={(e) => update(r.key, { sets: e.target.value })} inputMode="numeric" className={small} />
              <input aria-label={`Repeticiones de ${r.name || `ejercicio ${i + 1}`}`} value={r.reps} onChange={(e) => update(r.key, { reps: e.target.value })} maxLength={20} className={small} />
              <input aria-label={`Kg de ${r.name || `ejercicio ${i + 1}`}`} value={r.kg} onChange={(e) => update(r.key, { kg: e.target.value })} inputMode="decimal" placeholder="—" className={small} />
              <button type="button" aria-label={`Quitar ${r.name || `ejercicio ${i + 1}`}`} onClick={() => setRows((all) => all.filter((x) => x.key !== r.key))} className="flex h-11 w-9 items-center justify-center text-muted">
                <svg viewBox="0 0 24 24" aria-hidden className="size-[18px] fill-none stroke-current" strokeWidth={2} strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
          ))}
          <button type="button" onClick={() => setRows((all) => [...all, emptyRow()])} className="h-11 rounded-[14px] border border-dashed border-line text-sm font-bold">
            + Ejercicio
          </button>
          <span className="text-xs text-muted">Series, reps y kg son opcionales: son la meta, no lo que hiciste.</span>
          {!initial && chosen && !notice && !aiCapMessage && (
            <button type="button" onClick={readWithAi} className="self-start text-[13px] font-bold text-accent">
              Leer con IA en vez de escribir
            </button>
          )}
        </section>
      )}

      {state.message && (
        <p role="alert" className="rounded-2xl bg-warn-bg px-4 py-3 text-sm font-semibold text-warn-text">
          {state.message}
        </p>
      )}

      <div className="mt-1 flex gap-2.5">
        <Link href="/rutinas" className="flex h-[52px] flex-1 items-center justify-center rounded-2xl border border-line text-[15px] font-bold">
          Cancelar
        </Link>
        <button type="submit" disabled={saving || step === "reading" || preparing || !name.trim()} className="h-[52px] flex-[2] rounded-2xl bg-primary text-[15px] font-extrabold text-on-primary disabled:bg-sunk disabled:text-muted">
          {saving ? "Guardando…" : "Guardar rutina"}
        </button>
      </div>

      {initial && (
        <button
          type="button"
          onClick={() => {
            if (window.confirm(`¿Borrar la rutina «${initial.name}»? No se puede deshacer.`)) startTransition(() => void deleteRoutine(initial.id));
          }}
          className="h-11 self-center px-4 text-sm font-bold text-warn-text"
        >
          Borrar rutina
        </button>
      )}
    </form>
  );
}

"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useMemo, useState } from "react";
import { BRANDS, RUN_TYPE_LABELS, RUN_TYPES, catalogImageUrl, shoeName, type RunType } from "@/modules/gear/catalog";
import { SHOE_CATALOG } from "@/modules/gear/catalog-data";
import { fromCatalog, runTypeLabels, searchModels, type ShoeModel } from "@/modules/gear/search";
import { ShoeImage } from "@/modules/gear/shoe-image";
import { shrinkPhoto } from "@/modules/gear/shrink-photo";
import { addShoe, type AddShoeState } from "../actions";

const CATALOG = SHOE_CATALOG.map(fromCatalog);
const OTHER = "Otra";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;

const imageUrl = (m: ShoeModel) => (m.image ? catalogImageUrl(SUPABASE_URL, m.image) : null);
const field = "h-12 w-full rounded-xl border border-line bg-card px-3 text-base font-semibold outline-primary focus-visible:outline-2";
const label = "flex flex-col gap-1.5 text-sm font-bold";

function localToday() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

type Manual = { brand: string; otherBrand: string; model: string; version: string; runTypes: RunType[] };

/** Search the catalog or type a model by hand, then dates, km, photo and default (canvas: C2-Zapatilla-Nueva). */
export function ShoeForm({ ownModels, currentDefault }: { ownModels: ShoeModel[]; currentDefault: string | null }) {
  const [state, dispatch, pending] = useActionState<AddShoeState, FormData>(addShoe, {});
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<ShoeModel | null>(null);
  const [manual, setManual] = useState<Manual | null>(null);
  const [isDefault, setIsDefault] = useState(currentDefault === null);
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [shrinking, setShrinking] = useState(false);

  const models = useMemo(() => [...CATALOG, ...ownModels], [ownModels]);
  const matches = searchModels(query, models);
  const searching = !picked && !manual;
  const typed = query.trim().length >= 2;

  useEffect(() => () => {
    if (photo) URL.revokeObjectURL(photo.url);
  }, [photo]);

  function startManual() {
    const words = query.trim().split(/\s+/);
    // "New Balance" spans two words; any other first word is taken as an unknown brand.
    const brand = BRANDS.find((b) => words.join(" ").toLowerCase().startsWith(`${b.toLowerCase()} `));
    const brandWords = brand ? brand.split(" ").length : words.length > 1 ? 1 : 0;
    const otherBrand = brand ? "" : words.slice(0, brandWords).join(" ");
    setManual({ brand: brand ?? OTHER, otherBrand, model: words.slice(brandWords).join(" "), version: "", runTypes: ["daily"] });
  }

  function pick(m: ShoeModel) {
    if (m.own) setManual({ brand: (BRANDS as readonly string[]).includes(m.brand) ? m.brand : OTHER, otherBrand: (BRANDS as readonly string[]).includes(m.brand) ? "" : m.brand, model: m.model, version: m.version ?? "", runTypes: m.runTypes });
    else setPicked(m);
  }

  function reset() {
    setPicked(null);
    setManual(null);
  }

  function toggleType(t: RunType) {
    setManual((m) => {
      if (!m) return m;
      if (m.runTypes.includes(t)) return { ...m, runTypes: m.runTypes.filter((x) => x !== t) };
      return { ...m, runTypes: [...m.runTypes, t].slice(-2) };
    });
  }

  async function choosePhoto(file: File | undefined) {
    if (!file) return;
    setPhotoError(null);
    setShrinking(true);
    try {
      const blob = await shrinkPhoto(file);
      if (!blob) setPhotoError("La foto es demasiado grande incluso achicada. Prueba con otra.");
      else setPhoto({ blob, url: URL.createObjectURL(blob) });
    } catch {
      setPhotoError("No pudimos leer esa foto.");
    } finally {
      setShrinking(false);
    }
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (photo) data.set("photo", photo.blob, photo.blob.type === "image/webp" ? "photo.webp" : "photo.jpg");
    startTransition(() => dispatch(data));
  }

  const manualBrand = manual && (manual.brand === OTHER ? manual.otherBrand.trim() : manual.brand);
  const canSave = !pending && !shrinking && (picked !== null || (manual !== null && !!manualBrand && manual.model.trim() !== "" && manual.runTypes.length > 0));

  return (
    <form onSubmit={submit} className="flex max-w-xl flex-col gap-4">
      <section className="flex flex-col gap-2">
        <label htmlFor="shoe-search" className="text-sm font-bold">
          Modelo
        </label>

        {searching && (
          <>
            <input
              id="shoe-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Busca marca o modelo"
              autoComplete="off"
              autoFocus
              className="h-[52px] w-full rounded-2xl border-2 border-primary bg-card px-3.5 text-base font-semibold outline-none"
            />
            {matches.length > 0 && (
              <ul aria-label="Sugerencias" className="rounded-2xl bg-card py-1">
                {matches.map((m, i) => (
                  <li key={m.key} className={i ? "border-t border-sunk" : ""}>
                    <button type="button" onClick={() => pick(m)} className="grid min-h-14 w-full grid-cols-[56px_minmax(0,1fr)] items-center gap-3 px-3.5 py-2 text-left">
                      <ShoeImage src={imageUrl(m)} className="h-10 w-14" />
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="text-[15px] font-bold">{shoeName(m)}</span>
                        <span className="text-xs text-muted">
                          {m.own ? "Tu lista · " : ""}
                          {runTypeLabels(m.runTypes)}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {typed && (
              <div className="flex flex-col gap-2.5 rounded-2xl bg-card px-4 py-3.5">
                <span className="text-sm text-muted">{matches.length ? "¿No es ninguna?" : `«${query.trim()}» no está en el catálogo.`}</span>
                <button type="button" onClick={startManual} className="h-11 rounded-[14px] bg-primary text-sm font-extrabold text-on-primary">
                  Escribirla a mano
                </button>
              </div>
            )}
          </>
        )}

        {picked && (
          <div className="grid grid-cols-[72px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-card px-3.5 py-3">
            <ShoeImage src={imageUrl(picked)} className="h-[52px] w-[72px]" />
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-base font-extrabold">{shoeName(picked)}</span>
              <span className="text-[13px] leading-snug text-muted">{picked.note}</span>
            </span>
            <button type="button" onClick={reset} className="h-11 rounded-xl bg-sunk px-3 text-[13px] font-bold">
              Cambiar
            </button>
            <input type="hidden" name="source" value="catalog" />
            <input type="hidden" name="catalogName" value={shoeName(picked)} />
          </div>
        )}

        {manual && (
          <div className="flex flex-col gap-3 rounded-2xl bg-card px-4 py-3.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-extrabold">Modelo escrito a mano</span>
              <button type="button" onClick={reset} className="h-11 rounded-xl bg-sunk px-3 text-[13px] font-bold">
                Buscar otra vez
              </button>
            </div>
            <input type="hidden" name="source" value="manual" />
            <input type="hidden" name="brand" value={manualBrand ?? ""} />
            <label className={label}>
              Marca
              <select value={manual.brand} onChange={(e) => setManual({ ...manual, brand: e.target.value })} className={field}>
                {[...BRANDS, OTHER].map((b) => (
                  <option key={b}>{b}</option>
                ))}
              </select>
            </label>
            {manual.brand === OTHER && (
              <label className={label}>
                Otra marca
                <input value={manual.otherBrand} onChange={(e) => setManual({ ...manual, otherBrand: e.target.value })} maxLength={40} required className={field} />
              </label>
            )}
            <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-2.5">
              <label className={label}>
                Modelo
                <input name="model" value={manual.model} onChange={(e) => setManual({ ...manual, model: e.target.value })} maxLength={60} required className={field} />
              </label>
              <label className={label}>
                Versión
                <input name="version" value={manual.version} onChange={(e) => setManual({ ...manual, version: e.target.value })} maxLength={20} placeholder="opcional" className={field} />
              </label>
            </div>
            <fieldset className="flex flex-col gap-1.5">
              <legend className="pb-1.5 text-sm font-bold">Tipo de carrera (hasta 2)</legend>
              <div className="flex flex-wrap gap-1.5">
                {RUN_TYPES.map((t) => {
                  const on = manual.runTypes.includes(t);
                  return (
                    <button key={t} type="button" aria-pressed={on} onClick={() => toggleType(t)} className={`h-9 rounded-full px-3 text-[13px] font-bold ${on ? "bg-primary text-on-primary" : "bg-sunk"}`}>
                      {RUN_TYPE_LABELS[t]}
                    </button>
                  );
                })}
              </div>
              {manual.runTypes.map((t) => (
                <input key={t} type="hidden" name="runTypes" value={t} />
              ))}
            </fieldset>
            <span className="text-xs leading-snug text-muted">Queda en tu lista y aparece en las próximas búsquedas.</span>
          </div>
        )}
      </section>

      <section className="grid grid-cols-2 gap-2.5">
        <label className={`${label} col-span-2`}>
          En uso desde
          <input type="date" name="startedOn" defaultValue={localToday()} max={localToday()} required className={field} suppressHydrationWarning />
        </label>
        <label className={label}>
          Km iniciales
          <input name="initialKm" type="number" inputMode="decimal" min={0} step="0.1" defaultValue={0} required className={field} />
        </label>
        <label className={label}>
          Límite (km)
          <input name="limitKm" type="number" inputMode="numeric" min={1} step="1" defaultValue={700} required className={field} />
        </label>
        <span className="col-span-2 text-xs leading-snug text-muted">Km iniciales: lo que ya tenía antes de registrarla. Se avisa al 90 % del límite.</span>
      </section>

      <section className="flex flex-col gap-2">
        <span className="text-sm font-bold">Foto propia (opcional)</span>
        {photo ? (
          <div className="flex items-center gap-3 rounded-2xl bg-card p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photo.url} alt="Tu foto" className="h-16 w-24 rounded-xl object-cover" />
            <span className="flex-1 text-[13px] text-muted">{Math.round(photo.blob.size / 1024)} KB, lista para subir</span>
            <button type="button" onClick={() => setPhoto(null)} className="h-11 rounded-xl bg-sunk px-3 text-[13px] font-bold">
              Quitar
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { text: "Tomar foto", capture: true, icon: "M4 8h3l2-3h6l2 3h3v11H4zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" },
              { text: "Galería", capture: false, icon: "M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4" },
            ].map((b) => (
              <label key={b.text} className="flex h-[52px] cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-card text-sm font-bold focus-within:outline-2 focus-within:outline-primary">
                <svg viewBox="0 0 24 24" aria-hidden className="size-5 fill-none stroke-current" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d={b.icon} />
                </svg>
                {shrinking ? "Achicando…" : b.text}
                <input type="file" accept="image/*" capture={b.capture ? "environment" : undefined} className="sr-only" onChange={(e) => choosePhoto(e.target.files?.[0])} disabled={shrinking} />
              </label>
            ))}
          </div>
        )}
        {photoError && (
          <p role="alert" className="text-[13px] font-semibold text-warn-text">
            {photoError}
          </p>
        )}
        <span className="text-xs leading-snug text-muted">Se achica en el teléfono antes de subirla y solo tú la ves. Sin foto se usa la imagen del catálogo, o un dibujo si no hay.</span>
      </section>

      <label className="grid cursor-pointer grid-cols-[minmax(0,1fr)_52px] items-center gap-3 rounded-2xl bg-card px-4 py-3.5">
        <span className="flex flex-col gap-0.5">
          <span className="text-[15px] font-extrabold">Usar como predeterminada</span>
          <span className="text-[13px] leading-snug text-muted">
            Las carreras nuevas de Garmin se asignan a esta zapatilla.{currentDefault ? ` Reemplaza a ${currentDefault}.` : ""}
          </span>
        </span>
        <input type="checkbox" role="switch" name="isDefault" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} className="peer sr-only" />
        <span aria-hidden className="relative block h-8 w-[52px] rounded-full bg-line transition-colors peer-checked:bg-primary peer-focus-visible:outline-2 peer-focus-visible:outline-primary peer-checked:[&>span]:translate-x-5">
          <span className="absolute top-[3px] left-[3px] block size-[26px] rounded-full bg-white transition-transform" />
        </span>
      </label>

      {state.message && (
        <p role="alert" className="rounded-2xl bg-warn-bg px-4 py-3 text-sm font-semibold text-warn-text">
          {state.message}
        </p>
      )}

      <div className="mt-1 flex gap-2.5">
        <Link href="/equipo" className="flex h-[52px] flex-1 items-center justify-center rounded-2xl border border-line text-[15px] font-bold">
          Cancelar
        </Link>
        <button type="submit" disabled={!canSave} className="h-[52px] flex-[2] rounded-2xl bg-primary text-[15px] font-extrabold text-on-primary disabled:bg-sunk disabled:text-muted">
          {pending ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}

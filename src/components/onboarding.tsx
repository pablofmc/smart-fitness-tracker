import Link from "next/link";
import { AutoRefresh } from "./auto-refresh";
import { formatLongDate } from "@/lib/format";
import { getGarminKeyStatus } from "@/lib/garmin/key";
import { createClient } from "@/lib/supabase/server";

const KEY_PAGE = "https://connect.garmin.com/app/settings/personalApiToken";

const STEPS = [
  { title: "Abre Garmin Connect en una computadora", detail: "Ve a la página de tu clave de API personal." },
  { title: "Toca «Create Key» y elige 1 año", detail: "Acepta los términos. Garmin te avisa por correo antes de que caduque." },
  { title: "Copia la clave y pégala en Ajustes", detail: "Garmin la muestra una sola vez. Si la pierdes, bórrala y crea otra." },
];

/** Until the person changes the password the account script gave them (R-USR-03). */
export function TempPasswordNotice() {
  return (
    <Link href="/ajustes" className="flex items-center justify-between gap-3 rounded-[20px] bg-warn-bg px-4 py-3.5 text-warn-text">
      <span className="text-[15px] leading-snug font-bold">Entraste con una contraseña temporal. Cámbiala por una tuya.</span>
      <span className="shrink-0 text-sm font-extrabold">Cambiar ›</span>
    </Link>
  );
}

/** Hoy for an account with no Garmin key and no data yet (canvas: C2-Conecta-Garmin, sinClave). */
export function ConnectGarmin() {
  return (
    <>
      <section className="flex flex-col gap-3.5 rounded-3xl bg-hero px-5 py-[22px] text-on-hero">
        <h1 className="text-[26px] leading-tight font-extrabold">Conecta tu Garmin</h1>
        <p className="text-base leading-normal opacity-90">Tus datos llegan con tu propia clave personal de Garmin. Solo tú los ves, y nadie más puede usar tu clave.</p>
      </section>

      <section className="flex flex-col gap-1 rounded-3xl bg-card p-[18px]">
        <h2 className="mb-2 text-[17px] font-extrabold">Cómo crear tu clave</h2>
        <ol className="flex flex-col">
          {STEPS.map((step, i) => (
            <li key={step.title} className="grid grid-cols-[32px_minmax(0,1fr)] gap-3 border-t border-line py-2.5">
              <span aria-hidden className="flex size-8 items-center justify-center rounded-full bg-nav-on text-[15px] font-extrabold text-on-nav-on">
                {i + 1}
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-[15px] leading-snug font-bold">{step.title}</span>
                <span className="text-[13px] leading-snug text-muted">
                  {i === 0 ? (
                    <>
                      Ve a la{" "}
                      <a href={KEY_PAGE} target="_blank" rel="noreferrer" className="font-bold text-accent underline">
                        página de tu clave de API personal
                      </a>
                      .
                    </>
                  ) : (
                    step.detail
                  )}
                </span>
              </span>
            </li>
          ))}
        </ol>
        <Link href="/ajustes" className="mt-2.5 flex h-12 items-center justify-center rounded-[14px] bg-primary text-[15px] font-extrabold text-on-primary">
          Pegar mi clave en Ajustes
        </Link>
      </section>

      <p className="rounded-[20px] bg-card px-4 py-3.5 text-sm leading-normal text-muted">
        Mientras tanto, Actividades, Tendencias y Patrones dicen «Todavía no hay datos: conecta tu Garmin en Ajustes». Rutinas y Equipo ya se pueden usar.
      </p>
    </>
  );
}

/** Hoy's lead while the history loads, in place of the day's verdict (canvas: C2-Conecta-Garmin, cargando). */
export function HistoryLoading({ percent, reachedDay }: { percent: number; reachedDay: string | null }) {
  return (
    <section className="flex flex-col gap-3 rounded-3xl bg-hero px-5 py-[22px] text-on-hero">
      <AutoRefresh />
      <h1 className="text-[26px] leading-tight font-extrabold">Trayendo tu historial</h1>
      <p className="text-base leading-normal opacity-90">
        {reachedDay ? `Ya llegaron tus datos desde el ${formatLongDate(reachedDay)}. Seguimos con los años anteriores` : "Empezamos a traer tus datos de Garmin"}: puede tardar
        hasta dos días y sigue aunque cierres la app.
      </p>
      <div role="progressbar" aria-label="Historial traído" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className="h-2 overflow-hidden rounded bg-white/25">
        <div className="h-2 rounded bg-white" style={{ width: `${percent}%` }} />
      </div>
    </section>
  );
}

/** Top of Actividades, Tendencias and Patrones for an account with no key and no data yet; nothing otherwise. */
export async function NoDataYet() {
  const db = await createClient();
  const [key, { count }] = await Promise.all([getGarminKeyStatus(), db.from("raw_files").select("id", { count: "exact", head: true })]);
  if (key.kind !== "missing" || count) return null;
  return (
    <p className="rounded-[20px] bg-amber-bg px-4 py-3.5 text-sm leading-snug font-semibold text-amber-text">
      Todavía no hay datos: <Link href="/ajustes" className="font-extrabold underline">conecta tu Garmin en Ajustes</Link>.
    </p>
  );
}

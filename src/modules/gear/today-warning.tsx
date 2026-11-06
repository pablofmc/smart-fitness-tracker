import Link from "next/link";
import { readShoes } from "./read";
import { HideWarningButton } from "./hide-warning-button";
import { ShoeImage } from "./shoe-image";
import { warningVisibleInToday } from "./wear";

const KM = new Intl.NumberFormat("es", { maximumFractionDigits: 0 });

/** The 90 % warning of each active shoe in Hoy, unless hidden for the week (R-GEAR-04, canvas: C2-Hoy-Aviso). */
export async function ShoeWarnings({ today }: { today: string }) {
  const shoes = (await readShoes()).filter((s) => !s.retiredOn && warningVisibleInToday(s.warn, s.warningHiddenUntil, today));
  return shoes.map((s) => (
    <section key={s.id} className="flex flex-col gap-3 rounded-[20px] bg-warn-bg p-4 text-warn-text">
      <div className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-3">
        <ShoeImage src={s.image} className="h-[52px] w-[72px]" />
        <p className="text-base leading-snug font-bold">
          Tus {s.name} llevan {KM.format(s.km)} de {KM.format(s.limitKm)} km.{" "}
          {s.leftKm <= 0 ? "Ya pasaron su límite." : s.leftKm < 1.5 ? "Les queda menos de 2 km." : `Les quedan unos ${KM.format(s.leftKm)} km.`}
        </p>
      </div>
      <div role="progressbar" aria-label="Km usados del límite" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, s.percent)} className="h-2 overflow-hidden rounded bg-warn-line">
        <div className="h-full rounded bg-warn-btn" style={{ width: `${Math.min(100, s.percent)}%` }} />
      </div>
      <div className="flex gap-2">
        <Link href="/equipo" className="flex h-11 flex-1 items-center justify-center rounded-[14px] bg-warn-btn text-sm font-extrabold text-on-warn-btn">
          Ver equipo
        </Link>
        <HideWarningButton shoeId={s.id} />
      </div>
    </section>
  ));
}

import Link from "next/link";
import { AutoRefresh } from "./auto-refresh";
import { formatMonthYear } from "@/lib/format";
import { pickNotice, type NoticeInput } from "@/lib/sync/notice";

/** The notice above Hoy. */
export function SyncNotice({ keyStatus, lastFailed, stopped, history, activityCount }: Omit<NoticeInput, "key"> & { keyStatus: NoticeInput["key"]; activityCount: number }) {
  const key = keyStatus;

  switch (pickNotice({ key, lastFailed, stopped, history })) {
    case null:
      return null;
    case "missing":
      return (
        <Notice tone="amber" title="Conecta tu cuenta de Garmin" action="Ir a Ajustes">
          Pega tu clave de API en Ajustes para empezar a traer tus datos.
        </Notice>
      );
    case "expiring": {
      if (key.kind !== "expiring") return null;
      return (
        <Notice tone="amber" title={`Tu clave de Garmin vence ${key.days === 0 ? "hoy" : key.days === 1 ? "mañana" : `en ${key.days} días`}`} action="Renovar clave">
          Crea una nueva en Garmin Connect y pégala en Ajustes para que la sincronización no se corte.
        </Notice>
      );
    }
    case "blocked":
      return (
        <Notice tone="warn" title="Sincronización detenida" action="Pegar clave nueva">
          Garmin rechazó la clave: venció o se borró. Tus datos siguen aquí, pero no llega nada nuevo.
        </Notice>
      );
    case "stopped":
      return (
        <section className="flex flex-col gap-2 rounded-[20px] border-l-[6px] border-warn-line bg-card px-[18px] py-4">
          <h2 className="text-[15px] font-extrabold">La sincronización lleva horas sin correr</h2>
          <p className="text-sm leading-[1.45] text-muted">Tus datos siguen aquí, pero no está llegando nada nuevo. Prueba con Sincronizar.</p>
        </section>
      );
    case "failed":
      return (
        <section className="flex flex-col gap-2 rounded-[20px] border-l-[6px] border-warn-line bg-card px-[18px] py-4">
          <h2 className="text-[15px] font-extrabold">No pudimos traer datos nuevos</h2>
          <p className="text-sm leading-[1.45] text-muted">Reintentamos solos en la próxima sincronización. Lo que ves es de la última sincronización correcta.</p>
        </section>
      );
    case "importing":
      return (
        <section className="flex flex-col gap-2.5 rounded-[20px] bg-hero px-[18px] py-4 text-white">
          <AutoRefresh />
          <h2 className="text-[15px] font-extrabold">Importando tu historial · {history.percent} %</h2>
          <div aria-hidden className="h-2 rounded bg-black/25">
            <div className="h-2 rounded bg-white/80" style={{ width: `${history.percent}%` }} />
          </div>
          <p className="text-[13px] leading-[1.45] text-white/85">
            {history.reachedDay ? `Vamos por ${formatMonthYear(history.reachedDay)} (${activityCount.toLocaleString("es")} actividades). ` : ""}
            Sigue sola aunque cierres la app; las tendencias se completan al terminar.
          </p>
        </section>
      );
  }
}

const TONES = {
  amber: { box: "bg-amber-bg", title: "text-amber-title", text: "text-amber-text", button: "bg-amber-btn text-on-amber-btn" },
  warn: { box: "bg-warn-bg", title: "text-warn", text: "text-warn-text", button: "bg-warn-btn text-on-warn-btn" },
};

function Notice({ tone, title, action, children }: { tone: keyof typeof TONES; title: string; action: string; children: React.ReactNode }) {
  const t = TONES[tone];
  return (
    <section className={`flex flex-col gap-2 rounded-[20px] px-[18px] py-4 ${t.box}`}>
      <h2 className={`text-[15px] font-extrabold ${t.title}`}>{title}</h2>
      <p className={`text-sm leading-[1.45] ${t.text}`}>{children}</p>
      <Link href="/ajustes" className={`flex h-11 items-center self-start rounded-full px-4 text-sm font-bold ${t.button}`}>
        {action}
      </Link>
    </section>
  );
}

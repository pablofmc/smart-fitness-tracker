import { SyncButton } from "@/components/sync-button";
import { formatRelativeTime, formatShortDate } from "@/lib/format";
import type { KeyStatus } from "@/lib/garmin/key-status";
import type { SyncOverview } from "@/lib/sync/overview";
import { GarminKeyForm } from "./garmin-key-form";

const STATE = {
  missing: { label: "Sin conectar", dot: "bg-line", text: "text-muted" },
  blocked: { label: "Detenida", dot: "bg-warn-line", text: "text-warn" },
  expiring: { label: "Conectado", dot: "bg-primary", text: "text-accent" },
  ok: { label: "Conectado", dot: "bg-primary", text: "text-accent" },
} as const;

function message(status: Exclude<KeyStatus, { kind: "ok" }>) {
  switch (status.kind) {
    case "missing":
      return "Crea una clave en Garmin Connect y pégala aquí para empezar a traer tus datos.";
    case "blocked":
      return "Garmin rechazó la clave: venció o se borró. Pega una nueva para retomar la sincronización.";
    case "expiring":
      return `Tu clave caduca ${status.days === 0 ? "hoy" : status.days === 1 ? "mañana" : `en ${status.days} días`} (${formatShortDate(status.expiresOn)}). Crea una nueva en Garmin Connect y pégala aquí para que la sincronización no se corte.`;
  }
}

export function GarminSection({ status, sync }: { status: KeyStatus; sync: SyncOverview }) {
  const state = STATE[status.kind];

  return (
    <section className="flex flex-col gap-3.5 rounded-3xl bg-card p-[18px]">
      <div className="flex items-center justify-between">
        <h2 className="text-[17px] font-extrabold">Garmin</h2>
        <span className={`flex items-center gap-1.5 text-[13px] font-bold ${state.text}`}>
          <span aria-hidden className={`size-2 rounded-full ${state.dot}`} />
          {state.label}
        </span>
      </div>

      {status.kind === "ok" ? (
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[15px] font-bold">Clave de API</span>
            <span className="text-[13px] text-muted">Vence el {formatShortDate(status.expiresOn)}</span>
          </div>
          <GarminKeyForm label="Cambiar" startOpen={false} />
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 rounded-2xl bg-warn-bg p-3.5">
          <p className="text-sm leading-snug text-warn">{message(status)}</p>
          <GarminKeyForm label="Pegar nueva clave" startOpen={status.kind === "missing"} />
        </div>
      )}

      {status.kind === "missing" ? null : (
        <div className="flex flex-col">
          <div className="flex items-center justify-between gap-3 border-t border-field py-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[15px] font-bold">Última sincronización</span>
              <span className="text-[13px] text-muted">
                {sync.lastSuccessAt ? formatRelativeTime(sync.lastSuccessAt, new Date()) : "Todavía no"}
                {sync.lastFailed ? " · la última falló" : ""}
              </span>
            </div>
            <SyncButton />
          </div>
          <div className="flex flex-col gap-0.5 border-t border-field py-3">
            <span className="text-[15px] font-bold">Historial</span>
            <span className="text-[13px] text-muted">
              {sync.activityCount.toLocaleString("es")} actividades · {sync.history.complete ? "completo" : `importando, ${sync.history.percent} %`}
            </span>
          </div>
          <div className="flex flex-col gap-0.5 border-t border-field pt-3">
            <span className="text-[15px] font-bold">Próxima sincronización</span>
            <span className="text-[13px] text-muted">Automática cada 30 min</span>
          </div>
        </div>
      )}
    </section>
  );
}

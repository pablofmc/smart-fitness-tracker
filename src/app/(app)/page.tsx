import { ComingSoon } from "@/components/coming-soon";
import { SyncNotice } from "@/components/sync-notice";
import { TodayHeader } from "@/components/today-header";
import { formatRelativeTime } from "@/lib/format";
import { getGarminKeyStatus } from "@/lib/garmin/key";
import { getSyncOverview } from "@/lib/sync/overview";

export default async function HoyPage() {
  const [key, sync] = await Promise.all([getGarminKeyStatus(), getSyncOverview()]);
  const syncLabel = sync.lastSuccessAt ? formatRelativeTime(sync.lastSuccessAt, new Date()) : "Sin sincronizar todavía";

  return (
    <div className="flex flex-col gap-3.5">
      <TodayHeader syncLabel={syncLabel} />
      <SyncNotice keyStatus={key} lastFailed={sync.lastFailed} history={sync.history} activityCount={sync.activityCount} />
      <ComingSoon title="Hoy" text="Tu sueño, HRV y forma aparecerán aquí muy pronto." />
    </div>
  );
}

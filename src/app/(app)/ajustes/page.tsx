import type { Metadata } from "next";
import { ThemeSelector } from "@/components/theme-selector";
import { getGarminKeyStatus } from "@/lib/garmin/key";
import { createClient } from "@/lib/supabase/server";
import { getSyncOverview } from "@/lib/sync/overview";
import { GarminSection } from "./garmin-section";
import { HrSection } from "./hr-section";
import { signOut } from "@/app/login/actions";

export const metadata: Metadata = { title: "Ajustes" };

export default async function AjustesPage() {
  const supabase = await createClient();
  const [{ data }, garminStatus, sync, { data: hr }] = await Promise.all([
    supabase.auth.getClaims(),
    getGarminKeyStatus(),
    getSyncOverview(),
    supabase.from("hr_settings").select("effective_from, max_hr, resting_hr, lthr, source").order("effective_from", { ascending: false }),
  ]);
  const versions = (hr ?? []).map((v) => ({ effectiveFrom: v.effective_from, maxHr: v.max_hr, restingHr: v.resting_hr, lthr: v.lthr, source: v.source }));

  return (
    <div className="flex flex-col gap-3.5">
      <h1 className="text-[28px] font-extrabold">Ajustes</h1>

      <section className="flex flex-col gap-3 rounded-3xl bg-card p-[18px]">
        <h2 className="text-[17px] font-extrabold">Apariencia</h2>
        <ThemeSelector />
      </section>

      <GarminSection status={garminStatus} sync={sync} />

      <HrSection key={versions[0]?.effectiveFrom ?? "none"} versions={versions} />

      <section className="flex items-center justify-between gap-3 rounded-3xl bg-card p-[18px]">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[15px] font-bold">Cuenta</span>
          <span className="truncate text-[13px] text-muted">{data?.claims?.email}</span>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="h-11 shrink-0 rounded-full border border-line px-4 text-sm font-bold outline-primary focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            Cerrar sesión
          </button>
        </form>
      </section>
    </div>
  );
}

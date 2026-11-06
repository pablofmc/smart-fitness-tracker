import type { Metadata } from "next";
import { ThemeSelector } from "@/components/theme-selector";
import { getGarminKeyStatus } from "@/lib/garmin/key";
import { createClient } from "@/lib/supabase/server";
import { getSyncOverview } from "@/lib/sync/overview";
import { GarminSection } from "./garmin-section";
import { HrSection } from "./hr-section";
import { TagsSection } from "./tags-section";
import { signOut } from "@/app/login/actions";
import { ownerToday } from "@/lib/today";

export const metadata: Metadata = { title: "Ajustes" };

export default async function AjustesPage() {
  const supabase = await createClient();
  const monthStart = `${(await ownerToday()).slice(0, 7)}-01`;
  const [{ data }, garminStatus, sync, { data: hr }, { data: tags }, { count: aiReads }] = await Promise.all([
    supabase.auth.getClaims(),
    getGarminKeyStatus(),
    getSyncOverview(),
    supabase.from("hr_settings").select("effective_from, max_hr, resting_hr, lthr, source").order("effective_from", { ascending: false }),
    supabase.from("checkin_tags").select("name").order("created_at"),
    // ADR-0006: the one paid call, counted so spending stays visible.
    supabase.from("routine_reads").select("id", { count: "exact", head: true }).gte("created_at", monthStart),
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

      <TagsSection tags={(tags ?? []).map((t) => t.name)} />

      <section className="flex flex-col gap-1 rounded-3xl bg-card p-[18px]">
        <h2 className="text-[17px] font-extrabold">Lectura de rutinas con IA</h2>
        <span className="text-[15px]">
          {aiReads ?? 0} {aiReads === 1 ? "lectura" : "lecturas"} este mes
        </span>
        <span className="text-[13px] leading-snug text-muted">Cada lectura cuesta menos de 0,1 centavo de dólar y se hace solo cuando la pides al subir una rutina.</span>
      </section>

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

import type { Metadata } from "next";
import { ThemeSelector } from "@/components/theme-selector";
import { getGarminKeyStatus } from "@/lib/garmin/key";
import { createClient } from "@/lib/supabase/server";
import { getSyncOverview } from "@/lib/sync/overview";
import { GarminSection } from "./garmin-section";
import { HrSection } from "./hr-section";
import { PasswordForm } from "./password-form";
import { TagsSection } from "./tags-section";
import { hasTemporaryPassword } from "@/lib/account/password";
import { signOut } from "@/app/login/actions";
import { AI_READS_PER_MONTH, nextMonthStart } from "@/modules/routines/read-cap";
import { aiReadsThisMonth } from "@/modules/routines/read-count";

export const metadata: Metadata = { title: "Ajustes" };

export default async function AjustesPage() {
  const supabase = await createClient();
  const [{ data }, garminStatus, sync, { data: hr }, { data: tags }, aiReads] = await Promise.all([
    supabase.auth.getClaims(),
    getGarminKeyStatus(),
    getSyncOverview(),
    supabase.from("hr_settings").select("effective_from, max_hr, resting_hr, lthr, source").order("effective_from", { ascending: false }),
    supabase.from("checkin_tags").select("name").order("created_at"),
    // ADR-0006: the one paid call, counted so spending stays visible, and capped per person (R-USR-04).
    aiReadsThisMonth(),
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
          {aiReads.used} de {AI_READS_PER_MONTH} lecturas este mes
        </span>
        <div role="progressbar" aria-label="Lecturas usadas este mes" aria-valuemin={0} aria-valuemax={AI_READS_PER_MONTH} aria-valuenow={aiReads.used} className="my-1 h-1.5 overflow-hidden rounded-full bg-sunk">
          <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (aiReads.used / AI_READS_PER_MONTH) * 100)}%` }} />
        </div>
        <span className="text-[13px] leading-snug text-muted">
          Al llegar a {AI_READS_PER_MONTH}, las rutinas se escriben a mano hasta {nextMonthStart(aiReads.today)}. Cada lectura cuesta menos de 0,1 centavo de dólar y se hace solo cuando la pides.
        </span>
      </section>

      <section className="flex flex-col gap-3 rounded-3xl bg-card p-[18px]">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-[17px] font-extrabold">Cuenta</h2>
          <span className="truncate text-sm text-muted">{data?.claims?.email}</span>
        </div>
        {hasTemporaryPassword(data?.claims) ? (
          <p className="rounded-[14px] bg-warn-bg px-3.5 py-3 text-sm leading-snug font-semibold text-warn-text">Estás usando una contraseña temporal. Elige una tuya para terminar.</p>
        ) : null}
        <PasswordForm />
        <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
          <span className="text-[15px] font-bold">Sesión</span>
          <form action={signOut}>
            <button
              type="submit"
              className="h-11 shrink-0 rounded-full border border-line px-4 text-sm font-bold outline-primary focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

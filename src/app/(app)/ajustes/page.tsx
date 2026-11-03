import type { Metadata } from "next";
import { ThemeSelector } from "@/components/theme-selector";
import { getGarminKeyStatus } from "@/lib/garmin/key";
import { createClient } from "@/lib/supabase/server";
import { getSyncOverview } from "@/lib/sync/overview";
import { GarminSection } from "./garmin-section";
import { signOut } from "@/app/login/actions";

export const metadata: Metadata = { title: "Ajustes" };

export default async function AjustesPage() {
  const supabase = await createClient();
  const [{ data }, garminStatus, sync] = await Promise.all([supabase.auth.getClaims(), getGarminKeyStatus(), getSyncOverview()]);

  return (
    <div className="flex flex-col gap-3.5">
      <h1 className="text-[28px] font-extrabold">Ajustes</h1>

      <section className="flex flex-col gap-3 rounded-3xl bg-card p-[18px]">
        <h2 className="text-[17px] font-extrabold">Apariencia</h2>
        <ThemeSelector />
      </section>

      <GarminSection status={garminStatus} sync={sync} />

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

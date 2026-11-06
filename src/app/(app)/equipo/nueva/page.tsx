import type { Metadata } from "next";
import Link from "next/link";
import { shoeName, type RunType } from "@/modules/gear/catalog";
import type { ShoeModel } from "@/modules/gear/search";
import { createClient } from "@/lib/supabase/server";
import { ShoeForm } from "./shoe-form";

export const metadata: Metadata = { title: "Añadir zapatilla" };

export default async function NuevaZapatillaPage() {
  const supabase = await createClient();
  const [{ data: own }, { data: current }] = await Promise.all([
    supabase.from("shoe_models").select("id, brand, model, version, run_types").order("created_at"),
    supabase.from("shoes").select("brand, model, version").eq("is_default", true).maybeSingle(),
  ]);
  const ownModels: ShoeModel[] = (own ?? []).map((m) => ({
    key: `own:${m.id}`,
    brand: m.brand,
    model: m.model,
    version: m.version,
    runTypes: m.run_types as RunType[],
    note: null,
    image: null,
    own: true,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Link href="/equipo" aria-label="Volver a Equipo" className="flex size-11 items-center justify-center rounded-full bg-card">
          <svg viewBox="0 0 24 24" aria-hidden className="size-5 fill-none stroke-current" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 6l-6 6 6 6" />
          </svg>
        </Link>
        <h1 className="text-2xl font-extrabold">Añadir zapatilla</h1>
      </div>
      <ShoeForm ownModels={ownModels} currentDefault={current ? shoeName(current) : null} />
    </div>
  );
}

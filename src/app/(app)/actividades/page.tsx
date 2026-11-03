import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Actividades" };

export default function ActividadesPage() {
  return <ComingSoon title="Actividades" text="Tus actividades aparecerán aquí muy pronto." />;
}

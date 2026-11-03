import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Tendencias" };

export default function TendenciasPage() {
  return <ComingSoon title="Tendencias" text="Tus tendencias aparecerán aquí cuando haya datos de Garmin." />;
}

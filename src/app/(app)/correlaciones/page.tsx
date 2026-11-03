import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Correlaciones" };

export default function CorrelacionesPage() {
  return <ComingSoon title="Correlaciones" text="Tus patrones aparecerán aquí cuando haya suficientes días de datos." />;
}

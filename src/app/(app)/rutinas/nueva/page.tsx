import type { Metadata } from "next";
import { AI_READS_PER_MONTH, capMessage } from "@/modules/routines/read-cap";
import { aiReadsThisMonth } from "@/modules/routines/read-count";
import { BackHeader } from "../back-header";
import { RoutineForm } from "../routine-form";

export const metadata: Metadata = { title: "Nueva rutina" };

export default async function NuevaRutinaPage() {
  const { used, today } = await aiReadsThisMonth();
  return (
    <div className="flex flex-col gap-4">
      <BackHeader title="Nueva rutina" />
      <RoutineForm aiCapMessage={used >= AI_READS_PER_MONTH ? capMessage(today) : null} />
    </div>
  );
}

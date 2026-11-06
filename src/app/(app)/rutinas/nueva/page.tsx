import type { Metadata } from "next";
import { BackHeader } from "../back-header";
import { RoutineForm } from "../routine-form";

export const metadata: Metadata = { title: "Nueva rutina" };

export default function NuevaRutinaPage() {
  return (
    <div className="flex flex-col gap-4">
      <BackHeader title="Nueva rutina" />
      <RoutineForm />
    </div>
  );
}

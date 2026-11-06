"use client";

import { useTransition } from "react";
import { hideShoeWarning } from "@/app/(app)/equipo/actions";

export function HideWarningButton({ shoeId }: { shoeId: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(async () => void (await hideShoeWarning(shoeId)))}
      className="h-11 flex-1 rounded-[14px] border border-warn-btn text-sm font-bold disabled:opacity-60"
    >
      {pending ? "Ocultando…" : "Ocultar 7 días"}
    </button>
  );
}

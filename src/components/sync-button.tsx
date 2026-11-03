"use client";

import { useActionState } from "react";
import { syncNow, type SyncNowState } from "@/app/(app)/actions";

const initial: SyncNowState = {};

export function SyncButton() {
  const [state, action, pending] = useActionState(syncNow, initial);

  return (
    <form action={action} className="flex shrink-0 flex-col items-end gap-1">
      <button
        type="submit"
        disabled={pending}
        className="flex h-11 items-center gap-2 rounded-full bg-sunk px-3.5 text-[13px] font-bold outline-primary focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <svg viewBox="0 0 24 24" aria-hidden className={`size-4 fill-none stroke-current ${pending ? "animate-spin" : ""}`} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5" />
        </svg>
        {pending ? "Sincronizando" : "Sincronizar"}
      </button>
      {state.message ? (
        <p role="status" className="max-w-52 text-right text-xs font-semibold text-warn">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

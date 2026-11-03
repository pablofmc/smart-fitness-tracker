"use client";

import { SyncButton } from "./sync-button";

/** The date comes from the browser, because the server doesn't know the owner's time zone. */
export function TodayHeader({ syncLabel }: { syncLabel: string }) {
  const date = new Date().toLocaleDateString("es", { weekday: "long", day: "numeric", month: "short" }).replace(".", "").replace(",", "");

  return (
    <div className="flex items-center justify-between gap-3 rounded-[20px] bg-card py-3 pr-3.5 pl-[18px]">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span suppressHydrationWarning className="text-sm font-bold first-letter:uppercase">
          {date}
        </span>
        <span className="text-xs text-muted">{syncLabel}</span>
      </div>
      <SyncButton />
    </div>
  );
}
